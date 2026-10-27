import { Slot } from '@radix-ui/react-slot';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The signature button: a pill with a round red arrow. `quiet` is the secondary version. */
export function ArrowButton({
  children,
  className,
  quiet,
  asChild = false,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean; quiet?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn('dz-btn', quiet && 'dz-btn-quiet', className)} {...props}>
      <span>{children}</span>
      <span aria-hidden className="dz-btn-dot">
        ↗
      </span>
    </Comp>
  );
}

export function Chip({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('dz-chip', className)} {...props} />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-bold tracking-[0.18em] uppercase">{children}</p>;
}

/** Statement text that fills with red, word by word, as it scrolls past. */
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
    <p ref={ref} className={cn('dz-head text-[clamp(2rem,5vw,4.25rem)] leading-[1.02]', className)}>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            color: i < filled ? 'var(--red)' : 'color-mix(in oklch, var(--red) 28%, var(--paper))',
            transition: 'color 300ms',
          }}
        >
          {w}{' '}
        </span>
      ))}
    </p>
  );
}

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((t) => (
        <span
          key={t}
          className="dz-head flex items-center gap-6 px-6 text-3xl whitespace-nowrap sm:text-4xl"
        >
          {t}
          <span aria-hidden>✺</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn('overflow-hidden py-5', className)} role="presentation">
      <div className="dz-marquee-track">
        {row}
        <div aria-hidden className="flex">
          {row}
        </div>
      </div>
    </div>
  );
}

export type FaqItem = { q: string; a: string };

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="grid gap-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="dz-card flex w-full cursor-pointer items-center justify-between gap-4 rounded-full! px-6 py-4 text-left text-lg font-semibold"
              style={isOpen ? { background: 'var(--c3)', color: 'var(--on-c)' } : undefined}
            >
              {item.q}
              <span aria-hidden className="text-2xl">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div
                id={`faq-${i}`}
                className="dz-card mt-3 ml-auto max-w-[92%] p-6 text-lg leading-relaxed sm:max-w-[78%]"
              >
                {item.a}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
