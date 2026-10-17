import type { FastifyInstance } from 'fastify';
import { MagicLinkRequestSchema, MagicLinkVerifySchema } from '@ricfey/shared';
import type { GoogleOAuthClient } from '../auth/google';
import type { Mailer } from '../auth/mailer';
import { hitRateLimit } from '../auth/rate-limit';
import { endSession, requireUser, startSession, type SessionConfig } from '../auth/session';
import { upsertUserByEmail, upsertUserFromGoogle } from '../auth/users';
import { AppError } from '../lib/errors';
import { randomToken, safeEqual, sha256 } from '../lib/crypto';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import { MagicTokenModel } from '../models/magic-token';
import { toPublicUser } from '../models/user';

export type AuthRouteOptions = SessionConfig & {
  webUrl: string;
  mailer: Mailer;
  google: GoogleOAuthClient | null;
  now: () => Date;
};

const MAGIC_TTL_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
const STATE_COOKIE = 'ricfey_oauth_state';

export async function authRoutes(app: FastifyInstance, opts: AuthRouteOptions): Promise<void> {
  const loginError = (code: string) => `${opts.webUrl}/login?error=${code}`;

  app.post('/auth/magic/request', async (req) => {
    const { email } = validate(MagicLinkRequestSchema, req.body);
    const now = opts.now();
    // Hash the email in the key so the rate-limit collection holds no addresses.
    await hitRateLimit({
      key: `magic:ip:${req.ip}`,
      limit: MAX_PER_IP,
      windowMs: RATE_WINDOW_MS,
      now,
    });
    await hitRateLimit({
      key: `magic:email:${sha256(email)}`,
      limit: MAX_PER_EMAIL,
      windowMs: RATE_WINDOW_MS,
      now,
    });

    const token = randomToken();
    await MagicTokenModel.create({
      tokenHash: sha256(token),
      email,
      expiresAt: new Date(now.getTime() + MAGIC_TTL_MS),
    });
    // The link opens a web page that POSTs the token, so link scanners that GET it can't use it up.
    await opts.mailer.sendMagicLink(email, `${opts.webUrl}/auth/magic?token=${token}`);
    // Same answer whether or not the email has an account: no account enumeration.
    return ok({ sent: true });
  });

  app.post('/auth/magic/verify', async (req, reply) => {
    const { token } = validate(MagicLinkVerifySchema, req.body);
    const now = opts.now();
    // Atomic: only one request can flip usedAt from null, so a token works exactly once.
    const used = await MagicTokenModel.findOneAndUpdate(
      { tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { new: true },
    );
    if (!used) throw new AppError('UNAUTHORIZED', 'This sign-in link is invalid or has expired.');

    const user = await upsertUserByEmail(used.email, now);
    await startSession(reply, user._id, opts, now);
    return ok({ user: toPublicUser(user) });
  });

  app.get('/auth/google', async (_req, reply) => {
    if (!opts.google) {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Google sign-in is not configured. Use the email link.',
      );
    }
    const state = randomToken(16);
    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: opts.cookieSecure,
      sameSite: 'lax', // lax so the cookie comes back on Google's top-level redirect
      path: '/auth/google',
      maxAge: 10 * 60,
    });
    return reply.redirect(opts.google.authUrl(state));
  });

  app.get('/auth/google/callback', async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    const expected = req.cookies[STATE_COOKIE];
    reply.clearCookie(STATE_COOKIE, { path: '/auth/google' });

    if (!opts.google) return reply.redirect(loginError('google_unavailable'));
    if (q.error) return reply.redirect(loginError('google_cancelled'));
    if (!q.code || !q.state || !expected || !safeEqual(q.state, expected)) {
      return reply.redirect(loginError('google_state'));
    }

    let profile;
    try {
      profile = await opts.google.exchange(q.code);
    } catch (err) {
      req.log.warn({ err: (err as Error).message }, 'Google exchange failed');
      return reply.redirect(loginError('google_failed'));
    }
    if (!profile.emailVerified) return reply.redirect(loginError('google_unverified'));

    const now = opts.now();
    const user = await upsertUserFromGoogle(profile, now);
    await startSession(reply, user._id, opts, now);
    return reply.redirect(`${opts.webUrl}/`);
  });

  app.get('/auth/me', async (req) => {
    const user = await requireUser(req, opts.now());
    return ok({ user: toPublicUser(user) });
  });

  app.post('/auth/logout', async (req, reply) => {
    await endSession(req, reply, opts);
    return ok({ loggedOut: true });
  });
}
