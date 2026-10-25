import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { CreditBadge } from './credit-badge';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-6 sm:px-8">
      <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
        ricfey<span className="text-brand">.</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
          <Link to="/styleguide">Styleguide</Link>
        </Button>
        <ThemeToggle />
        {user ? (
          <>
            <CreditBadge />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">My courses</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
