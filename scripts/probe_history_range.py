"""
Probe how far back bdshare can actually fetch data for a symbol.
"""
import datetime
from bdshare import get_hist_data

SYMBOL = "SQURPHARMA"
END = datetime.date.today()

test_starts = [
    datetime.date(2026, 1, 1),
    datetime.date(2025, 1, 1),
    datetime.date(2024, 1, 1),
    datetime.date(2023, 1, 1),
    datetime.date(2022, 1, 1),
    datetime.date(2021, 1, 1),
    datetime.date(2020, 1, 1),
    datetime.date(2015, 1, 1),
    datetime.date(2010, 1, 1),
]

for start in test_starts:
    try:
        df = get_hist_data(str(start), str(END), SYMBOL)
        if df is None or df.empty:
            print(f"  start={start}  -> NO DATA")
        else:
            df = df.reset_index()
            df.columns = [c.lower() for c in df.columns]
            earliest = df["date"].min() if "date" in df.columns else "?"
            print(f"  start={start}  -> {len(df)} rows, earliest={earliest}")
    except Exception as e:
        print(f"  start={start}  -> ERROR: {e}")
