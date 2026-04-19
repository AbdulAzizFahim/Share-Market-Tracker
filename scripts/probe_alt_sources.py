"""
Probe alternative sources for longer DSE historical data.
"""
import urllib.request, re, datetime

SYMBOL = "SQURPHARMA"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/html, */*",
}

def probe(label, url, extra_headers=None):
    h = {**HEADERS, **(extra_headers or {})}
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8", errors="ignore")
        dates = re.findall(r'\b(19|20)\d{2}-\d{2}-\d{2}\b', body)
        earliest = min(dates) if dates else "none"
        print(f"  [OK {r.status}] {len(body):>8} bytes  {len(dates):>5} dates  earliest={earliest}")
        print(f"           {label}")
        if len(body) < 300:
            print(f"           body: {body[:200]}")
    except Exception as e:
        print(f"  [ERR] {str(e)[:70]}")
        print(f"        {label}")

end = datetime.date.today()
start = "2000-01-01"

print("=== Yahoo Finance ===")
# Yahoo Finance v8 API
probe("Yahoo v8 chart",
    f"https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}.BD?interval=1d&range=max")
probe("Yahoo v8 chart (v2)",
    f"https://query2.finance.yahoo.com/v8/finance/chart/{SYMBOL}.BD?interval=1d&range=max")

print("\n=== Stooq ===")
probe("Stooq",
    f"https://stooq.com/q/d/l/?s={SYMBOL.lower()}.bd&d1=20000101&d2={end.strftime('%Y%m%d')}&i=d")

print("\n=== investing.com (Dhaka) ===")
probe("investing.com search",
    f"https://api.investing.com/api/search/v2/search?q={SYMBOL}&domain=en",
    {"X-requested-with": "XMLHttpRequest"})

print("\n=== Alpha Vantage (needs key but check format) ===")
print("  Requires API key — skip")

print("\n=== Marketstack ===")
print("  Requires API key — skip")
