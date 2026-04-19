"""
Test yfinance and investpy for DSE long-term history.
"""
import datetime

END = datetime.date.today()

# 1) yfinance
print("=== yfinance ===")
try:
    import yfinance as yf
    ticker = yf.Ticker("SQURPHARMA.BD")
    df = ticker.history(period="max")
    if df.empty:
        print("  No data returned for SQURPHARMA.BD")
    else:
        print(f"  {len(df)} rows, earliest={df.index.min().date()}, latest={df.index.max().date()}")
    # also try alternate ticker format
    ticker2 = yf.Ticker("SQPH.BD")
    df2 = ticker2.history(period="max")
    if df2.empty:
        print("  No data returned for SQPH.BD")
    else:
        print(f"  SQPH.BD: {len(df2)} rows, earliest={df2.index.min().date()}")
except ImportError:
    print("  yfinance not installed. Run: pip install yfinance")
except Exception as e:
    print(f"  Error: {e}")

# 2) investpy
print("\n=== investpy ===")
try:
    import investpy
    df = investpy.get_stock_historical_data(
        stock="SQPH",
        country="bangladesh",
        from_date="01/01/2000",
        to_date=END.strftime("%d/%m/%Y"),
    )
    print(f"  {len(df)} rows, earliest={df.index.min().date()}, latest={df.index.max().date()}")
except ImportError:
    print("  investpy not installed. Run: pip install investpy")
except Exception as e:
    print(f"  Error: {e}")
