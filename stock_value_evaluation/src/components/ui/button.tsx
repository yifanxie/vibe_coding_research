import type * as React from 'react';
import { cn } from '@/lib/utils';

function Button({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none',
        className
      )}
      {...props}
    />
  );
}

export { Button };
