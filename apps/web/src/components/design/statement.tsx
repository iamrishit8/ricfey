import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Big statement text that fills with colour, word by word, as it scrolls through the screen.
 * With "reduce motion" (or before it is measured) the whole statement is simply coloured.
 */
export function Statement({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = children.split(' ');
  const [filled, setFilled] = useState(words.length);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 0 when the top edge enters the lower third, 1 when the bottom edge reaches mid-screen.
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.45;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      setFilled(Math.round(p * words.length));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [words.length]);

  return (
    <p
      ref={ref}
      className={cn(
        'font-statement text-[clamp(2rem,5.2vw,4.5rem)] leading-[1.02] font-bold tracking-tight',
        className,
      )}
    >
      {words.map((w, i) => (
        <span
          key={i}
          className={cn(
            'transition-colors duration-300 motion-reduce:transition-none',
            i < filled ? 'text-brand' : 'text-brand-tint',
          )}
        >
          {w}{' '}
        </span>
      ))}
    </p>
  );
}
