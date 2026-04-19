"""
Probe get_historical_data() range and also check DSE website direct scrape.
"""
import datetime
import urllib.request, json, re

SYMBOL = "SQURPHARMA"
END = datetime.date.today()

# 1) Test new bdshare API
print("=== bdshare get_historical_data() ===")
try:
    from bdshare import get_historical_data
    for start in [datetime.date(2025,1,1), datetime.date(2020,1,1), datetime.date(2010,1,1)]:
        try:
            df = get_historical_data(str(start), str(END), SYMBOL)
            if df is None or df.empty:
                print(f"  start={start} -> NO DATA")
            else:
                df = df.reset_index()
                df.columns = [c.lower() for c in df.columns]
                earliest = df["date"].min() if "date" in df.columns else "?"
                print(f"  start={start} -> {len(df)} rows, earliest={earliest}")
        except Exception as e:
            print(f"  start={start} -> ERROR: {e}")
except ImportError:
    print("  get_historical_data not available")

# 2) Try DSE website direct API endpoints
print("\n=== DSE direct endpoints ===")
HEADERS = {"User-Agent": "Mozilla/5.0"}
urls = [
    f"https://www.dsebd.org/ajax_company_histprice.php?symbol={SYMBOL}&startDate=2010-01-01&endDate={END}",
    f"https://www.dsebd.org/displayCompanyHistData.php?symbol={SYMBOL}&startDate=2010-01-01&endDate={END}",
    f"https://dsebd.org/ajax_company_histprice.php?symbol={SYMBOL}&startDate=2010-01-01&endDate={END}",
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8", errors="ignore")
        dates = re.findall(r'\d{4}-\d{2}-\d{2}', body)
        print(f"  [{r.status}] {len(body)} bytes, {len(dates)} dates found, earliest={min(dates) if dates else 'none'}")
        print(f"    {url}")
        if len(body) < 500:
            print(f"    body: {body[:200]}")
    except Exception as e:
        print(f"  ERROR: {str(e)[:80]}")
        print(f"    {url}")
