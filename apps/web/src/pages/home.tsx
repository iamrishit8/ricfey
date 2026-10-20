import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { DashboardPage } from './dashboard';

export function HomePage() {
  const { user, loading } = useAuth();
  if (user) return <DashboardPage />;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8 sm:pt-20">
      <p className="text-small font-medium uppercase tracking-[0.2em] text-muted-foreground">
        A course that fits you
      </p>
      <h1 className="mt-6 max-w-4xl text-display font-medium">
        Learn <em className="text-brand">anything</em>, one day at a time.
      </h1>
      <p className="mt-8 max-w-2xl text-lead text-muted-foreground">
        Tell Ricfey what you want to learn, how deep, and in how many weeks. Each day you get a
        short lesson, a practice task and a quiz, and the plan adjusts to how you do.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        {loading ? null : (
          <>
            <Button size="lg" asChild>
              <Link to="/login">Start learning</Link>
            </Button>
            <Button variant="link" asChild>
              <Link to="/styleguide">See the styleguide</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
