import { cn } from '@/lib/utils';

function Progress({
  className,
  value = 0,
}: {
  className?: string;
  value?: number;
}) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div
        className="h-full rounded-full bg-[#00d4ff] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
