import { cn } from '@/lib/utils';

/** The giant word that closes a page, cropped by the bottom edge. */
export function Wordmark({
  children = 'RICFEY',
  className,
}: {
  children?: string;
  className?: string;
}) {
  return (
    <p
      aria-hidden
      className={cn(
        'font-statement text-[clamp(5rem,26vw,24rem)] leading-[0.8] font-extrabold tracking-tighter select-none',
        className,
      )}
    >
      {children}
    </p>
  );
}
