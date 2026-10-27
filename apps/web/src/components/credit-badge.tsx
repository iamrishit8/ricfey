import type { CreditsView } from '@ricfey/shared';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/use-api';

/** The learner's balance in the header. Refreshes on every navigation. */
export function CreditBadge() {
  const { pathname } = useLocation();
  const { data, reload } = useApi<{ credits: CreditsView }>('/credits');
  useEffect(() => reload(), [pathname, reload]);
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/credits" aria-label="Credits">
        <span className="font-mono">{data ? data.credits.balance : '–'}</span>
        <span className="hidden sm:inline">credits</span>
      </Link>
    </Button>
  );
}
