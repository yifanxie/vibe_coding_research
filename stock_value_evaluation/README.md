# Stock Value Evaluation

This project is a React + TypeScript + Vite app for searching a stock ticker and viewing a fair value analysis dashboard.

The app currently uses a local stock universe and a deterministic mock analysis engine. It does not yet connect to live market data APIs. The same ticker now produces stable modeled outputs instead of changing randomly between runs.

## What Changed

The main valuation issue came from random input generation, not from the fair value formula alone.

Previously, the app regenerated prices, market cap, P/E, P/B, EPS, financial statements, analyst targets, peers, and price history with `Math.random()` every time a ticker was analyzed. That meant the same ticker could produce very different fair values from one run to the next.

The app now uses seeded deterministic generation per ticker via [`src/lib/mockStockAnalysis.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/mockStockAnalysis.ts), so repeated analysis of the same ticker stays stable.

## Project Structure

- [`src/App.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/App.tsx): app shell and top-level state
- [`src/sections/HeroSection.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/HeroSection.tsx): search experience
- [`src/sections/AnalysisDashboard.tsx`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/sections/AnalysisDashboard.tsx): valuation dashboard UI
- [`src/hooks/useStockData.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/hooks/useStockData.ts): analysis loading flow
- [`src/lib/stockDatabase.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/stockDatabase.ts): stock catalog and search helpers
- [`src/lib/mockStockAnalysis.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/mockStockAnalysis.ts): deterministic mock data provider
- [`src/lib/financialCalculations.ts`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/lib/financialCalculations.ts): valuation logic
- [`src/components/ui`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/src/components/ui): trimmed to the five UI primitives the app currently uses

## Local Development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run lint
```

## Documentation

- [`docs/codebase-overview.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/docs/codebase-overview.md)
- [`docs/architecture-recommendations.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/docs/architecture-recommendations.md)
- [`docs/automated-testing-plan.md`](/Users/yifanxie/playground/vibe_writing_experiments/research/stock_value_evaluation/docs/automated-testing-plan.md)
