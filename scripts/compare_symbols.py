"""
Compare DSE company listing (full universe) vs history folder files.
Scrapes https://www.dsebd.org/company_listingg.php for all listed symbols.
"""

import os
import re
import urllib.request

HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "history")
DSE_SCROLL_URL = "https://www.dsebd.org/latest_share_price_scroll_l.php"

def get_dse_symbols():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
    }

    # Primary: scrape the scroll page (413 symbols, most complete publicly available)
    try:
        req = urllib.request.Request(DSE_SCROLL_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read().decode("utf-8", errors="ignore")
        symbols = set()
        for m in re.finditer(r'name=([A-Za-z0-9._-]+)', html):
            s = m.group(1).upper()
            if re.match(r'^[A-Z][A-Z0-9._-]{1,14}$', s):
                symbols.add(s)
        if len(symbols) > 100:
            print(f"  (via DSE scroll page: {len(symbols)} symbols)")
            return symbols
        print(f"  DSE scroll page returned too few symbols ({len(symbols)}), falling back to bdshare...")
    except Exception as e:
        print(f"  DSE scroll page failed: {e}, falling back to bdshare...")

    # Fallback: bdshare (only actively traded symbols)
    try:
        from bdshare import get_current_trading_code
        codes_df = get_current_trading_code()
        symbols = set(codes_df["symbol"].str.upper().tolist())
        print(f"  (via bdshare fallback: {len(symbols)} symbols — active trading only)")
        return symbols
    except Exception as e:
        raise RuntimeError(f"All sources failed. Last error: {e}")

def get_history_symbols():
    files = os.listdir(HISTORY_DIR)
    return {f.replace(".json", "").upper() for f in files if f.endswith(".json")}

def main():
    print("Fetching DSE company listing...")
    dse_symbols = get_dse_symbols()
    print(f"DSE listed symbols : {len(dse_symbols)}")

    history_symbols = get_history_symbols()
    print(f"History folder files: {len(history_symbols)}")

    missing = sorted(dse_symbols - history_symbols)
    extra = sorted(history_symbols - dse_symbols)

    print(f"\n=== MISSING from history ({len(missing)}) ===")
    for s in missing:
        print(f"  {s}")

    print(f"\n=== In history but NOT on DSE listing ({len(extra)}) ===")
    for s in extra:
        print(f"  {s}")

    print(f"\nSummary: {len(missing)} missing, {len(extra)} extra")

if __name__ == "__main__":
    main()
