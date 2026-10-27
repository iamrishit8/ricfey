import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** A white pill: navigation links, filters, tags. */
export function Pill({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex h-10 items-center rounded-full bg-card px-5 text-sm font-medium text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** The small caps label that sits at the top-left of a section ("FEATURED PROJECTS"). */
export function SectionLabel({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('text-base font-semibold tracking-tight uppercase', className)} {...props} />
  );
}
