# Benchmark Asset Coverage Notes

This note records how the current Alpha Vantage-backed PoC maps each research asset into a dashboard-friendly benchmark feed.

## Asset Mapping

- `gold`
  - Source: Alpha Vantage `GOLD_SILVER_HISTORY` and `GOLD_SILVER_SPOT`
  - Chart label: `Gold / USD`
  - Notes: strongest long-horizon commodity feed in this PoC

- `btc`
  - Source: Alpha Vantage `DIGITAL_CURRENCY_DAILY`, `DIGITAL_CURRENCY_WEEKLY`, `DIGITAL_CURRENCY_MONTHLY`, and `CURRENCY_EXCHANGE_RATE`
  - Chart label: `BTC / USD`
  - Notes: daily, weekly, and monthly history are available without the TradingView widget

- `sp500`
  - Source: Alpha Vantage `TIME_SERIES_DAILY`, `TIME_SERIES_WEEKLY`, `TIME_SERIES_MONTHLY`, and `GLOBAL_QUOTE`
  - Chart label: `S&P 500 proxy / SPY`
  - Notes: uses `SPY` as the PoC proxy for the S&P 500 because it is directly supported by the stock endpoints

- `us10y`
  - Source: Alpha Vantage `TREASURY_YIELD`
  - Chart label: `US 10Y Treasury Yield`
  - Notes: `spot.json` is derived from the latest daily yield point so the app can keep the same `history + spot` interface across assets

## Free-Tier Behavior

- Local cache folders are created per asset under `data/alpha-vantage-*`.
- The PoC reads local files first and only goes back to Alpha Vantage on explicit refresh or first seed.
- The benchmark capture script skips existing files by default to conserve free-tier requests.

## Horizon Caveats

- Gold and treasury history can cover longer spans than the equity proxy daily endpoint.
- The S&P 500 proxy uses weekly and monthly data for longer windows because the free stock daily endpoint is compact.
- Very long windows such as `30 years` and `50 years` may show the full available dataset when the provider does not return enough history for the selected asset.
