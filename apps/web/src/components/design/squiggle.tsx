import { cn } from '@/lib/utils';

/**
 * A hand-drawn looping line. It draws itself once, when it appears. Decoration only, so it is
 * hidden from screen readers.
 */
export function Squiggle({
  className,
  tone = 'brand',
}: {
  className?: string;
  tone?: 'brand' | 'green';
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 260"
      fill="none"
      className={cn(
        'd-squiggle h-auto w-full',
        tone === 'brand' ? 'text-brand' : 'text-green',
        className,
      )}
    >
      <path
        pathLength={1}
        d="M10 230 C 140 250, 230 120, 360 150 C 470 175, 520 60, 440 40 C 370 25, 340 120, 440 160 C 560 210, 650 120, 790 30"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  );
}
