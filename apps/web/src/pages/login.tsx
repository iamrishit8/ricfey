import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, post } from '@/lib/api';

const ERRORS: Record<string, string> = {
  google_unavailable: 'Google sign-in isn’t set up yet. Use your email instead.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'That sign-in attempt expired or didn’t match. Please try again.',
  google_failed: 'Google sign-in failed. Please try again.',
  google_unverified: 'Your Google email isn’t verified. Use the email link instead.',
  invalid_link: 'That sign-in link is invalid or has expired. Request a new one.',
};

export function LoginPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(ERRORS[params.get('error') ?? ''] ?? null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState('sending');
    try {
      await post('/auth/magic/request', { email });
      setState('sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setState('idle');
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
        <h1 className="text-h1 font-medium">
          Welcome <em className="text-brand">back</em>, or welcome.
        </h1>
        <p className="mt-6 max-w-md text-lead text-muted-foreground">
          No passwords. We email you a link that signs you in once and expires in 15 minutes.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-6">
          {state === 'sent' ? (
            <div role="status" className="grid gap-3">
              <h2 className="text-h3 font-medium">Check your inbox</h2>
              <p className="text-muted-foreground">
                If <strong className="text-foreground">{email}</strong> is a valid address, a
                sign-in link is on its way. In development, the link is printed in the API console.
              </p>
              <Button
                variant="link"
                className="justify-self-start"
                onClick={() => setState('idle')}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
            </form>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border-l-4 border-destructive bg-muted px-4 py-3 text-small"
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 text-small text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          {/* A plain link: the API redirects to Google and back (server-side flow). */}
          <Button variant="outline" asChild>
            <a href="/api/auth/google">Continue with Google</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
