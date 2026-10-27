import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The signature button: a black pill with a round red arrow. `asChild` lets it wrap a router
 * <Link>. The arrow turns a little on hover, unless the visitor prefers less motion.
 */
export function ArrowButton({
  children,
  className,
  asChild = false,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'group inline-flex h-12 cursor-pointer items-center gap-4 rounded-full bg-pill py-1 pr-1 pl-6 text-pill-foreground outline-none transition-transform active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="font-medium">{children}</span>
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-full bg-brand text-brand-foreground transition-transform duration-200 group-hover:rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
      >
        ↗
      </span>
    </Comp>
  );
}
