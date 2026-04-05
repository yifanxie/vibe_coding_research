import type {
  AnalystRecommendation,
  FinancialStatement,
  HistoricalPrice,
  SectorPeer,
  StockAnalysis,
  StockInfo,
} from '@/types';
import { calculateFairValue } from '@/lib/financialCalculations';
import { getSectorPeers, type Market, type StockEntry } from '@/lib/stockDatabase';
import { clamp, createSeededRandom, randomBetween, roundTo } from '@/lib/seededRandom';

interface Range {
  min: number;
  max: number;
}

interface SectorProfile {
  peRange: Range;
  pbRange: Range;
  netMarginRange: Range;
  operatingMarginRange: Range;
  fcfMarginRange: Range;
  revenueGrowthRange: Range;
  debtRatioRange: Range;
  dividendYieldRange: Range;
  betaRange: Range;
  dayMoveRange: Range;
}

const MARKET_PRICE_RANGES: Record<Market, Range> = {
  US: { min: 35, max: 420 },
  EU: { min: 18, max: 240 },
  UK: { min: 4, max: 65 },
  CN: { min: 8, max: 120 },
  HK: { min: 10, max: 190 },
};

const SHARE_COUNT_RANGES: Record<Market, Range> = {
  US: { min: 0.9e9, max: 18e9 },
  EU: { min: 0.25e9, max: 8e9 },
  UK: { min: 0.4e9, max: 14e9 },
  CN: { min: 1.5e9, max: 20e9 },
  HK: { min: 0.8e9, max: 18e9 },
};

const DEFAULT_SECTOR_PROFILE: SectorProfile = {
  peRange: { min: 14, max: 24 },
  pbRange: { min: 1.6, max: 4.2 },
  netMarginRange: { min: 0.08, max: 0.18 },
  operatingMarginRange: { min: 0.12, max: 0.24 },
  fcfMarginRange: { min: 0.08, max: 0.16 },
  revenueGrowthRange: { min: 0.03, max: 0.09 },
  debtRatioRange: { min: 0.35, max: 0.55 },
  dividendYieldRange: { min: 0.0, max: 0.025 },
  betaRange: { min: 0.8, max: 1.25 },
  dayMoveRange: { min: -0.045, max: 0.05 },
};

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  Technology: {
    peRange: { min: 22, max: 38 },
    pbRange: { min: 4.5, max: 10 },
    netMarginRange: { min: 0.16, max: 0.29 },
    operatingMarginRange: { min: 0.2, max: 0.34 },
    fcfMarginRange: { min: 0.14, max: 0.28 },
    revenueGrowthRange: { min: 0.06, max: 0.13 },
    debtRatioRange: { min: 0.18, max: 0.38 },
    dividendYieldRange: { min: 0.0, max: 0.016 },
    betaRange: { min: 1.0, max: 1.45 },
    dayMoveRange: { min: -0.05, max: 0.055 },
  },
  Healthcare: {
    peRange: { min: 18, max: 30 },
    pbRange: { min: 3, max: 7 },
    netMarginRange: { min: 0.13, max: 0.24 },
    operatingMarginRange: { min: 0.18, max: 0.3 },
    fcfMarginRange: { min: 0.12, max: 0.24 },
    revenueGrowthRange: { min: 0.04, max: 0.1 },
    debtRatioRange: { min: 0.22, max: 0.42 },
    dividendYieldRange: { min: 0.0, max: 0.02 },
    betaRange: { min: 0.7, max: 1.1 },
    dayMoveRange: { min: -0.035, max: 0.04 },
  },
  'Financial Services': {
    peRange: { min: 9, max: 17 },
    pbRange: { min: 0.8, max: 1.8 },
    netMarginRange: { min: 0.18, max: 0.32 },
    operatingMarginRange: { min: 0.24, max: 0.4 },
    fcfMarginRange: { min: 0.14, max: 0.24 },
    revenueGrowthRange: { min: 0.02, max: 0.07 },
    debtRatioRange: { min: 0.65, max: 0.85 },
    dividendYieldRange: { min: 0.015, max: 0.05 },
    betaRange: { min: 0.8, max: 1.3 },
    dayMoveRange: { min: -0.03, max: 0.035 },
  },
  'Consumer Cyclical': {
    peRange: { min: 16, max: 28 },
    pbRange: { min: 2, max: 6 },
    netMarginRange: { min: 0.07, max: 0.16 },
    operatingMarginRange: { min: 0.1, max: 0.22 },
    fcfMarginRange: { min: 0.08, max: 0.18 },
    revenueGrowthRange: { min: 0.03, max: 0.1 },
    debtRatioRange: { min: 0.32, max: 0.58 },
    dividendYieldRange: { min: 0.0, max: 0.025 },
    betaRange: { min: 1.0, max: 1.5 },
    dayMoveRange: { min: -0.05, max: 0.055 },
  },
  'Communication Services': {
    peRange: { min: 16, max: 26 },
    pbRange: { min: 2.5, max: 5.5 },
    netMarginRange: { min: 0.12, max: 0.24 },
    operatingMarginRange: { min: 0.16, max: 0.28 },
    fcfMarginRange: { min: 0.1, max: 0.2 },
    revenueGrowthRange: { min: 0.03, max: 0.09 },
    debtRatioRange: { min: 0.25, max: 0.48 },
    dividendYieldRange: { min: 0.0, max: 0.02 },
    betaRange: { min: 0.9, max: 1.3 },
    dayMoveRange: { min: -0.04, max: 0.045 },
  },
  'Consumer Defensive': {
    peRange: { min: 17, max: 26 },
    pbRange: { min: 2.5, max: 5 },
    netMarginRange: { min: 0.08, max: 0.18 },
    operatingMarginRange: { min: 0.12, max: 0.22 },
    fcfMarginRange: { min: 0.08, max: 0.16 },
    revenueGrowthRange: { min: 0.02, max: 0.06 },
    debtRatioRange: { min: 0.35, max: 0.58 },
    dividendYieldRange: { min: 0.015, max: 0.04 },
    betaRange: { min: 0.55, max: 0.95 },
    dayMoveRange: { min: -0.025, max: 0.03 },
  },
  Industrials: {
    peRange: { min: 15, max: 24 },
    pbRange: { min: 2, max: 4.5 },
    netMarginRange: { min: 0.07, max: 0.15 },
    operatingMarginRange: { min: 0.11, max: 0.2 },
    fcfMarginRange: { min: 0.07, max: 0.15 },
    revenueGrowthRange: { min: 0.025, max: 0.07 },
    debtRatioRange: { min: 0.35, max: 0.58 },
    dividendYieldRange: { min: 0.01, max: 0.03 },
    betaRange: { min: 0.85, max: 1.2 },
    dayMoveRange: { min: -0.03, max: 0.035 },
  },
  Energy: {
    peRange: { min: 8, max: 15 },
    pbRange: { min: 1, max: 2.4 },
    netMarginRange: { min: 0.08, max: 0.18 },
    operatingMarginRange: { min: 0.12, max: 0.24 },
    fcfMarginRange: { min: 0.1, max: 0.2 },
    revenueGrowthRange: { min: 0.01, max: 0.05 },
    debtRatioRange: { min: 0.35, max: 0.62 },
    dividendYieldRange: { min: 0.02, max: 0.06 },
    betaRange: { min: 0.95, max: 1.35 },
    dayMoveRange: { min: -0.04, max: 0.045 },
  },
  'Basic Materials': {
    peRange: { min: 10, max: 18 },
    pbRange: { min: 1.2, max: 2.8 },
    netMarginRange: { min: 0.06, max: 0.14 },
    operatingMarginRange: { min: 0.1, max: 0.2 },
    fcfMarginRange: { min: 0.07, max: 0.14 },
    revenueGrowthRange: { min: 0.02, max: 0.06 },
    debtRatioRange: { min: 0.3, max: 0.55 },
    dividendYieldRange: { min: 0.01, max: 0.04 },
    betaRange: { min: 0.9, max: 1.3 },
    dayMoveRange: { min: -0.035, max: 0.04 },
  },
  'Real Estate': {
    peRange: { min: 12, max: 20 },
    pbRange: { min: 1, max: 2.8 },
    netMarginRange: { min: 0.09, max: 0.18 },
    operatingMarginRange: { min: 0.12, max: 0.22 },
    fcfMarginRange: { min: 0.09, max: 0.18 },
    revenueGrowthRange: { min: 0.015, max: 0.05 },
    debtRatioRange: { min: 0.45, max: 0.7 },
    dividendYieldRange: { min: 0.02, max: 0.06 },
    betaRange: { min: 0.7, max: 1.05 },
    dayMoveRange: { min: -0.025, max: 0.03 },
  },
  Utilities: {
    peRange: { min: 14, max: 22 },
    pbRange: { min: 1.3, max: 2.5 },
    netMarginRange: { min: 0.1, max: 0.19 },
    operatingMarginRange: { min: 0.14, max: 0.24 },
    fcfMarginRange: { min: 0.08, max: 0.16 },
    revenueGrowthRange: { min: 0.01, max: 0.04 },
    debtRatioRange: { min: 0.45, max: 0.68 },
    dividendYieldRange: { min: 0.025, max: 0.055 },
    betaRange: { min: 0.45, max: 0.8 },
    dayMoveRange: { min: -0.02, max: 0.025 },
  },
};

function getSectorProfile(sector: string): SectorProfile {
  return SECTOR_PROFILES[sector] || DEFAULT_SECTOR_PROFILE;
}

function getRangeValue(rng: () => number, range: Range): number {
  return randomBetween(rng, range.min, range.max);
}

function getSharesOutstanding(info: StockInfo): number {
  if (info.currentPrice <= 0) return 0;
  return info.marketCap / info.currentPrice;
}

export function generateMockStockInfo(stock: StockEntry): StockInfo {
  const profile = getSectorProfile(stock.sector || 'Technology');
  const priceRng = createSeededRandom(`${stock.ticker}:price`);
  const sharesRng = createSeededRandom(`${stock.ticker}:shares`);
  const metricsRng = createSeededRandom(`${stock.ticker}:metrics`);

  const currentPrice = getRangeValue(priceRng, MARKET_PRICE_RANGES[stock.market]);
  const sharesOutstanding = getRangeValue(sharesRng, SHARE_COUNT_RANGES[stock.market]);
  const peRatio = getRangeValue(metricsRng, profile.peRange);
  const priceToBook = getRangeValue(metricsRng, profile.pbRange);
  const dividendYield = getRangeValue(metricsRng, profile.dividendYieldRange);
  const beta = getRangeValue(metricsRng, profile.betaRange);
  const dayMove = getRangeValue(metricsRng, profile.dayMoveRange);
  const forwardPE = peRatio * getRangeValue(metricsRng, { min: 0.82, max: 1.02 });
  const earningsGrowthPercent = getRangeValue(metricsRng, profile.revenueGrowthRange) * 100;
  const pegRatio = peRatio / Math.max(earningsGrowthPercent, 4);
  const previousClose = currentPrice / (1 + dayMove);
  const change = currentPrice - previousClose;
  const highMultiple = getRangeValue(metricsRng, { min: 1.08, max: 1.32 });
  const lowMultiple = getRangeValue(metricsRng, { min: 0.72, max: 0.94 });

  const marketCap = currentPrice * sharesOutstanding;
  const eps = currentPrice / peRatio;

  return {
    ticker: stock.ticker,
    name: stock.name,
    currentPrice: roundTo(currentPrice),
    previousClose: roundTo(previousClose),
    change: roundTo(change),
    changePercent: roundTo(dayMove * 100),
    marketCap: roundTo(marketCap, 0),
    peRatio: roundTo(peRatio),
    forwardPE: roundTo(forwardPE),
    pegRatio: roundTo(pegRatio),
    priceToBook: roundTo(priceToBook),
    dividendYield: roundTo(dividendYield * 100),
    beta: roundTo(beta),
    fiftyTwoWeekHigh: roundTo(currentPrice * highMultiple),
    fiftyTwoWeekLow: roundTo(currentPrice * lowMultiple),
    eps: roundTo(eps),
    sector: stock.sector || 'Technology',
    industry: stock.industry || 'General',
  };
}

export function generateMockFinancials(info: StockInfo): FinancialStatement {
  const profile = getSectorProfile(info.sector);
  const rng = createSeededRandom(`${info.ticker}:financials`);
  const sharesOutstanding = getSharesOutstanding(info);
  const latestNetIncome = Math.max(info.eps * sharesOutstanding, 1);
  const netMargin = getRangeValue(rng, profile.netMarginRange);
  const operatingMargin = Math.max(getRangeValue(rng, profile.operatingMarginRange), netMargin + 0.02);
  const fcfMargin = getRangeValue(rng, profile.fcfMarginRange);
  const debtRatio = getRangeValue(rng, profile.debtRatioRange);
  const growthRate = getRangeValue(rng, profile.revenueGrowthRange);
  const bookValuePerShare = info.currentPrice / Math.max(info.priceToBook, 0.1);
  const latestEquity = Math.max(bookValuePerShare * sharesOutstanding, 1);
  const latestRevenue = Math.max(latestNetIncome / Math.max(netMargin, 0.01), latestNetIncome * 2);
  const latestFreeCashFlow = latestRevenue * fcfMargin;
  const latestOperatingCashFlow = latestFreeCashFlow * getRangeValue(rng, { min: 1.08, max: 1.22 });
  const latestAssets = latestEquity / Math.max(1 - debtRatio, 0.08);
  const periods = ['2024', '2023', '2022', '2021'];

  const revenue = periods.map((_, index) => roundTo(latestRevenue / ((1 + growthRate) ** index), 0));
  const netIncome = revenue.map(value => roundTo(value * netMargin, 0));
  const operatingIncome = revenue.map(value => roundTo(value * operatingMargin, 0));
  const freeCashFlow = revenue.map(value => roundTo(value * fcfMargin, 0));
  const operatingCashFlow = freeCashFlow.map(value => roundTo(value * (latestOperatingCashFlow / latestFreeCashFlow), 0));
  const totalEquity = periods.map((_, index) => roundTo(latestEquity * (1 - index * 0.035), 0));
  const totalAssets = periods.map((_, index) => roundTo(latestAssets * (1 - index * 0.025), 0));
  const totalLiabilities = totalAssets.map((assets, index) => roundTo(assets - totalEquity[index], 0));

  return {
    revenue,
    netIncome,
    operatingIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    operatingCashFlow,
    freeCashFlow,
    periods,
  };
}

export function generateMockHistoricalPrices(info: StockInfo): HistoricalPrice[] {
  const rng = createSeededRandom(`${info.ticker}:history`);
  const prices: HistoricalPrice[] = [];
  const now = new Date();
  const drift = info.changePercent / 100 / 180;
  let price = info.currentPrice * getRangeValue(rng, { min: 0.78, max: 0.94 });

  for (let i = 180; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const randomShock = randomBetween(rng, -0.018, 0.018);
    price *= 1 + drift + randomShock;
    price = clamp(price, info.fiftyTwoWeekLow * 0.97, info.fiftyTwoWeekHigh * 1.01);

    const intradayRange = price * randomBetween(rng, 0.004, 0.018);
    const open = price * (1 + randomBetween(rng, -0.006, 0.006));
    const high = Math.max(price, open) + intradayRange;
    const low = Math.min(price, open) - intradayRange;
    const baseVolume = Math.max(info.marketCap / Math.max(info.currentPrice, 1) / 120, 1_000_000);

    prices.push({
      date: date.toISOString().split('T')[0],
      open: roundTo(open),
      high: roundTo(high),
      low: roundTo(Math.max(low, 0.01)),
      close: roundTo(price),
      volume: Math.round(baseVolume * randomBetween(rng, 0.75, 1.35)),
    });
  }

  return prices;
}

export function generateMockPeers(stockEntry: StockEntry): SectorPeer[] {
  return getSectorPeers(stockEntry.ticker, 5).map(peer => {
    const info = generateMockStockInfo(peer);

    return {
      ticker: peer.ticker,
      name: peer.name,
      currentPrice: info.currentPrice,
      peRatio: info.peRatio,
      marketCap: info.marketCap,
      changePercent: info.changePercent,
    };
  });
}

export function generateMockAnalystData(
  info: StockInfo,
  fairValue: StockAnalysis['fairValue']
): AnalystRecommendation {
  const rng = createSeededRandom(`${info.ticker}:analysts`);
  const sentiment = clamp(fairValue.upside / 100, -0.35, 0.45);
  const buyCount = Math.round(randomBetween(rng, 10, 24) + sentiment * 12);
  const holdCount = Math.round(randomBetween(rng, 4, 11) - sentiment * 3);
  const sellCount = Math.round(randomBetween(rng, 1, 6) - sentiment * 6);
  const safeBuyCount = Math.max(buyCount, 1);
  const safeHoldCount = Math.max(holdCount, 1);
  const safeSellCount = Math.max(sellCount, 0);
  const total = safeBuyCount + safeHoldCount + safeSellCount;
  const consensusScore = (safeBuyCount * 5 + safeHoldCount * 3 + safeSellCount) / total;

  let consensus: AnalystRecommendation['consensus'];
  if (consensusScore >= 4.5) consensus = 'Strong Buy';
  else if (consensusScore >= 3.5) consensus = 'Buy';
  else if (consensusScore >= 2.5) consensus = 'Hold';
  else if (consensusScore >= 1.5) consensus = 'Sell';
  else consensus = 'Strong Sell';

  const targetMean = info.currentPrice * (1 + fairValue.upside / 100 * 0.7);
  const targetHigh = targetMean * randomBetween(rng, 1.08, 1.2);
  const targetLow = targetMean * randomBetween(rng, 0.78, 0.92);

  return {
    consensus,
    consensusScore: roundTo(consensusScore, 1),
    buyCount: safeBuyCount,
    holdCount: safeHoldCount,
    sellCount: safeSellCount,
    targetHigh: roundTo(Math.max(targetHigh, info.currentPrice * 0.85)),
    targetMean: roundTo(Math.max(targetMean, info.currentPrice * 0.9)),
    targetLow: roundTo(Math.max(targetLow, info.currentPrice * 0.65)),
  };
}

export function buildMockStockAnalysis(stockEntry: StockEntry): StockAnalysis {
  const info = generateMockStockInfo(stockEntry);
  const financials = generateMockFinancials(info);
  const fairValue = calculateFairValue(info, financials);

  return {
    info,
    financials,
    fairValue,
    analystData: generateMockAnalystData(info, fairValue),
    peers: generateMockPeers(stockEntry),
    historicalPrices: generateMockHistoricalPrices(info),
  };
}
