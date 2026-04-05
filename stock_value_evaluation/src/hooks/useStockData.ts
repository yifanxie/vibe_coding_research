import { useState, useCallback } from 'react';
import type { StockAnalysis } from '@/types';
import { buildMockStockAnalysis } from '@/lib/mockStockAnalysis';
import { 
  searchStocks, 
  getStockByTicker, 
  MARKET_NAMES,
  MARKET_FLAGS 
} from '@/lib/stockDatabase';

export interface SearchResult {
  ticker: string;
  name: string;
  market: string;
  marketFlag: string;
  sector: string;
}

export function useStockData() {
  const [data, setData] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for stocks by ticker or company name
   */
  const searchStocksByQuery = useCallback((query: string): SearchResult[] => {
    const results = searchStocks(query);
    return results.slice(0, 10).map(stock => ({
      ticker: stock.ticker,
      name: stock.name,
      market: MARKET_NAMES[stock.market],
      marketFlag: MARKET_FLAGS[stock.market],
      sector: stock.sector || 'Unknown',
    }));
  }, []);

  /**
   * Fetch stock data by ticker
   */
  const fetchStockData = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Normalize ticker
      const normalizedTicker = ticker.toUpperCase().trim();
      
      // Look up stock in database
      const stockEntry = getStockByTicker(normalizedTicker);
      
      if (!stockEntry) {
        throw new Error(`Stock "${ticker}" not found. Try searching by company name or check the ticker symbol.`);
      }
      
      setData(buildMockStockAnalysis(stockEntry));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    data, 
    loading, 
    error, 
    fetchStockData,
    searchStocksByQuery 
  };
}
