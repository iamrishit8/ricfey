import type { CheckoutOrder, CreditPack, CreditsView } from '@ricfey/shared';
import { useState } from 'react';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { payForOrder } from '@/lib/checkout';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

const REASON: Record<string, string> = {
  welcome: 'Welcome',
  purchase: 'Bought',
  day: 'Course day',
  replan: 'Re-plan',
  adjustment: 'Adjustment',
};
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function CreditsPage() {
  const { user } = useAuth();
  const credits = useApi<{ credits: CreditsView }>('/credits');
  const packs = useApi<{ packs: CreditPack[] }>('/payments/packs');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  async function buy(pack: CreditPack) {
    setBusy(pack.id);
    setError(null);
    setDone(null);
    try {
      const { order } = await post<{ order: CheckoutOrder }>('/payments/orders', {
        packId: pack.id,
      });
      setTestMode(order.gateway === 'fake');
      const result = await payForOrder(order, { email: user?.email });
      if (result?.status === 'paid') {
        setDone(`Added ${result.credits} credits. Your balance is ${result.balance}.`);
        credits.reload();
      }
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setBusy(null);
    }
  }

  const c = credits.data?.credits;
  return (
    <Page narrow>
      <p className="text-small font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Credits
      </p>
      <h1 className="mt-4 text-display font-medium">
        {c ? c.balance : '–'}
        <span className="ml-3 text-h2 text-muted-foreground">left</span>
      </h1>
      <p className="mt-4 text-lead text-muted-foreground">
        A course day costs 1 credit per 15 minutes, charged when you first open it. Re-plans are
        free for your first 7 days.
      </p>

      <section className="mt-12 grid gap-4">
        <h2 className="text-h3 font-medium">Top up</h2>
        {packs.loading && <Spinner label="Loading packs…" />}
        <div className="grid gap-4 sm:grid-cols-3">
          {packs.data?.packs.map((p, i) => (
            <Card key={p.id} className={cn(i === 1 && 'border-brand')}>
              <CardContent className="grid gap-3">
                <p className="text-small font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {p.label}
                </p>
                <p className="font-display text-h1 font-medium">{p.credits}</p>
                <p className="text-small text-muted-foreground">
                  credits · {rupees(p.pricePaise)} · {rupees(Math.round(p.pricePaise / p.credits))}{' '}
                  each
                </p>
                <Button
                  disabled={busy !== null}
                  variant={i === 1 ? 'default' : 'outline'}
                  onClick={() => void buy(p)}
                >
                  {busy === p.id ? 'Paying…' : `Buy for ${rupees(p.pricePaise)}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {testMode && (
          <p className="text-small text-muted-foreground">
            <Badge variant="outline">Test mode</Badge> No money moves; payments are simulated.
          </p>
        )}
        {done && (
          <p role="status" className="rounded-lg border border-success px-4 py-3 text-small">
            {done}
          </p>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </section>

      <section className="mt-12 grid gap-3">
        <h2 className="text-h3 font-medium">History</h2>
        {credits.error && <ErrorNote>{credits.error.message}</ErrorNote>}
        <ol className="grid gap-2">
          {c?.entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
            >
              <span>
                <span className="mr-2 text-small text-muted-foreground">{REASON[e.reason]}</span>
                {e.note}
              </span>
              <span className={cn('font-mono', e.delta > 0 ? 'text-success' : '')}>
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </Page>
  );
}
