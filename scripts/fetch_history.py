"""
DSE Historical Data Fetcher
----------------------------
Fetches per-symbol OHLCV history from DSE via bdshare and saves
to public/data/history/<SYMBOL>.json for consumption by Next.js.

Usage:
  python scripts/fetch_history.py                  # fetch all symbols
  python scripts/fetch_history.py SQURPHARMA GP    # fetch specific symbols

Requirements:
  pip install bdshare pandas

Schedule (Windows Task Scheduler or cron):
  Run daily after market close (~4pm BD time / 10am UTC)
"""

import sys
import json
import os
import re
import datetime
import traceback
import urllib.request

try:
    import pandas as pd
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        from bdshare import get_current_trading_code
        try:
            from bdshare import get_historical_data as _get_hist
        except ImportError:
            from bdshare import get_hist_data as _get_hist
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install bdshare pandas")
    sys.exit(1)

# Output directory — Next.js serves files from /public
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "history")
os.makedirs(OUT_DIR, exist_ok=True)

END_DATE = datetime.date.today()
START_DATE = END_DATE - datetime.timedelta(days=2 * 365)  # bdshare max is ~2 years


def fetch_symbol(symbol: str) -> bool:
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            df = _get_hist(str(START_DATE), str(END_DATE), symbol)
        if df is None or df.empty:
            print(f"  [{symbol}] No data returned")
            return False

        df = df.reset_index()
        df.columns = [c.lower() for c in df.columns]

        keep = ["date", "open", "high", "low", "close", "ltp", "volume", "trade", "value"]
        cols = [c for c in keep if c in df.columns]
        df = df[cols]

        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

        df = df.sort_values("date").drop_duplicates(subset=["date"])

        # Merge with existing data so history accumulates across daily runs
        out_path = os.path.join(OUT_DIR, f"{symbol.upper()}.json")
        existing_records = []
        if os.path.exists(out_path):
            try:
                with open(out_path, "r") as f:
                    existing = json.load(f)
                existing_records = existing.get("data", [])
            except Exception:
                pass

        if existing_records:
            existing_df = pd.DataFrame(existing_records)
            combined = pd.concat([existing_df, df], ignore_index=True)
            combined = combined.drop_duplicates(subset=["date"]).sort_values("date")
            records = combined.to_dict(orient="records")
            new_rows = len(records) - len(existing_records)
            print(f"  [{symbol}] Merged: {len(existing_records)} existing + {new_rows} new = {len(records)} total rows")
        else:
            records = df.to_dict(orient="records")
            print(f"  [{symbol}] Saved {len(records)} rows (new file)")

        with open(out_path, "w") as f:
            json.dump({"symbol": symbol.upper(), "updatedAt": str(END_DATE), "data": records}, f)

        return True

    except Exception as e:
        print(f"  [{symbol}] ERROR: {e}")
        traceback.print_exc()
        return False


DSE_SCROLL_URL = "https://www.dsebd.org/latest_share_price_scroll_l.php"
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}


def get_symbols_from_dse_scroll() -> list:
    """Scrape the DSE scroll page for all currently listed symbols (~413)."""
    try:
        req = urllib.request.Request(DSE_SCROLL_URL, headers=HTTP_HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read().decode("utf-8", errors="ignore")
        symbols = set()
        for m in re.finditer(r'name=([A-Za-z0-9._-]+)', html):
            s = m.group(1).upper()
            if re.match(r'^[A-Z][A-Z0-9._-]{1,14}$', s):
                symbols.add(s)
        result = sorted(symbols)
        print(f"DSE scroll page: {len(result)} symbols")
        return result
    except Exception as e:
        print(f"DSE scroll page failed: {e}")
        return []


def main():
    if len(sys.argv) > 1:
        symbols = [s.upper() for s in sys.argv[1:]]
        print(f"Fetching {len(symbols)} specified symbols...")
    else:
        print("Fetching all trading symbols from DSE...")
        symbol_set = set()

        # Source 1: bdshare (active trading symbols)
        try:
            codes_df = get_current_trading_code()
            bdshare_syms = set(codes_df["symbol"].str.upper().tolist())
            print(f"bdshare: {len(bdshare_syms)} active symbols")
            symbol_set.update(bdshare_syms)
        except Exception as e:
            print(f"bdshare failed: {e}")

        # Source 2: DSE scroll page (includes suspended/halted symbols)
        scroll_syms = set(get_symbols_from_dse_scroll())
        symbol_set.update(scroll_syms)

        if not symbol_set:
            print("Failed to get symbol list from any source")
            sys.exit(1)

        symbols = sorted(symbol_set)
        print(f"Total unique symbols to fetch: {len(symbols)}")
        extra = scroll_syms - (symbol_set - scroll_syms)
        print(f"  ({len(scroll_syms - (symbol_set - scroll_syms))} additional symbols from DSE scroll page)")

    ok, fail = 0, 0
    for sym in symbols:
        print(f"Fetching {sym}...")
        if fetch_symbol(sym):
            ok += 1
        else:
            fail += 1

    print(f"\nDone. Success: {ok}, Failed: {fail}")
    print(f"Data saved to: {os.path.abspath(OUT_DIR)}")


if __name__ == "__main__":
    main()
