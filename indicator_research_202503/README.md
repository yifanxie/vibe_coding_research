# Indicator Research PoC

This folder contains a standalone proof-of-concept app and supporting research notes for evaluating indicator-chart integration paths before implementation in the main Macro & Tech Intelligent Dashboard.

## What is included

- `index.html`
  The main research app.
- `styles.css`
  Visual styling for the app.
- `app.js`
  Widget rendering, Alpha Vantage-backed native charting, indicator calculations, and evaluation-state logic.
- `server.mjs`
  Local static server plus Alpha Vantage proxy endpoints for the benchmark assets in this PoC.
- `lib/alpha-vantage.mjs`
  Shared helper for loading the API key and normalizing Alpha Vantage responses.
- `scripts/fetch-gold-history.mjs`
  Captures gold history and spot data into local research assets.
- `scripts/capture-benchmark-assets.mjs`
  Captures gold, BTC, the S&P 500 proxy, and the US 10Y yield into local research assets.
- `alpha-vantage.local.example.json`
  Example local config file for your Alpha Vantage API key.
- `evaluation_guide.md`
  A step-by-step guide for running the experiment and recording findings.
- `integration_notes.md`
  Notes on how the PoC maps back into the existing dashboard architecture.
- `research_findings_template.md`
  A reusable template for recording your conclusions from the experiment.

## What the app demonstrates

1. A TradingView Advanced Chart widget integration path for visual evaluation.
2. A dashboard-native benchmark chart path where the app owns chart state and extracted metric snapshots.
3. A side-by-side evaluation surface for deciding which path to prioritize.

## Alpha Vantage setup

1. Claim a free Alpha Vantage API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key).
2. Copy `alpha-vantage.local.example.json` to `alpha-vantage.local.json`.
3. Replace the placeholder value with your real key.

You can also set `ALPHAVANTAGE_API_KEY` in your shell instead of using the local JSON file.

## How to open it

Use the included local server so the browser can call the Alpha Vantage proxy without exposing your key.

Example:

```bash
cd /Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503
npm start
```

Then open:

- `http://127.0.0.1:4173/`

## Troubleshooting

- If the native chart shows `Unexpected token '<'` or says it received HTML instead of JSON, the page is probably being served without the local Node proxy.
- In that case, stop using `python3 -m http.server` or a plain file-open flow for this version of the app.
- Run `npm start` in `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503` and open `http://127.0.0.1:4173/` instead.

## Capture benchmark data locally

After your API key is configured:

```bash
cd /Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503
npm run capture:benchmarks
```

This writes captured assets into:

- `data/alpha-vantage-gold/daily.json`
- `data/alpha-vantage-gold/weekly.json`
- `data/alpha-vantage-gold/monthly.json`
- `data/alpha-vantage-gold/spot.json`
- `data/alpha-vantage-gold/summary.json`
- `data/alpha-vantage-btc/daily.json`
- `data/alpha-vantage-btc/weekly.json`
- `data/alpha-vantage-btc/monthly.json`
- `data/alpha-vantage-btc/spot.json`
- `data/alpha-vantage-btc/summary.json`
- `data/alpha-vantage-sp500/daily.json`
- `data/alpha-vantage-sp500/weekly.json`
- `data/alpha-vantage-sp500/monthly.json`
- `data/alpha-vantage-sp500/spot.json`
- `data/alpha-vantage-sp500/summary.json`
- `data/alpha-vantage-us10y/daily.json`
- `data/alpha-vantage-us10y/weekly.json`
- `data/alpha-vantage-us10y/monthly.json`
- `data/alpha-vantage-us10y/spot.json`
- `data/alpha-vantage-us10y/summary.json`

The capture script runs sequentially and skips files that already exist, which helps stay inside the Alpha Vantage free-tier rate limit during repeat evaluations.

## Default data behavior

- The native benchmark chart now reads from the local captured files in the relevant `data/alpha-vantage-*/` folder by default.
- If those files do not exist yet, the local server will try a one-time Alpha Vantage fetch and save the result locally.
- Clicking `Refresh snapshots` attempts to update from Alpha Vantage and then writes the fresh result back into the local cache.
- If Alpha Vantage is rate-limited during refresh, the app falls back to the existing local cache when available.

## Recommended evaluation flow

1. Open the `TradingView Widget PoC` tab and test symbol, interval, chart type, and studies.
2. Open the `Dashboard-Native PoC` tab and verify that Alpha Vantage benchmark values and derived indicators appear as dashboard-owned fields.
3. Open the `Evaluation` tab and record decisions on feasibility, fit, and next actions.
4. Summarize findings in `research_findings_template.md` or a sibling note.

## Important caveats

- The TradingView widget track is primarily for visual evaluation.
- The dashboard-native track now expects a real Alpha Vantage API key.
- The S&P 500 line uses `SPY` as a liquid proxy rather than the index itself so the PoC can stay on the free Alpha Vantage stock endpoints.
- Alpha Vantage returns different history depths by asset class, so very long windows may show the full available dataset rather than a true 30-year or 50-year span for every asset.
- For the smoothest free-tier workflow, seed the local files once and then rely on the local cache for most evaluations.
