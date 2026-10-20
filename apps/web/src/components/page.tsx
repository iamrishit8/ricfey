import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Page({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <main
      className={cn(
        'mx-auto px-4 pb-24 pt-6 sm:px-8 sm:pt-10',
        narrow ? 'max-w-3xl' : 'max-w-6xl',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border-l-4 border-destructive bg-muted px-4 py-3 text-small"
    >
      {children}
    </p>
  );
}

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-small">
        <span className="font-mono">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full',
            pct < 50 ? 'bg-destructive' : pct < 75 ? 'bg-brand' : 'bg-success',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
