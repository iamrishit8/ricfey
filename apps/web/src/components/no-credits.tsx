import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Shown when something can't be paid for: how many credits it needs, and where to get them. */
export function NoCredits({ details }: { details?: unknown }) {
  const d = details as { needed?: number; balance?: number } | undefined;
  return (
    <div role="alert" className="grid gap-3 rounded-lg border border-brand bg-brand-soft p-4">
      <p className="font-medium">You’re out of credits for this.</p>
      {d?.needed !== undefined && (
        <p className="text-small text-muted-foreground">
          It needs {d.needed} credits and you have {d.balance ?? 0}.
        </p>
      )}
      <Button className="justify-self-start" asChild>
        <Link to="/credits">Get credits →</Link>
      </Button>
    </div>
  );
}
