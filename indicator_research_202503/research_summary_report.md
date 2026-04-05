# Indicator Research Summary Report

Date: 2026-03-30
Folder: `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503`

## Purpose

This folder is a standalone proof of concept for evaluating two chart-integration paths before implementing indicator detail views in the main dashboard:

1. TradingView embedded chart
2. Dashboard-native chart with app-owned values and local data seeding

The report below documents the current technical dependencies, how each chart path is generated, and the exact seeding flow for the native chart.

## 1. Technical Dependency of the Code

### 1.1 Local code structure

The PoC is built from a small set of local files:

- `index.html`
  Defines the UI shell, tabs, controls, and chart containers.
- `styles.css`
  Provides all visual styling.
- `app.js`
  Runs the client-side experience:
  - TradingView widget config and render flow
  - native chart fetch flow
  - indicator calculations
  - SVG chart rendering
  - evaluation notes stored in `localStorage`
- `server.mjs`
  Runs a local static server and Alpha Vantage proxy/cache layer.
- `lib/alpha-vantage.mjs`
  Contains asset catalog, API-key loading, Alpha Vantage fetch logic, and payload normalization.
- `scripts/capture-benchmark-assets.mjs`
  Seeds benchmark history and spot data into local cache files.
- `scripts/fetch-gold-history.mjs`
  Seeds the gold-only dataset.

### 1.2 Runtime and platform dependencies

The code depends on:

- Node.js
  Required to run `server.mjs` and the capture scripts.
- Native Node modules only
  This PoC uses built-in modules such as `http`, `fs`, `fs/promises`, `path`, and `url`.
- Browser runtime
  Required for the UI, DOM manipulation, `fetch`, SVG rendering, and `localStorage`.
- Built-in `fetch`
  Used both in the browser and in Node. This means the PoC expects a modern Node runtime where `fetch` is available.

### 1.3 Package dependencies

This folder intentionally has no external npm dependencies beyond Node itself.

Its `package.json` only defines scripts:

- `npm start`
- `npm run capture:gold`
- `npm run capture:benchmarks`

That means:

- there is no native charting library dependency
- there is no React dependency
- there is no server framework dependency
- there is no Alpha Vantage SDK dependency

### 1.4 External service dependencies

There are two important external service dependencies:

- TradingView hosted embed script
  - URL: `https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js`
  - Used only by the TradingView widget tab
  - Requires browser network access
- Alpha Vantage API
  - Used by the native chart data flow
  - Requires an API key via `ALPHAVANTAGE_API_KEY` or `alpha-vantage.local.json`
  - Used for:
    - gold history and spot
    - BTC history and spot
    - SPY history and spot
    - US 10Y history and derived spot

### 1.5 Data dependencies

The native chart depends on local cached JSON files under `data/`:

- `data/alpha-vantage-gold/`
- `data/alpha-vantage-btc/`
- `data/alpha-vantage-sp500/`
- `data/alpha-vantage-us10y/`

Each asset directory uses the same five-file shape:

- `daily.json`
- `weekly.json`
- `monthly.json`
- `spot.json`
- `summary.json`

At the time of this report, the folder already contains 20 cached data files, which means all 4 benchmark assets have already been seeded locally.

### 1.6 Functional dependencies inside the code

The native chart path depends on several internal behaviors:

- asset catalog configuration
  - defined in `lib/alpha-vantage.mjs`
  - controls symbol metadata, labels, units, and cache directory names
- interval selection rules
  - daily for shorter windows
  - weekly for medium windows
  - monthly for long windows
- indicator calculations in `app.js`
  - SMA 20
  - EMA 20
  - RSI 14
- SVG chart generation in `app.js`
  - line and area rendering are built manually
  - no third-party chart library is used

### 1.7 Important implementation constraints

- The native chart is app-owned, but it currently supports only one active primary series.
- A compare-overlay shape exists in the code, but the compare selector is currently disabled in the UI.
- Refresh behavior is routed through the local Node server rather than hitting Alpha Vantage directly from the browser.
- The server prefers local cache, then fetches Alpha Vantage only when needed or when forced.
- The US 10Y spot value is derived from daily history rather than fetched from a separate spot endpoint.

## 2. How to Generate the TradingView Chart

### 2.1 Preconditions

You need:

- the local app running via `npm start`
- browser access to the TradingView hosted embed script

You do not need:

- an Alpha Vantage key
- any local seeded benchmark data

### 2.2 Start the app

From the PoC folder:

```bash
cd /Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503
npm start
```

Then open:

```text
http://127.0.0.1:4173/
```

### 2.3 Generate the chart in the UI

1. Open the `TradingView Widget PoC` tab.
2. Set the widget controls:
   - symbol
   - interval
   - chart type
   - theme
   - studies preset
   - allow-symbol-change
3. Click `Render widget`.

### 2.4 What the code does

When `Render widget` is clicked, `renderTradingViewWidget()` in `app.js`:

1. Reads the current values from the widget controls.
2. Builds a TradingView widget config object.
3. Writes that config into the config preview pane.
4. Clears the widget root container.
5. Creates a wrapper element and target element.
6. Injects a `<script>` tag whose source is:

```text
https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js
```

7. Passes the chart config as the script body text.

### 2.5 Current TradingView config shape

The current widget config includes:

- `symbol`
- `interval`
- `theme`
- `style`
- `studies`
- `allow_symbol_change`
- `withdateranges`
- `favorites.intervals`
- `timezone`
- `locale`
- `support_host`

### 2.6 Study presets currently supported

The UI maps study presets to the following TradingView study arrays:

- `none`
  - no studies
- `trend`
  - two EMA studies
- `momentum`
  - RSI and MACD
- `volatility`
  - Bollinger Bands

### 2.7 Current chart type mapping

The chart-type selector uses TradingView numeric style codes:

- `1` = candles
- `2` = bars
- `3` = line
- `4` = area

### 2.8 Failure mode to watch for

If the TradingView chart does not load:

- verify browser access to TradingView script hosts
- verify you are serving the page through the local server
- check the config preview in the UI

## 3. How to Generate the Native Chart

### 3.1 Preconditions

You need one of the following:

- local seeded benchmark files already present in `data/`
- or a valid Alpha Vantage API key so the server can seed missing files on demand

### 3.2 Start the app

Run:

```bash
cd /Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503
npm start
```

Open:

```text
http://127.0.0.1:4173/
```

### 3.3 Generate the chart in the UI

1. Open the `Dashboard-Native PoC` tab.
2. Select the primary asset.
3. Select the time window.
4. Select the chart style:
   - line
   - area
5. Toggle indicators:
   - SMA 20
   - EMA 20
   - RSI 14
6. Click `Refresh snapshots` if you want to force a fresh fetch through the local proxy.

### 3.4 What the code does

The native chart flow starts in `renderNativeExperiment()` in `app.js`.

That function:

1. Resolves the current asset from the instrument catalog.
2. Calls `getAssetDataset(assetId, windowDays, forceRefresh)`.
3. Chooses the history interval based on the selected window:
   - shorter window -> daily
   - medium window -> weekly
   - long window -> monthly
4. Fetches:
   - `/api/alpha-vantage/:assetId/history?...`
   - `/api/alpha-vantage/:assetId/spot?...`
5. Trims the returned history to the point limit for the selected window.
6. Computes snapshot values:
   - latest spot
   - latest historical close
   - change vs previous point
   - optional SMA 20
   - optional EMA 20
   - optional RSI 14
7. Renders metric cards.
8. Calls `renderNativeChart(...)`.
9. Builds an SVG chart directly in the DOM.
10. Writes the derived snapshot JSON preview into the UI.

### 3.5 How the native chart is rendered

The chart is not produced by a chart library.

Instead, `renderNativeChart()`:

1. Converts history points into a numeric value series.
2. Optionally normalizes values if compare mode is active in the future.
3. Builds:
   - main line path
   - optional area fill path
   - overlay paths for SMA and EMA
4. Calculates chart bounds:
   - min
   - max
   - range
5. Renders a raw SVG with:
   - axis labels
   - baseline and grid lines
   - primary series path
   - overlay paths
   - legend
   - start/mid/end date labels

### 3.6 Indicator derivation in the native path

The native chart currently derives:

- SMA 20
  - from `computeSmaSeries()`
- EMA 20
  - from `computeEmaSeries()`
- RSI 14
  - from `computeLatestRsi()`

These values are calculated from the downloaded historical close series, not returned directly by Alpha Vantage.

### 3.7 Current data-source behavior

The browser does not call Alpha Vantage directly.

It calls the local Node server:

- `/api/alpha-vantage/:assetId/history`
- `/api/alpha-vantage/:assetId/spot`

The server behavior is:

1. return local cache if present and refresh is not forced
2. otherwise fetch Alpha Vantage
3. write the payload back into local files
4. return the payload to the browser
5. if Alpha Vantage fails but local cache exists, fall back to cache with a warning

### 3.8 Current benchmark coverage

The native chart path supports these benchmark assets:

- Gold
- BTC / USD
- S&P 500 proxy via SPY
- US 10Y Treasury Yield

## 4. Detailed Information on Steps of Seeding the Native Chart

This section documents the full seeding flow, from empty cache to usable native-chart data.

### 4.1 Step 1: Prepare the API key

You need Alpha Vantage credentials before first-time seeding from the network.

Option A: local config file

1. Copy:

```text
alpha-vantage.local.example.json
```

to:

```text
alpha-vantage.local.json
```

2. Replace the placeholder with your real API key.

Option B: environment variable

```bash
export ALPHAVANTAGE_API_KEY=your_key_here
```

### 4.2 Step 2: Decide the seeding path

There are two supported seeding paths.

#### Path A: explicit benchmark capture script

This is the recommended seeding path because it is deterministic and fills all benchmark assets up front.

Run:

```bash
cd /Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503
npm run capture:benchmarks
```

This script:

1. Iterates through every asset in `assetCatalog`.
2. Ensures the output directory exists.
3. Loads or fetches:
   - `daily.json`
   - `weekly.json`
   - `monthly.json`
4. Loads or fetches `spot.json`
5. Writes `summary.json`
6. Waits `1500ms` between live requests to reduce free-tier rate-limit pressure.
7. Skips files that already exist unless `--refresh` is supplied.

#### Path B: lazy seeding through the local server

If the cache files do not exist yet, the local server can seed them on first access.

This happens when the browser requests:

- `/api/alpha-vantage/:assetId/history?...`
- `/api/alpha-vantage/:assetId/spot?...`

and the corresponding local JSON file is missing.

This path is convenient, but less controlled than the capture script.

### 4.3 Step 3: Understand exactly what gets seeded

For each asset, seeding produces five files.

For example, for gold:

```text
data/alpha-vantage-gold/daily.json
data/alpha-vantage-gold/weekly.json
data/alpha-vantage-gold/monthly.json
data/alpha-vantage-gold/spot.json
data/alpha-vantage-gold/summary.json
```

The same pattern exists for:

- BTC
- SP500 proxy
- US10Y

That means a full benchmark seed writes:

- 4 assets
- 5 files each
- 20 files total

### 4.4 Step 4: Know the per-asset fetch behavior

The fetch logic differs slightly by asset:

- Gold history
  - `GOLD_SILVER_HISTORY`
- Gold spot
  - `GOLD_SILVER_SPOT`
- BTC history
  - `DIGITAL_CURRENCY_DAILY`
  - `DIGITAL_CURRENCY_WEEKLY`
  - `DIGITAL_CURRENCY_MONTHLY`
- BTC spot
  - `CURRENCY_EXCHANGE_RATE`
- SP500 proxy history
  - `TIME_SERIES_DAILY`
  - `TIME_SERIES_WEEKLY`
  - `TIME_SERIES_MONTHLY`
  - symbol is `SPY`
- SP500 proxy spot
  - `GLOBAL_QUOTE`
- US10Y history
  - `TREASURY_YIELD`
- US10Y spot
  - derived from the most recent daily history point

### 4.5 Step 5: Verify the seed output

After seeding, verify that:

1. all expected files exist under `data/`
2. each history file has a `series` array
3. `spot.json` has:
   - `price`
   - `timestamp`
   - `source`
4. `summary.json` has:
   - `updatedAt` or `capturedAt`
   - file summaries
   - point counts
   - first and last dates

Useful command:

```bash
find ./data -maxdepth 2 -type f | sort
```

### 4.6 Step 6: Start the local server after seeding

Once files are seeded:

```bash
npm start
```

Now the browser-native chart path will read from local files by default.

That gives you:

- faster reloads
- lower Alpha Vantage usage
- more stable evaluation behavior

### 4.7 Step 7: Generate the native chart from the seeded data

After the server is running:

1. open `http://127.0.0.1:4173/`
2. go to `Dashboard-Native PoC`
3. choose an asset and time window
4. confirm the chart renders immediately from local cache
5. inspect the metric cards and JSON snapshot preview

At this point, the native chart is working from seeded local data rather than depending on a live Alpha Vantage call for every page load.

### 4.8 Step 8: Refresh seeded data when needed

You can refresh in three ways.

#### Option A: full reseed

```bash
npm run capture:benchmarks -- --refresh
```

#### Option B: app-driven refresh

Use the `Refresh snapshots` button in the native chart tab.

This forces the browser to call the local proxy with `refresh=1`, which:

- fetches fresh Alpha Vantage data
- overwrites local cache
- updates `summary.json`

#### Option C: one-off asset refresh through the API

You can manually call:

```text
/api/alpha-vantage/:assetId/history?interval=daily&refresh=1
/api/alpha-vantage/:assetId/spot?refresh=1
```

### 4.9 Step 9: Expected fallback behavior

If Alpha Vantage is temporarily unavailable during refresh:

- the server tries to return local cached files
- the response marks the source mode as fallback
- a warning message is propagated back to the app

This fallback behavior is important because it lets the native chart remain usable even when the provider rate-limits or errors.

## 5. Practical Recommendation

Based on the current PoC design:

- use the TradingView path when you want fast visual evaluation
- use the native chart path when you want dashboard-owned values, derived indicators, and future persistence control

For future production integration, the native-chart path is the stronger architecture track because:

- it owns the data model
- it owns the derived metrics
- it owns refresh behavior
- it can later persist explicit snapshot fields into the main dashboard

The TradingView path is still useful as a visual benchmark and rapid comparison surface, but it should be treated as an embed track rather than the main structured-data track.

## 6. Key Files to Review

- `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503/package.json`
- `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503/server.mjs`
- `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503/lib/alpha-vantage.mjs`
- `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503/app.js`
- `/Users/yifanxie/playground/vibe_writing_experiments/research/indicator_research_202503/README.md`
