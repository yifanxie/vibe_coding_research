# Automated Testing Plan

## Current State

The repository does not currently have an automated test runner configured in `package.json`. The app can be built and linted, but valuation behavior, search ranking, and UI flows are not protected by automated tests yet.

## Recommended Test Stack

- Unit and integration: Vitest + React Testing Library
- End-to-end: Playwright
- Optional visual regression: Playwright screenshots

## Test Strategy

### Unit tests

Focus on pure functions and deterministic behavior:

- seeded random helpers
- stock search ranking
- peer lookup
- mock analysis generation
- fair value calculations
- rating classification

### Integration tests

Focus on app wiring:

- search box to hook to dashboard flow
- error handling for unknown tickers
- suggestion selection behavior
- stable results for repeated searches

### End-to-end tests

Focus on user-visible behavior in the browser:

- search and analyze a valid ticker
- repeated analysis of the same ticker yields the same fair value
- invalid ticker shows a helpful error
- dashboard renders key cards and charts

## Test Data Rules

- Use fixed ticker fixtures such as `AAPL`, `MSFT`, `JPM`, `SHEL`, and `0700.HK`.
- Treat the deterministic mock generator as a stable fixture provider.
- Avoid snapshotting the entire page DOM. Assert on important business outputs instead.

## Core Test Cases

| ID | Layer | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| UT-01 | Unit | Seeded RNG is stable | Create two RNGs with the same seed and generate a sequence | Both sequences match exactly |
| UT-02 | Unit | Seeded RNG differs by seed | Generate sequences for `AAPL:price` and `MSFT:price` | Sequences differ |
| UT-03 | Unit | Search exact ticker wins | Search `AAPL` | First result ticker is `AAPL` |
| UT-04 | Unit | Search keyword match works | Search `iphone` | `AAPL` is returned |
| UT-05 | Unit | Peer lookup excludes self | Request peers for `AAPL` | No result has ticker `AAPL` |
| UT-06 | Unit | Mock stock info is stable | Generate stock info for the same ticker twice | All fields match |
| UT-07 | Unit | Mock stock info is internally consistent | Generate stock info and compute `marketCap / currentPrice` | Derived share count is positive and finite |
| UT-08 | Unit | Financials are coherent | Generate financials for a ticker | Revenue, net income, assets, liabilities, and equity are all positive and ordered sensibly |
| UT-09 | Unit | DCF guards invalid discount assumptions | Call `calculateDCF` with `discountRate <= terminalGrowthRate` | Returns `0` |
| UT-10 | Unit | Fair value handles missing methods | Provide inputs where one method returns zero | Weighted average still uses valid methods only |
| UT-11 | Unit | Rating thresholds are correct | Feed upside values around threshold boundaries | Rating changes at expected cutoffs |
| IT-01 | Integration | Valid ticker fetch populates analysis | Render app and search `AAPL` | Dashboard appears with ticker header and fair value card |
| IT-02 | Integration | Repeated search is stable | Search `AAPL`, record fair value, search `AAPL` again | Same fair value is shown both times |
| IT-03 | Integration | Different tickers produce different analyses | Search `AAPL`, then `MSFT` | Key metrics differ |
| IT-04 | Integration | Unknown ticker shows error | Search invalid ticker such as `NOTREAL` | Error toast or error state is visible |
| IT-05 | Integration | Suggestion keyboard navigation works | Type `app`, press arrow keys and enter | Selected suggestion is analyzed |
| IT-06 | Integration | Search uses first suggestion on submit | Type a partial known name and submit | Top suggestion ticker is analyzed |
| E2E-01 | E2E | User can analyze a US stock | Open app, search `NVDA`, submit | Dashboard loads with fair value and charts |
| E2E-02 | E2E | User can analyze a non-US stock | Search `0700.HK` | Market badge and analysis render successfully |
| E2E-03 | E2E | Same ticker remains stable across page reload | Analyze `JPM`, reload, analyze `JPM` again | Fair value remains the same |
| E2E-04 | E2E | Error recovery works | Search invalid ticker, then valid ticker | App recovers and renders valid analysis |
| E2E-05 | E2E | Mobile search flow works | Run in mobile viewport and analyze a ticker | Input, button, and dashboard remain usable |

## CI Recommendations

Run these checks on every pull request:

1. `npm run lint`
2. `npm run build`
3. unit/integration test suite
4. Playwright smoke test on at least one desktop viewport

## Implementation Order

1. Add Vitest and React Testing Library.
2. Cover seeded generators and valuation math first.
3. Add integration tests for the search-to-dashboard flow.
4. Add Playwright smoke tests for one valid ticker, one invalid ticker, and one non-US ticker.
