"""
Probe investing.com for DSE historical data via their internal API.
"""
import urllib.request, json, re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/html, */*",
    "X-requested-with": "XMLHttpRequest",
    "Referer": "https://www.investing.com/",
}

def get(url, extra=None):
    h = {**HEADERS, **(extra or {})}
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read().decode("utf-8", errors="ignore"), r.status

# Step 1: get the pair_id for SQPH on DSE (id=988918 from previous probe)
PAIR_ID = 988918

print("=== Trying investing.com historical data endpoints ===")

urls = [
    f"https://api.investing.com/api/financialdata/{PAIR_ID}/historical/chart/?period=MAX&interval=P1D&pointscount=2400",
    f"https://www.investing.com/instruments/HistoricalDataAjax",
    f"https://api.investing.com/api/financialdata/historical/{PAIR_ID}?period=MAX&interval=P1D",
]

for url in urls:
    try:
        body, status = get(url)
        dates = re.findall(r'\b(19|20)\d{2}-\d{2}-\d{2}\b', body)
        # also check unix timestamps
        ts = re.findall(r'"t(?:ime)?"\s*:\s*(\d{10})', body)
        print(f"  [{status}] {len(body):>8} bytes  dates={len(dates)}  timestamps={len(ts)}")
        if dates:
            print(f"    earliest date: {min(dates)}, latest: {max(dates)}")
        if ts:
            import datetime
            earliest_ts = datetime.datetime.fromtimestamp(int(min(ts)))
            print(f"    earliest ts: {earliest_ts.date()}")
        if len(body) < 500:
            print(f"    body: {body[:300]}")
        print(f"    {url}")
    except Exception as e:
        print(f"  [ERR] {str(e)[:80]}")
        print(f"    {url}")

# Step 2: try the page directly for clues
print("\n=== Fetching company page for data clues ===")
try:
    body, status = get("https://www.investing.com/equities/square-pharmaceuticals-ltd-historical-data")
    dates = re.findall(r'\b(19|20)\d{2}-\d{2}-\d{2}\b', body)
    pair = re.search(r'data-pair-id=["\'](\d+)["\']', body)
    print(f"  [{status}] {len(body)} bytes, {len(dates)} dates, pair_id={pair.group(1) if pair else 'not found'}")
    if dates:
        print(f"  earliest={min(dates)}, latest={max(dates)}")
except Exception as e:
    print(f"  ERR: {e}")
