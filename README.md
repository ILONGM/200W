# 200W Moving Average Chart

Next.js app that fetches market data and overlays a 200-week moving average using TradingView's `lightweight-charts`.

## Features

- Interactive chart with zoom/pan
- Price series in line or candlesticks
- 200-week SMA overlay with toggle
- Stooq data source (no API key) + Alpha Vantage weekly fallback
- Tooltip (date, close, MA200W)

## Getting started

```bash
pnpm i
pnpm dev
```

Open `http://localhost:3000`.

## Environment variables

Optional Alpha Vantage fallback if Stooq has no data:

```
ALPHAVANTAGE_API_KEY=your_key_here
```

Put this in `.env.local`.

## Scripts

- `pnpm dev` - run dev server
- `pnpm build` - production build
- `pnpm start` - start production server
- `pnpm lint` - lint
- `pnpm test` - run unit tests

## Notes

- Weekly data is fetched from Stooq when available; otherwise daily data is resampled into ISO weeks using the last close of each week.
- The 200-week SMA appears only once 200 weekly points are available.
- Stooq uses market suffixes (e.g. `AAPL.US`, `AIR.FR`). Use the market dropdown to pick the suffix.
- If Stooq returns no data, the API falls back to Yahoo Finance weekly data (e.g. France tickers use `.PA`, like `TTE.PA`).
- Alpha Vantage is rate-limited on free tier.
