import { lazy, Suspense, useRef, useEffect } from 'react';
import { HeroSection } from '@/sections/HeroSection';
import { useStockData } from '@/hooks/useStockData';
import { Toaster, toast } from 'sonner';

const AnalysisDashboard = lazy(() =>
  import('@/sections/AnalysisDashboard').then(module => ({ default: module.AnalysisDashboard }))
);

function App() {
  const { data, loading, error, fetchStockData, searchStocksByQuery } = useStockData();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const analysisData = data;

  useEffect(() => {
    if (data) {
      // Smooth scroll to dashboard
      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);

      // Determine market from ticker
      const getMarketName = (ticker: string) => {
        if (ticker.endsWith('.HK')) return 'Hong Kong';
        if (ticker.endsWith('.SS') || ticker.endsWith('.SZ')) return 'China A-Share';
        if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.SW')) return 'Europe';
        if (['SHEL', 'AZN', 'UL', 'HSBC', 'RIO', 'BP', 'DGE', 'BARC'].includes(ticker)) return 'UK';
        return 'US';
      };

      const marketName = getMarketName(data.info.ticker);

      toast.success(`Analysis complete for ${data.info.ticker}`, {
        description: `${marketName} | Fair value: $${data.fairValue.avgValue.toFixed(2)} (${data.fairValue.upside > 0 ? '+' : ''}${data.fairValue.upside.toFixed(1)}%)`,
      });
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast.error('Analysis failed', {
        description: error,
      });
    }
  }, [error]);

  const handleSearch = (ticker: string) => {
    fetchStockData(ticker);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />
      
      {/* Hero Section */}
      <HeroSection 
        onSearch={handleSearch} 
        loading={loading} 
        onSearchQuery={searchStocksByQuery}
      />
      
      {/* Analysis Dashboard */}
      {analysisData && (
        <div ref={dashboardRef}>
          <Suspense fallback={<div className="px-4 py-12 text-center text-sm text-[#a0a0a0]">Loading analysis...</div>}>
            <AnalysisDashboard data={analysisData} />
          </Suspense>
        </div>
      )}

      {/* Background Grain Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default App;
