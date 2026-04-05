# Architecture Recommendations

## Summary

The app is visually strong and the core interaction is straightforward, but the current design is still closer to a prototype than a production-ready valuation platform. The biggest structural issue is that data sourcing, domain modeling, valuation logic, and presentation are only lightly separated.

## Modularization

### 1. Separate catalog, provider, and valuation responsibilities

Target structure:

- `catalog/`: ticker universe, search index, market metadata
- `providers/`: mock provider, live API provider, caching adapter
- `domain/`: stock entities, valuation inputs, normalization logic
- `valuation/`: DCF, multiples, rating, confidence scoring
- `presentation/`: React hooks and view models for the UI

Why:

- Today, the hook still owns orchestration and some implicit business decisions.
- A provider interface would let the app swap between deterministic demo data and live market data without rewriting the UI layer.

### 2. Break up `stockDatabase.ts`

Recommended split:

- `stockCatalog.us.ts`
- `stockCatalog.eu.ts`
- `stockCatalog.uk.ts`
- `stockCatalog.cn.ts`
- `stockCatalog.hk.ts`
- `stockSearch.ts`
- `marketMetadata.ts`

Why:

- The current file is large, hard to review, and mixes data with behavior.
- Smaller files improve maintainability and make content updates less risky.

### 3. Add a typed analysis assembly layer

Introduce a service such as `buildStockAnalysis(inputProvider, ticker)`.

Why:

- It provides one stable place to normalize provider data into UI-ready analysis objects.
- It avoids pushing data-shaping logic into hooks or components.

## Code Quality

### 1. Add testable pure functions

The project already has several candidates:

- search ranking
- sector peer lookup
- seeded data generation
- DCF and multiples calculations
- rating classification

Keep these pure and independent from React so they are easy to unit test.

### 2. Validate incoming data at boundaries

If a live API is added, use runtime validation with `zod` before data reaches valuation code.

Why:

- Valuation logic is sensitive to missing or inconsistent fields.
- Validation failures should be explicit instead of producing silent bad outputs.

### 3. Introduce result metadata

Add fields such as:

- `dataSource`
- `generatedAt`
- `currency`
- `isMock`
- `confidence`
- `warnings`

Why:

- Users should know whether they are looking at modeled data or live data.
- The UI can explain low-confidence or partial analyses instead of showing a clean number with no caveats.

### 4. Reduce render-time randomness in the UI

The hero still uses `Math.random()` during rendering for particle positions and animation deltas.

Why:

- It can make rendering nondeterministic and complicate visual regression testing.
- Generated positions should be memoized or seeded once per mount.

## Architecture

### 1. Introduce a provider contract

Example responsibilities:

- `searchStocks(query)`
- `getStockProfile(ticker)`
- `getFinancialStatements(ticker)`
- `getAnalystConsensus(ticker)`
- `getHistoricalPrices(ticker)`

Then implement:

- `MockStockProvider`
- `LiveMarketDataProvider`

Why:

- This is the cleanest path from demo app to real application.
- It keeps valuation logic independent of where data came from.

### 2. Use a query/cache layer

Recommended direction:

- React Query or a small custom cache for provider responses and search results

Why:

- It gives loading, stale, error, and retry states without custom plumbing.
- It becomes important once network requests replace local generation.

### 3. Create explicit valuation input and output models

Current logic infers pieces such as shares outstanding from market cap and price. That is acceptable for a demo, but a production version should define explicit input contracts:

- `ValuationInputs`
- `ComparableMultiplesInputs`
- `DiscountRateAssumptions`
- `ValuationResult`

Why:

- It makes assumptions reviewable.
- It helps compare one model version against another.

### 4. Add versioned model assumptions

Create a config object or versioned model package for:

- sector average multiples
- DCF horizon
- growth caps
- discount-rate policy
- rating thresholds

Why:

- Financial models change over time.
- Versioning assumptions makes it easier to audit valuation changes.

## Near-Term Roadmap

1. Install a test stack and add unit coverage for search, seeded generation, and fair value math.
2. Move stock catalog data into split files and isolate search logic.
3. Introduce a provider interface with the current deterministic mock provider as the first implementation.
4. Add analysis metadata to the UI so users can see whether a result is mock or live.
5. Replace hard-coded sector averages with configurable assumptions.
