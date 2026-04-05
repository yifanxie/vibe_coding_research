import type { FairValueCalculation, StockInfo, FinancialStatement } from '@/types';

/**
 * Calculate Discounted Cash Flow (DCF) valuation
 * Uses simplified Gordon Growth Model: Value = FCF * (1 + g) / (r - g)
 */
export function calculateDCF(
  freeCashFlow: number,
  growthRate: number = 0.05,
  discountRate: number = 0.10,
  terminalGrowthRate: number = 0.025
): number {
  if (!freeCashFlow || freeCashFlow <= 0) return 0;
  if (discountRate <= terminalGrowthRate) {
    return 0;
  }
  
  // Project FCF for 5 years
  let projectedFCF = 0;
  let currentFCF = freeCashFlow;
  
  for (let year = 1; year <= 5; year++) {
    currentFCF *= (1 + growthRate);
    projectedFCF += currentFCF / Math.pow(1 + discountRate, year);
  }
  
  // Terminal value
  const terminalValue = (currentFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);
  
  return projectedFCF + discountedTerminalValue;
}

/**
 * Calculate fair value based on P/E ratio comparison with sector
 */
export function calculatePEValue(
  eps: number,
  currentPE: number,
  sectorPE: number
): number {
  if (!eps || eps <= 0) return 0;
  
  // Fair P/E is the average of current and sector
  const fairPE = (currentPE + sectorPE) / 2;
  return eps * fairPE;
}

/**
 * Calculate fair value based on Price-to-Book ratio
 */
export function calculatePBValue(
  bookValuePerShare: number,
  currentPB: number,
  sectorPB: number
): number {
  if (!bookValuePerShare || bookValuePerShare <= 0) return 0;
  
  // Fair P/B is the average of current and sector
  const fairPB = (currentPB + sectorPB) / 2;
  return bookValuePerShare * fairPB;
}

/**
 * Get sector average P/E ratios (simplified - in production, fetch from API)
 */
export function getSectorPE(sector: string): number {
  const sectorPEMap: Record<string, number> = {
    'Technology': 28.5,
    'Healthcare': 22.3,
    'Financial Services': 14.2,
    'Consumer Cyclical': 19.8,
    'Industrials': 18.5,
    'Communication Services': 21.4,
    'Consumer Defensive': 20.1,
    'Energy': 12.3,
    'Basic Materials': 15.6,
    'Real Estate': 16.8,
    'Utilities': 17.2,
  };
  
  return sectorPEMap[sector] || 20;
}

/**
 * Get sector average P/B ratios (simplified)
 */
export function getSectorPB(sector: string): number {
  const sectorPBMap: Record<string, number> = {
    'Technology': 6.2,
    'Healthcare': 4.8,
    'Financial Services': 1.2,
    'Consumer Cyclical': 3.5,
    'Industrials': 3.2,
    'Communication Services': 3.8,
    'Consumer Defensive': 4.1,
    'Energy': 1.5,
    'Basic Materials': 2.1,
    'Real Estate': 2.8,
    'Utilities': 1.9,
  };
  
  return sectorPBMap[sector] || 3;
}

/**
 * Calculate comprehensive fair value
 */
export function calculateFairValue(
  info: StockInfo,
  financials: FinancialStatement
): FairValueCalculation {
  const latestFCF = financials.freeCashFlow[0] || 0;
  
  // Estimate shares outstanding from market cap and price
  const sharesOutstanding = info.currentPrice > 0 ? info.marketCap / info.currentPrice : 0;
  
  // Estimate growth rate based on historical revenue growth
  let growthRate = 0.05;
  if (financials.revenue.length >= 2) {
    const latestRevenue = financials.revenue[0];
    const priorRevenue = financials.revenue[1];

    if (priorRevenue > 0) {
      const revenueGrowth = (latestRevenue - priorRevenue) / priorRevenue;
      growthRate = Math.min(Math.max(revenueGrowth, 0.02), 0.12);
    }
  }
  
  // Calculate book value per share
  const equity = (financials.totalAssets[0] || 0) - (financials.totalLiabilities[0] || 0);
  const bookValuePerShare = sharesOutstanding > 0 ? equity / sharesOutstanding : 0;
  
  // Sector averages
  const sectorPE = getSectorPE(info.sector);
  const sectorPB = getSectorPB(info.sector);
  
  // Calculate different valuation methods
  const discountRate = Math.min(Math.max(0.085 + info.beta * 0.025, 0.09), 0.14);
  const dcfValue = sharesOutstanding > 0
    ? calculateDCF(latestFCF, growthRate, discountRate) / sharesOutstanding
    : 0;
  const peValue = calculatePEValue(info.eps, info.peRatio, sectorPE);
  const pbValue = calculatePBValue(bookValuePerShare, info.priceToBook, sectorPB);
  
  // Weight only methods that produced a valid positive value.
  const methods = [
    { value: dcfValue, weight: 0.5 },
    { value: peValue, weight: 0.3 },
    { value: pbValue, weight: 0.2 },
  ].filter(method => Number.isFinite(method.value) && method.value > 0);

  const totalWeight = methods.reduce((sum, method) => sum + method.weight, 0);
  const avgValue = totalWeight > 0
    ? methods.reduce((sum, method) => sum + method.value * method.weight, 0) / totalWeight
    : 0;
  
  // Calculate upside/downside
  const upside = info.currentPrice > 0
    ? ((avgValue - info.currentPrice) / info.currentPrice) * 100
    : 0;
  
  // Determine rating
  let rating: FairValueCalculation['rating'];
  if (upside > 30) rating = 'Significantly Undervalued';
  else if (upside > 10) rating = 'Undervalued';
  else if (upside > -10) rating = 'Fairly Valued';
  else if (upside > -30) rating = 'Overvalued';
  else rating = 'Significantly Overvalued';
  
  return {
    dcfValue: Math.round(dcfValue * 100) / 100,
    peValue: Math.round(peValue * 100) / 100,
    pbValue: Math.round(pbValue * 100) / 100,
    avgValue: Math.round(avgValue * 100) / 100,
    upside: Math.round(upside * 100) / 100,
    rating,
  };
}

/**
 * Format large numbers (market cap, revenue, etc.)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toFixed(2)}`;
}

/**
 * Format percentage
 */
export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}
