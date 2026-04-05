import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SearchResult } from '@/hooks/useStockData';

interface HeroSectionProps {
  onSearch: (ticker: string) => void;
  loading: boolean;
  onSearchQuery: (query: string) => SearchResult[];
}

export function HeroSection({ onSearch, loading, onSearchQuery }: HeroSectionProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const particleSpecs = useMemo(
    () => Array.from({ length: 20 }, (_, index) => ({
      left: `${(index * 17.3) % 100}%`,
      top: `${(index * 31.7 + 11) % 100}%`,
      driftY: 20 + (index % 5) * 7,
      driftX: -10 + (index % 6) * 4,
      duration: 3 + (index % 4) * 0.6,
    })),
    []
  );
  const suggestions = useMemo(
    () => (query.length >= 1 ? onSearchQuery(query) : []),
    [query, onSearchQuery]
  );
  const shouldShowSuggestions = showSuggestions && query.length > 0;

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // If there's a selected suggestion, use that ticker
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectStock(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        // Use the first suggestion
        handleSelectStock(suggestions[0]);
      } else {
        // Try to search directly
        onSearch(query.trim());
      }
      setShowSuggestions(false);
    }
  };

  const handleSelectStock = (stock: SearchResult) => {
    setQuery(stock.ticker);
    setShowSuggestions(false);
    onSearch(stock.ticker);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!shouldShowSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Enter':
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          handleSelectStock(suggestions[selectedIndex]);
        }
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const marketColors: Record<string, string> = {
    'United States': 'bg-blue-500/20 text-blue-400',
    'Europe': 'bg-yellow-500/20 text-yellow-400',
    'United Kingdom': 'bg-purple-500/20 text-purple-400',
    'China (A-Share)': 'bg-red-500/20 text-red-400',
    'Hong Kong': 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="hero-bg absolute inset-0 z-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0f172a] to-[#0a0a0a]" />
        
        {/* Animated grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00ff88]/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {particleSpecs.map((particle, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#00d4ff]/40"
            style={{
              left: particle.left,
              top: particle.top,
              animation: `float ${particle.duration}s ease-in-out ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 mb-8">
          <span className="text-sm text-[#00d4ff]">Global Markets: US | EU | UK | China | HK</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          <span className="text-white">Market</span>{' '}
          <span className="bg-gradient-to-r from-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
            Intelligence
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[#a0a0a0] mb-12 max-w-2xl mx-auto">
          Search by ticker or company name. Deterministic demo fair value analysis
          for stocks across US, European, UK, China, and Hong Kong markets.
        </p>

        {/* Search Container */}
        <div
          className={`relative mx-auto max-w-xl transition-all duration-300 ${
            isFocused ? 'scale-105' : ''
          }`}
        >
          {/* Glow effect */}
          <div 
            className={`absolute -inset-1 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-2xl blur opacity-0 transition-opacity duration-300 ${
              isFocused ? 'opacity-30' : ''
            }`} 
          />
          
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-center gap-2 p-2 bg-[#1a1a1a]/80 backdrop-blur-xl rounded-2xl border border-white/10"
          >
            <Input
              ref={inputRef}
              type="text"
              aria-label="Stock search"
              placeholder="Search ticker or company name..."
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);
                setSelectedIndex(-1);
                setShowSuggestions(nextQuery.trim().length > 0);
              }}
              onFocus={() => {
                setIsFocused(true);
                if (query.length >= 1 && suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-[#606060] focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Clear search"
              >
                <span className="text-sm text-[#606060]">Clear</span>
              </button>
            )}
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-[#00d4ff] to-[#00a8cc] hover:from-[#00e5ff] hover:to-[#00b8dd] text-black font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Analyzing
                </span>
              ) : (
                <span>Analyze</span>
              )}
            </Button>
          </form>

          {/* Search Suggestions Dropdown */}
          {shouldShowSuggestions && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50"
            >
              <div className="max-h-80 overflow-y-auto">
                {suggestions.length === 0 && query.length >= 1 ? (
                  <div className="p-4 text-center text-[#606060]">
                    <p>No stocks found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs text-[#606060] border-b border-white/5">
                      {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                    </div>
                    {suggestions.map((stock, index) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelectStock(stock)}
                        className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors text-left ${
                          index === selectedIndex ? 'bg-white/10' : ''
                        }`}
                      >
                        <span className="text-2xl">{stock.marketFlag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{stock.ticker}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${marketColors[stock.market] || 'bg-gray-500/20 text-gray-400'}`}>
                              {stock.market}
                            </span>
                          </div>
                          <p className="text-sm text-[#a0a0a0] truncate">{stock.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#606060]">{stock.sector}</span>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Market Tags */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            { flag: '🇺🇸', name: 'US', example: 'AAPL' },
            { flag: '🇪🇺', name: 'EU', example: 'ASML' },
            { flag: '🇬🇧', name: 'UK', example: 'SHEL' },
            { flag: '🇨🇳', name: 'China', example: '0700.HK' },
            { flag: '🇭🇰', name: 'HK', example: '0005.HK' },
          ].map((market) => (
            <button
              key={market.name}
              onClick={() => {
                setQuery(market.example);
                onSearch(market.example);
              }}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-[#a0a0a0] hover:text-white hover:bg-white/10 hover:border-[#00d4ff]/30 transition-all flex items-center gap-2"
            >
              <span>{market.flag}</span>
              <span>{market.name}</span>
            </button>
          ))}
        </div>

        {/* Quick Tags */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'BABA', '0700.HK'].map((symbol) => (
            <button
              key={symbol}
              onClick={() => {
                setQuery(symbol);
                onSearch(symbol);
              }}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[#a0a0a0] hover:text-white hover:bg-white/10 hover:border-[#00d4ff]/30 transition-all"
            >
              {symbol}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-3xl mx-auto">
          {[
            { label: 'Fair Value Analysis', desc: 'DCF, P/E & P/B models' },
            { label: 'Sector Comparison', desc: 'Peer benchmarking' },
            { label: 'Multi-Market Data', desc: 'US, EU, UK, CN, HK' },
          ].map((feature, i) => (
            <div 
              key={i}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <span className="text-white font-medium">{feature.label}</span>
              <span className="text-xs text-[#606060]">{feature.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
}
