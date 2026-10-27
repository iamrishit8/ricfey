import { cn } from '@/lib/utils';

/** A line of text drifting left forever. The text is repeated so the loop has no seam. */
export function Marquee({ children, className }: { children: string; className?: string }) {
  const item = (
    <span className="px-6 whitespace-nowrap">
      {children} <span aria-hidden>•</span>
    </span>
  );
  return (
    <div
      className={cn('overflow-hidden border-y py-4 font-display text-3xl uppercase', className)}
      role="presentation"
    >
      <div className="d-marquee-track">
        <div className="flex">
          {item}
          {item}
          {item}
          {item}
        </div>
        <div className="flex" aria-hidden>
          {item}
          {item}
          {item}
          {item}
        </div>
      </div>
    </div>
  );
}
