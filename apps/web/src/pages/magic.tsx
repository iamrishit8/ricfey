import type { PublicUser } from '@ricfey/shared';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { post } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * The emailed link lands here. We POST the token (never verify on GET: email scanners
 * pre-fetch links and would burn the single-use token).
 */
export function MagicPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  // React StrictMode runs effects twice in development; a single-use token must be sent once.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = params.get('token');
    if (!token) {
      void navigate('/login?error=invalid_link', { replace: true });
      return;
    }
    post<{ user: PublicUser }>('/auth/magic/verify', { token })
      .then(() => refresh())
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=invalid_link', { replace: true }));
  }, [params, navigate, refresh]);

  return (
    <main className="mx-auto max-w-xl px-4 py-32 text-center sm:px-8">
      <p className="font-display text-h2">Signing you in…</p>
    </main>
  );
}
