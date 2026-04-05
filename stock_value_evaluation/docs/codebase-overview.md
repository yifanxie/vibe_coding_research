# Codebase Overview

## What This App Is

This project is a React + TypeScript + Vite single-page app that lets a user search for a stock ticker and view a fair value analysis dashboard.

Important: the app does not currently fetch live market data. It uses a local stock catalog plus deterministic mock analysis data generated from the selected ticker. That means the same ticker now returns stable values, but the numbers are still modeled rather than sourced from a financial API.

## Current Runtime Flow

1. The user types a ticker or company name in [`src/sections/HeroSection.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/HeroSection.tsx).
2. Search suggestions come from [`src/lib/stockDatabase.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/stockDatabase.ts).
3. The request flows through [`useStockData`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/hooks/useStockData.ts).
4. [`buildMockStockAnalysis`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/mockStockAnalysis.ts) creates the modeled stock profile, financials, peers, analyst targets, and price history.
5. [`calculateFairValue`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/financialCalculations.ts) computes DCF, P/E, P/B, weighted fair value, upside, and rating.
6. [`src/App.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/App.tsx) renders the dashboard and toast feedback.
7. [`src/sections/AnalysisDashboard.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/AnalysisDashboard.tsx) displays the analysis cards and charts.

## Current Module Composition

### Application shell

- [`src/main.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/main.tsx): React entry point.
- [`src/App.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/App.tsx): top-level state handoff between search and dashboard.

### UI sections

- [`src/sections/HeroSection.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/HeroSection.tsx): search UI, suggestion dropdown, hero animations.
- [`src/sections/AnalysisDashboard.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/AnalysisDashboard.tsx): result presentation, KPI cards, charts, analyst sentiment, peer snapshots.

### Data and domain logic

- [`src/hooks/useStockData.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/hooks/useStockData.ts): orchestration hook for ticker lookup and analysis generation.
- [`src/lib/stockDatabase.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/stockDatabase.ts): stock universe, search, peer lookup, market metadata.
- [`src/lib/mockStockAnalysis.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/mockStockAnalysis.ts): deterministic mock data provider for stock info, statements, analyst targets, peers, and chart history.
- [`src/lib/financialCalculations.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/financialCalculations.ts): fair value math.
- [`src/lib/seededRandom.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/seededRandom.ts): seeded pseudo-random helpers used to keep modeled outputs stable per ticker.

### Shared types and utilities

- [`src/types/index.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/types/index.ts): app-wide TypeScript contracts.
- [`src/lib/utils.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/utils.ts): Tailwind class merge helper.

### UI kit

- [`src/components/ui`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/components/ui): trimmed to the five primitives the app actually renders: `badge`, `button`, `card`, `input`, and `progress`.

## Valuation Logic

[`calculateFairValue`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/financialCalculations.ts) combines three methods:

- DCF: projected five-year free cash flow plus terminal value.
- P/E: current EPS times the midpoint of current P/E and sector P/E.
- P/B: book value per share times the midpoint of current P/B and sector P/B.

Current weights:

- DCF: 50%
- P/E: 30%
- P/B: 20%

Recent stabilization change:

- The old implementation generated fresh random prices, market caps, P/E values, financial statements, analyst targets, peers, and historical prices on every run.
- The new implementation derives those values deterministically from the ticker and keeps the modeled inputs internally consistent.
- The weighted average now ignores invalid valuation methods instead of letting zero-value methods distort the result.

## Why The Value Was Previously Random

The instability was not primarily caused by the valuation formula itself. It came from the input generation path:

- The previous `generateMockStockInfo` implementation used `Math.random()` for price, market cap, P/E, P/B, EPS, beta, and 52-week range.
- `useStockData` generated new random financial statements every fetch.
- Analyst targets, peers, and historical prices were also rebuilt with `Math.random()` every time.

Because fair value depended on those changing inputs, rerunning the same ticker produced materially different outputs.

## Known Limitations

- Data is still modeled, not live.
- Sector multiples are hard-coded.
- The stock catalog is a large static file that mixes content with lookup logic.
- Presentation and business logic are still tightly coupled around a single hook-driven flow.
- No automated tests are currently wired into `package.json`.
- The app is leaner than before, but the bundle is still relatively large because `recharts`, `gsap`, and the current all-in-one dashboard are loaded together.

## Suggested Reading

- [`README.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/README.md)
- [`docs/architecture-recommendations.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/docs/architecture-recommendations.md)
- [`docs/automated-testing-plan.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/docs/automated-testing-plan.md)
