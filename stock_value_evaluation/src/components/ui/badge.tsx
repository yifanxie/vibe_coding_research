import type * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & {
  variant?: 'default' | 'outline';
}) {
  const variantClass = variant === 'outline'
    ? 'border border-white/15 text-white'
    : 'border-transparent bg-white/10 text-white';

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        variantClass,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
