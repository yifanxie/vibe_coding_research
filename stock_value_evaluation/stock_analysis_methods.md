# Stock Analysis Methods

This document summarizes several credible stock evaluation approaches, what information each method requires, and the kinds of sources needed to obtain that information.

## 1. Discounted Cash Flow (DCF)

### What it does

DCF estimates intrinsic value by projecting future free cash flows and discounting them back to present value.

### Information required

- Historical revenue
- Historical operating income
- Historical net income
- Historical operating cash flow
- Historical capital expenditure
- Historical free cash flow
- Revenue growth assumptions
- Margin assumptions
- Tax rate assumptions
- Discount rate or cost of capital
- Terminal growth rate
- Shares outstanding
- Net debt or excess cash

### Typical sources needed

- Company annual reports and quarterly reports
- SEC filings such as `10-K`, `10-Q`, `8-K`
- Investor relations presentations
- Financial statement APIs or financial data vendors
- Market data provider for market cap, beta, debt cost assumptions, and treasury-rate context

### Best used when

- The company has reasonably predictable cash flow
- You want an intrinsic-value-based method

## 2. Comparable Multiples Analysis

### What it does

This method values a company relative to peers using ratios such as `P/E`, `EV/EBITDA`, `EV/Sales`, or `P/B`.

### Information required

- Share price
- Market cap
- Enterprise value inputs
- Earnings per share
- EBITDA
- Revenue
- Book value
- Net debt
- Peer group definition
- Sector or industry averages

### Typical sources needed

- Stock market quote feed
- Company filings
- Financial databases for standardized peer metrics
- Industry classification data for selecting valid peers

### Best used when

- There is a clear peer group
- The goal is relative valuation rather than absolute intrinsic value

## 3. Dividend Discount Model (DDM)

### What it does

DDM estimates value based on expected future dividends, usually for mature dividend-paying businesses.

### Information required

- Historical dividends per share
- Current dividend rate
- Dividend payout ratio
- Dividend growth assumptions
- Required rate of return
- Earnings stability

### Typical sources needed

- Company filings
- Investor relations dividend announcements
- Historical dividend data providers
- Market data source for current share price and yield context

### Best used when

- The company has a stable dividend policy
- The business is mature and cash-generative

## 4. Asset-Based Valuation

### What it does

Asset-based valuation estimates value from the balance sheet, often focusing on net asset value or adjusted book value.

### Information required

- Total assets
- Total liabilities
- Equity
- Tangible book value
- Inventory quality
- Real estate or investment asset valuations
- Off-balance-sheet obligations
- Shares outstanding

### Typical sources needed

- Company balance sheet from annual and quarterly filings
- Notes to financial statements
- Appraisal or real estate disclosures where relevant
- Sector-specific asset valuation references

### Best used when

- The company is asset-heavy
- Book value matters, such as banks, insurers, REITs, or holding companies

## 5. Earnings Power Value (EPV)

### What it does

EPV estimates value based on normalized current earnings without assuming strong future growth.

### Information required

- Historical operating earnings
- Historical margins
- Normalized tax rate
- Maintenance capital expenditure estimate
- Required return or discount rate
- Shares outstanding
- Net debt or excess cash

### Typical sources needed

- Company filings
- Cash flow statements and income statements
- Management commentary for one-off adjustments
- Market data for capital structure and cost of capital assumptions

### Best used when

- You want a conservative valuation
- Growth assumptions are too uncertain to trust a full DCF

## 6. Sum-of-the-Parts (SOTP)

### What it does

SOTP values each business segment separately and then combines them into a total equity value.

### Information required

- Segment revenue
- Segment operating profit or EBITDA
- Segment growth profile
- Segment-specific peer multiples
- Corporate overhead
- Net debt
- Shares outstanding

### Typical sources needed

- Segment reporting from annual reports and filings
- Management presentations
- Peer multiples from financial databases
- Industry reports for segment-specific benchmarks

### Best used when

- The company has multiple distinct business lines
- Different segments deserve different valuation methods or multiples

## 7. Residual Income Model

### What it does

This method values a firm using current book value plus expected future residual income, where residual income is profit above the required return on equity.

### Information required

- Book value of equity
- Return on equity
- Forecast earnings
- Dividend payout assumptions
- Cost of equity
- Shares outstanding

### Typical sources needed

- Company filings
- Historical financial statements
- Analyst estimates or internal forecast assumptions
- Market data for cost-of-equity assumptions

### Best used when

- Book value is meaningful
- You are evaluating financial institutions or firms where free cash flow is less useful

## 8. Scenario-Based / Probability-Weighted Valuation

### What it does

This approach values the company under multiple possible futures and weights them by probability.

### Information required

- Base-case forecast
- Bull-case forecast
- Bear-case forecast
- Probability weights
- Key drivers such as growth, margins, pricing, or product success
- Valuation output from DCF or multiples in each scenario

### Typical sources needed

- Company filings
- Earnings calls
- Industry reports
- Analyst research
- Internal judgment on risk factors and competitive outcomes

### Best used when

- The company faces high uncertainty
- Valuation depends on a few major binary or strategic outcomes

## Common Information Categories Across Methods

Most credible stock analysis methods rely on some combination of the following data:

- Market data: share price, market cap, volume, beta
- Income statement data: revenue, margins, earnings
- Balance sheet data: assets, liabilities, equity, debt, cash
- Cash flow data: operating cash flow, capex, free cash flow
- Share data: shares outstanding, dilution, buybacks
- Capital return data: dividends, payout ratio
- Peer data: sector, industry, comparable-company multiples
- Assumptions data: growth, discount rate, cost of equity, terminal growth

## Source Types to Plan For in a Real App

If this app evolves beyond modeled data, it would typically need these source categories:

- Regulatory filings source
  - Example need: standardized company financial statements and disclosures
- Market data source
  - Example need: current price, market cap, trading data, beta
- Fundamentals data vendor
  - Example need: normalized historical statements and ratios
- Peer and classification source
  - Example need: industry group, sector, comparable companies
- Dividend and capital actions source
  - Example need: dividend history, splits, buybacks
- Analyst estimate source
  - Example need: forward EPS, consensus targets, estimate revisions
- Macro or rates source
  - Example need: risk-free rate, credit spread context, inflation assumptions

## Practical Recommendation For This App

For a first credible version of a stock evaluation app, the most practical methods to support are:

1. DCF
2. Comparable multiples
3. Asset-based or residual-income valuation for balance-sheet-heavy companies
4. Scenario-based overlays for high-uncertainty companies

That combination gives a good balance of intrinsic value, relative value, and risk-aware analysis.
