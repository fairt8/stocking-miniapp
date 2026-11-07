# Stocking mini app

Static Telegram Mini App for **@StockingTradeBot**: rule-based stock signals (US, Europe, Asia-Pacific), charts, the Zerodha Varsity checklist, paper-trade PnL, scan schedule and backtest summary.

- `index.html`, `app.js`, `style.css`: the app (no build step).
- `data/`: JSON published automatically by the signal box after scans/PnL updates. This branch is force-pushed as a single commit on every publish, so history stays small.

Data is public to anyone with the link. **Not financial advice.** Signals are automated and educational; paper-trade PnL is hypothetical.
