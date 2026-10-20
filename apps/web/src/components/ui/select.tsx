import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Native select, styled to match Input. Native = accessible and good on phones. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full appearance-none rounded-full border border-input bg-card px-5 text-[0.975rem] outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
        className,
      )}
      {...props}
    />
  );
}
