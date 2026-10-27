import { useState } from 'react';
import { cn } from '@/lib/utils';

export type FaqItem = { q: string; a: string };

/** Questions as pills; the open one shows its answer in a rounded bubble underneath. */
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
              className={cn(
                'w-full cursor-pointer rounded-full px-6 py-4 text-left text-lg font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isOpen
                  ? 'border border-brand bg-card text-card-foreground'
                  : 'bg-muted hover:bg-border',
              )}
            >
              {item.q}
            </button>
            {isOpen && (
              <div
                id={`faq-${i}`}
                className="mt-3 ml-auto max-w-[92%] rounded-3xl border bg-background p-6 text-lg leading-relaxed sm:max-w-[80%]"
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
