"""
Probe various DSE URLs to find which ones return the full company listing.
"""

import urllib.request
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

URLS = [
    "https://www.dsebd.org/company_listingg.php",
    "https://www.dsebd.org/latest_share_price_all.php",
    "https://www.dsebd.org/latest_share_price_scroll_l.php",
    "https://www.dsebd.org/dseX_share_price.php",
    "https://www.dsebd.org/dseBl_share_price.php",
    "https://www.dsebd.org/dseS_share_price.php",
    "https://dsebd.org/company_listingg.php",
]

def count_symbols(html):
    symbols = set()
    for m in re.finditer(r'name=([A-Za-z0-9._-]+)', html):
        s = m.group(1).upper()
        if re.match(r'^[A-Z][A-Z0-9._-]{1,14}$', s):
            symbols.add(s)
    return symbols

for url in URLS:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            status = r.status
            html = r.read().decode("utf-8", errors="ignore")
        syms = count_symbols(html)
        print(f"[{status}] {len(html):>8} bytes  {len(syms):>4} symbols  {url}")
    except Exception as e:
        print(f"[ERR] {str(e)[:60]:<60}  {url}")
