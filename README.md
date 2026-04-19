# DSE Watch — Bangladesh Stock Tracker

A personal, auth-free Next.js app to track **Dhaka Stock Exchange (DSE)** share prices, charts, and price alerts.

- **Live prices** scraped from [dsebd.org](https://www.dsebd.org) via Next.js route handlers
- **Historical charts** with up to ~2 years of data fetched via `bdshare` Python library
- **Price alerts** with email notifications via Resend
- **In-app notifications** for alert triggers
- **Favorites and recent searches** stored in `localStorage` — no backend database, no login

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- `cheerio` for DSE HTML scraping
- `lucide-react` icons
- **Upstash Redis** for server-side alert/notification storage
- **Resend** for email notifications
- `bdshare` Python library for historical data fetching

## Getting started

### Prerequisites

1. **Upstash Redis** (free):
   - Go to [upstash.com](https://upstash.com) → create free Redis database
   - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Resend** (free):
   - Go to [resend.com](https://resend.com) → create free API key
   - Copy your API key

### Setup

```bash
npm install
```

Create `.env.local` in the project root:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Resend Email
RESEND_API_KEY=re_your_api_key
ALERT_EMAIL=your@email.com
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Project structure

```
src/
├── app/
│   ├── layout.tsx                 Root layout + navbar
│   ├── page.tsx                   Dashboard (favorites + alerts history)
│   ├── search/page.tsx            Search DSE symbols
│   ├── stock/[symbol]/page.tsx    Detail + historical chart
│   └── api/
│       ├── stocks/route.ts        GET /api/stocks?q=&symbols=
│       ├── stock/[symbol]/route.ts GET /api/stock/:symbol
│       ├── stock/[symbol]/history/route.ts GET historical data
│       ├── alerts/route.ts        GET/POST/DELETE price alerts
│       └── alerts/check/route.ts POST check alerts & send email
│       └── notifications/route.ts GET/POST/DELETE notifications
├── components/
│   ├── Navbar.tsx
│   ├── StockCard.tsx
│   ├── StockAutocomplete.tsx
│   └── TradingViewChart.tsx       Recharts area chart
├── lib/
│   ├── dse.ts                     DSE scraper
│   ├── storage.ts                 localStorage helpers
│   ├── redis.ts                   Upstash Redis client
│   ├── useAlerts.ts               Alert state hook
│   ├── useNotifications.ts       Notification state hook
│   └── types.ts
scripts/
└── fetch_history.py              Python script to fetch historical data
```

## Features

### Price Alerts

- Set target price alerts for any favorited stock
- Email notification when price hits or below target (via Resend)
- In-app notification when alert triggers
- Alert history on dashboard
- Alerts persist server-side (visible across devices)

### Notifications

- Bell icon with unread count badge
- Notification panel with all-time history
- Mark as read, delete individual, or clear all
- Created automatically when alerts fire

### Historical Data

- Up to ~2 years of historical OHLCV data
- Fetched via `bdshare` Python library
- Run `py scripts/fetch_history.py` to update historical data
- Data stored in `public/data/history/*.json`

## Data sources

| Data                             | Source                                      | How                       |
| -------------------------------- | ------------------------------------------- | ------------------------- |
| Stock list + LTP + OHLC + volume | `dsebd.org/latest_share_price_scroll_l.php` | Scraped on-demand         |
| Historical data                  | `bdshare` Python library                    | Fetched via Python script |
| Alerts & Notifications           | Upstash Redis                               | Server-side storage       |
| Email alerts                     | Resend API                                  | Sent when alert triggers  |

## Historical data fetching

To fetch/update historical data:

```bash
# Install Python dependencies
pip install bdshare pandas

# Fetch historical data for all symbols
py scripts/fetch_history.py

# Or fetch for specific symbols
py scripts/fetch_history.py SQURPHARMA ACI
```

Data is saved to `public/data/history/*.json` and accumulates over daily runs.

## Deployment

### Deploy to Vercel

1. **Add environment variables** in Vercel project settings:

   ```
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   RESEND_API_KEY
   ALERT_EMAIL
   ```

2. **Deploy via GitHub:**

   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push
   ```

   Then import repo in Vercel.

3. **Or via Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel
   ```

## Notes

- DSE sometimes rate-limits or changes its HTML structure. The scraper identifies the price table by row count + maps columns dynamically from header text, so it is resilient to reorderings.
- Historical data is limited to ~2 years by the `bdshare` library. Run the fetch script regularly to accumulate data over time.
- Alerts are checked every 24 hours automatically.
- User favorites and recent searches are stored in localStorage. Alerts and notifications are stored server-side in Upstash Redis.

## License

Personal use only. Data belongs to DSE and TradingView respectively.
