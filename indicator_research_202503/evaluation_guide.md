# Evaluation Guide

## Goal

Use this experiment to decide which chart and indicator integration path should be implemented first in the main dashboard.

Before running the native gold chart, configure your Alpha Vantage API key as described in `README.md`.

## Recommended session flow

### 1. Visual embed check

Open the `TradingView Widget PoC` tab and test:
- symbol switching
- interval switching
- chart type switching
- study preset switching
- desktop and mobile viewport fit

Record:
- how quickly the chart becomes usable
- whether the rendered chart fits the macro detail-card layout
- whether the configuration surface is sufficient for first-pass exploration

### 2. Dashboard-owned values check

Open the `Dashboard-Native PoC` tab and test:
- primary symbol switching
- compare overlay switching
- indicator toggle switching
- snapshot refresh
- chart readability when overlays are active
- gold history depth across daily, weekly, and monthly-backed windows

Record:
- whether the metric cards match the kind of values you want to surface in the dashboard
- whether the JSON snapshot preview resembles the future state you want persisted or cached
- whether the compare-overlay behavior is useful enough for macro work

### 3. Decision matrix review

Open the `Evaluation` tab and review the scoring matrix.

Use the local notes field to answer:
- Which path is best for the first production prototype?
- Which path is best for dashboard-owned value extraction?
- Which risks need separate follow-up research before production work?

## Decision criteria

Use the following priority order unless your product goals change:

1. compatibility with the existing macro detail architecture
2. ability to extract structured values into your own dashboard fields
3. speed of proof-of-concept delivery
4. clarity of refresh and persistence design
5. licensing and provider viability

## Expected outcome

At the end of the session, you should be able to state:
- whether TradingView widget embedding is enough for the first step
- whether a dashboard-native metric path is required from the beginning
- whether Charting Library investigation should be postponed
