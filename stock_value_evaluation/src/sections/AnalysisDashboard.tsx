import type { StockAnalysis } from '@/types';
import { formatLargeNumber, formatPercent } from '@/lib/financialCalculations';
import { MiniAreaChart, MiniColumnChart, MiniComparisonChart } from '@/components/mini-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AnalysisDashboardProps {
  data: StockAnalysis;
}

export function AnalysisDashboard({ data }: AnalysisDashboardProps) {
  const { info, fairValue, analystData, peers, historicalPrices } = data;

  const isPositive = info.change >= 0;
  const isUndervalued = fairValue.upside > 0;

  // Get market info based on ticker
  const getMarketInfo = (ticker: string) => {
    if (ticker.endsWith('.HK')) return { name: 'Hong Kong', flag: '🇭🇰', color: 'bg-pink-500/20 text-pink-400' };
    if (ticker.endsWith('.SS') || ticker.endsWith('.SZ')) return { name: 'China A-Share', flag: '🇨🇳', color: 'bg-red-500/20 text-red-400' };
    if (ticker.endsWith('.PA') || ticker.endsWith('.FR')) return { name: 'France', flag: '🇫🇷', color: 'bg-blue-500/20 text-blue-400' };
    if (ticker.endsWith('.DE')) return { name: 'Germany', flag: '🇩🇪', color: 'bg-yellow-500/20 text-yellow-400' };
    if (ticker.endsWith('.SW') || ticker.endsWith('.CH')) return { name: 'Switzerland', flag: '🇨🇭', color: 'bg-red-500/20 text-red-400' };
    if (['SHEL', 'AZN', 'UL', 'HSBC', 'RIO', 'BP', 'DGE', 'BARC', 'LLOY', 'VOD', 'GLEN'].includes(ticker)) return { name: 'UK', flag: '🇬🇧', color: 'bg-purple-500/20 text-purple-400' };
    return { name: 'United States', flag: '🇺🇸', color: 'bg-blue-500/20 text-blue-400' };
  };

  const marketInfo = getMarketInfo(info.ticker);

  // Prepare chart data
  const chartData = historicalPrices.slice(-30).map(p => ({
    label: p.date.slice(5),
    price: p.close,
    volume: p.volume / 1e6,
  }));

  // Peer comparison data
  const peerData = [
    { name: info.ticker, value: fairValue.upside, isMain: true },
    ...peers.map(p => ({
      name: p.ticker,
      value: p.changePercent,
      isMain: false,
    })),
  ];

  // Analyst rating distribution
  const ratingData = [
    { name: 'Buy', count: analystData.buyCount, color: '#00ff88' },
    { name: 'Hold', count: analystData.holdCount, color: '#ffaa00' },
    { name: 'Sell', count: analystData.sellCount, color: '#ff3366' },
  ];

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Significantly Undervalued': return 'bg-[#00ff88]';
      case 'Undervalued': return 'bg-[#00ff88]/70';
      case 'Fairly Valued': return 'bg-[#ffaa00]';
      case 'Overvalued': return 'bg-[#ff3366]/70';
      case 'Significantly Overvalued': return 'bg-[#ff3366]';
      default: return 'bg-[#a0a0a0]';
    }
  };

  const getRatingTextColor = (rating: string) => {
    switch (rating) {
      case 'Significantly Undervalued': return 'text-[#00ff88]';
      case 'Undervalued': return 'text-[#00ff88]';
      case 'Fairly Valued': return 'text-[#ffaa00]';
      case 'Overvalued': return 'text-[#ff3366]';
      case 'Significantly Overvalued': return 'text-[#ff3366]';
      default: return 'text-[#a0a0a0]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="analysis-card flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-4xl font-bold text-white">{info.ticker}</h2>
              <Badge variant="outline" className="border-[#00d4ff]/30 text-[#00d4ff]">
                {info.sector}
              </Badge>
              <Badge className={`${marketInfo.color} flex items-center gap-1`}>
                <span>{marketInfo.flag} {marketInfo.name}</span>
              </Badge>
            </div>
            <p className="text-[#a0a0a0]">{info.name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-4xl font-bold text-white">${info.currentPrice.toFixed(2)}</span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                <span>{isPositive ? '▲' : '▼'}</span>
                <span className="font-semibold">{formatPercent(info.changePercent)}</span>
              </div>
            </div>
            <p className="text-sm text-[#606060]">Last close: ${info.previousClose.toFixed(2)}</p>
          </div>
        </div>

        {/* Fair Value Card - Hero */}
        <div className="analysis-card">
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-white/10 overflow-hidden relative">
            {/* Glow effect */}
            <div className={`absolute top-0 right-0 w-96 h-96 blur-[150px] opacity-20 ${
              isUndervalued ? 'bg-[#00ff88]' : 'bg-[#ff3366]'
            }`} />
            
            <CardHeader className="relative z-10">
              <CardTitle className="text-white">Fair Value Assessment</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Rating */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5">
                  <div className={`text-2xl font-bold text-center mb-2 ${getRatingTextColor(fairValue.rating)}`}>
                    {fairValue.rating}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-white">{fairValue.upside > 0 ? '+' : ''}{fairValue.upside.toFixed(1)}%</span>
                  </div>
                  <p className="text-sm text-[#606060] mt-2">Upside Potential</p>
                </div>

                {/* Valuation Methods */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-[#a0a0a0] mb-3">Valuation Methods</h4>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-white">DCF Model</span>
                    <span className="font-mono text-white">${fairValue.dcfValue.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-white">P/E Multiple</span>
                    <span className="font-mono text-white">${fairValue.peValue.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-white">P/B Multiple</span>
                    <span className="font-mono text-white">${fairValue.pbValue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Average Target */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5">
                  <p className="text-sm text-[#a0a0a0] mb-2">Average Fair Value</p>
                  <span className="text-5xl font-bold text-white mb-2">${fairValue.avgValue.toFixed(2)}</span>
                  <div className="w-full mt-4">
                    <div className="flex justify-between text-xs text-[#606060] mb-1">
                      <span>Current</span>
                      <span>Fair Value</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isUndervalued ? 'bg-gradient-to-r from-[#00ff88] to-[#00d4ff]' : 'bg-gradient-to-r from-[#ff3366] to-[#ffaa00]'
                        }`}
                        style={{ width: `${Math.min((info.currentPrice / Math.max(fairValue.avgValue, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Market Cap', value: formatLargeNumber(info.marketCap) },
            { label: 'P/E Ratio', value: info.peRatio.toFixed(2) },
            { label: 'Dividend Yield', value: `${info.dividendYield.toFixed(2)}%` },
            { label: 'Beta', value: info.beta.toFixed(2) },
            { label: '52W High', value: `$${info.fiftyTwoWeekHigh.toFixed(2)}` },
            { label: '52W Low', value: `$${info.fiftyTwoWeekLow.toFixed(2)}` },
            { label: 'Forward P/E', value: info.forwardPE.toFixed(2) },
            { label: 'PEG Ratio', value: info.pegRatio.toFixed(2) },
          ].map((stat, i) => (
            <div key={i} className="analysis-card">
              <Card className="bg-[#1a1a1a]/50 border-white/5 hover:border-[#00d4ff]/20 transition-all">
                <CardContent className="p-4">
                  <div className="mb-2">
                    <span className="text-xs text-[#606060]">{stat.label}</span>
                  </div>
                  <span className="stat-value text-xl font-bold text-white">{stat.value}</span>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Chart */}
          <div className="analysis-card">
            <Card className="bg-[#1a1a1a]/50 border-white/5 h-full">
              <CardHeader>
                <CardTitle className="text-white">Price History (30D)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <MiniAreaChart data={chartData.map(point => ({ label: point.label, value: point.price }))} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sector Comparison */}
          <div className="analysis-card">
            <Card className="bg-[#1a1a1a]/50 border-white/5 h-full">
              <CardHeader>
                <CardTitle className="text-white">Sector Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <MiniComparisonChart data={peerData.map(item => ({ label: item.name, value: item.value, highlight: item.isMain }))} />
                </div>
                <p className="text-xs text-[#606060] mt-4 text-center">
                  Fair value upside comparison vs sector peers
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analyst Ratings */}
        <div className="analysis-card">
          <Card className="bg-[#1a1a1a]/50 border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Analyst Ratings</CardTitle>
                <Badge className={`${getRatingColor(analystData.consensus)} text-black`}>
                  {analystData.consensus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Rating Distribution */}
                <div className="flex flex-col items-center">
                  <div className="h-48 w-full">
                    <MiniColumnChart data={ratingData.map(item => ({ label: item.name, value: item.count }))} />
                  </div>
                  <p className="text-xs text-[#606060] mt-2">Rating Distribution</p>
                </div>

                {/* Consensus Score */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5">
                  <p className="text-sm text-[#a0a0a0] mb-2">Consensus Score</p>
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#ffffff10"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#scoreGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(analystData.consensusScore / 5) * 351.86} 351.86`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00ff88" />
                          <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{analystData.consensusScore}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#606060] mt-2">out of 5.0</p>
                </div>

                {/* Price Targets */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-[#a0a0a0] mb-3">Price Targets</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20">
                      <span className="text-sm text-white">High</span>
                      <span className="font-mono text-[#00ff88] font-bold">${analystData.targetHigh.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-sm text-white">Mean</span>
                      <span className="font-mono text-[#00d4ff] font-bold">${analystData.targetMean.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/20">
                      <span className="text-sm text-white">Low</span>
                      <span className="font-mono text-[#ff3366] font-bold">${analystData.targetLow.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-white/5">
                    <div className="flex justify-between text-xs text-[#606060] mb-1">
                      <span>Current: ${info.currentPrice.toFixed(2)}</span>
                      <span>Mean: ${analystData.targetMean.toFixed(2)}</span>
                    </div>
                    <Progress 
                      value={((info.currentPrice - analystData.targetLow) / (analystData.targetHigh - analystData.targetLow)) * 100} 
                      className="h-2 bg-white/10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-[#606060] pt-8">
          <p>Data provided for educational purposes. Not financial advice. Always do your own research.</p>
        </div>
      </div>
    </div>
  );
}
