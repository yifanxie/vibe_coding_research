# Integration Notes

## Existing dashboard seam

The most natural production integration point remains the expanded macro indicator detail module in the main dashboard.

Relevant existing dashboard areas:
- `dashboard/src/components/macro/macro-card.tsx`
- `dashboard/src/components/macro/details/`
- `dashboard/src/components/macro/macro-indicator-registry.tsx`
- `dashboard/src/store/outlook-store.ts`
- `dashboard/src/types/index.ts`

## What this PoC is validating

### TradingView widget track

This validates:
- whether an embedded chart fits the detail-panel layout
- whether the desired symbol and interval interactions feel sufficient
- whether studies and chart-type controls are enough for exploratory use

This does not validate:
- dashboard-owned price extraction
- dashboard-owned indicator extraction
- production persistence model

### Dashboard-native track

This validates:
- a UI pattern where chart config and extracted indicator values are owned by the app
- a metric-card pattern for surfacing latest values in the dashboard
- a candidate shape for future snapshot payloads
- a first provider-backed path using Alpha Vantage gold history plus spot price

This does not validate:
- live provider quality
- rate limits
- production server-side fetch strategy
- persistence policy finalization

## Suggested future implementation layers

1. Add a live-config shape for chart settings.
2. Add a live-snapshot shape for extracted values.
3. Implement a provider adapter layer for historical and latest data.
4. Replace the mock native chart with the chosen production chart component.
5. Persist only the fields you explicitly want to keep as dashboard state.

## Recommendation from this experiment setup

Treat the widget path as a visual PoC track and the dashboard-native path as the architecture track for structured values. In this folder, Alpha Vantage is now the first concrete provider path for gold.
