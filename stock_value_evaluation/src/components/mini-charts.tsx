import { cn } from '@/lib/utils';

interface SeriesPoint {
  label: string;
  value: number;
}

interface ComparisonPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

function formatCompactValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function MiniAreaChart({
  data,
  className,
}: {
  data: SeriesPoint[];
  className?: string;
}) {
  if (data.length === 0) {
    return <div className={cn('flex h-full items-center justify-center text-sm text-[#606060]', className)}>No data</div>;
  }

  const width = 320;
  const height = 180;
  const padding = 18;
  const values = data.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className={cn('flex h-full flex-col gap-3', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
        {[0.25, 0.5, 0.75].map(marker => (
          <line
            key={marker}
            x1={padding}
            x2={width - padding}
            y1={padding + marker * (height - padding * 2)}
            y2={padding + marker * (height - padding * 2)}
            stroke="#ffffff14"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill="rgba(0, 212, 255, 0.16)" />
        <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-[#606060]">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function MiniComparisonChart({
  data,
  className,
}: {
  data: ComparisonPoint[];
  className?: string;
}) {
  const maxAbs = Math.max(...data.map(item => Math.abs(item.value)), 1);

  return (
    <div className={cn('flex h-full flex-col justify-center gap-3', className)}>
      {data.map(item => {
        const width = `${(Math.abs(item.value) / maxAbs) * 100}%`;
        const color = item.highlight ? 'bg-[#00d4ff]' : item.value >= 0 ? 'bg-[#00ff88]' : 'bg-[#ff3366]';

        return (
          <div key={item.label} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
            <span className="truncate text-xs text-[#a0a0a0]">{item.label}</span>
            <div className="h-2 rounded-full bg-white/10">
              <div className={cn('h-full rounded-full', color)} style={{ width }} />
            </div>
            <span className={cn('text-xs font-medium', item.highlight ? 'text-[#00d4ff]' : item.value >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]')}>
              {formatCompactValue(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MiniColumnChart({
  data,
  className,
}: {
  data: SeriesPoint[];
  className?: string;
}) {
  const max = Math.max(...data.map(item => item.value), 1);
  const colors = ['bg-[#00ff88]', 'bg-[#ffaa00]', 'bg-[#ff3366]'];

  return (
    <div className={cn('flex h-full items-end justify-center gap-6 pt-4', className)}>
      {data.map((item, index) => (
        <div key={item.label} className="flex w-16 flex-col items-center gap-3">
          <span className="text-xs text-[#a0a0a0]">{item.value}</span>
          <div className="flex h-36 w-full items-end rounded-t-xl bg-white/5 px-2 pb-2">
            <div
              className={cn('w-full rounded-t-lg', colors[index % colors.length])}
              style={{ height: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-[#606060]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
