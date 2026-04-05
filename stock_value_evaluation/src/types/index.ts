export interface StockInfo {
  ticker: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  pegRatio: number;
  priceToBook: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  eps: number;
  sector: string;
  industry: string;
}

export interface FinancialStatement {
  revenue: number[];
  netIncome: number[];
  operatingIncome: number[];
  totalAssets: number[];
  totalLiabilities: number[];
  totalEquity: number[];
  operatingCashFlow: number[];
  freeCashFlow: number[];
  periods: string[];
}

export interface FairValueCalculation {
  dcfValue: number;
  peValue: number;
  pbValue: number;
  avgValue: number;
  upside: number;
  rating: 'Significantly Undervalued' | 'Undervalued' | 'Fairly Valued' | 'Overvalued' | 'Significantly Overvalued';
}

export interface AnalystRecommendation {
  consensus: string;
  consensusScore: number;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  targetHigh: number;
  targetMean: number;
  targetLow: number;
}

export interface SectorPeer {
  ticker: string;
  name: string;
  currentPrice: number;
  peRatio: number;
  marketCap: number;
  changePercent: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockAnalysis {
  info: StockInfo;
  financials: FinancialStatement;
  fairValue: FairValueCalculation;
  analystData: AnalystRecommendation;
  peers: SectorPeer[];
  historicalPrices: HistoricalPrice[];
}
