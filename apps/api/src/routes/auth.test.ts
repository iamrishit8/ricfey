import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import type { GoogleOAuthClient, GoogleProfile } from '../auth/google';
import { RecordingMailer } from '../auth/mailer';
import { SESSION_COOKIE } from '../auth/session';
import { connectDb, disconnectDb } from '../db/connect';
import { MagicTokenModel } from '../models/magic-token';
import { RateLimitModel } from '../models/rate-limit';
import { SessionModel } from '../models/session';
import { UserModel } from '../models/user';

describe('/auth/me without a database round-trip', () => {
  test('no cookie is 401 UNAUTHORIZED', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Please sign in.' },
    });
  });

  test('Google routes say so when Google is not configured', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/auth/google' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

const uri = process.env.MONGODB_URI_TEST;

class FakeGoogle implements GoogleOAuthClient {
  profile: GoogleProfile = {
    sub: 'g-123',
    email: 'asha@example.com',
    emailVerified: true,
    name: 'Asha',
    picture: null,
  };
  authUrl(state: string) {
    return `https://accounts.example/auth?state=${state}`;
  }
  async exchange(code: string) {
    if (code !== 'good-code') throw new Error('bad code');
    return this.profile;
  }
}

describe.skipIf(!uri)('auth flows (needs MONGODB_URI_TEST)', () => {
  let clock = new Date('2026-10-18T10:00:00Z');
  let mailer: RecordingMailer;
  let google: FakeGoogle;
  const app = () =>
    buildApp({ config: { cookieSecure: true }, deps: { mailer, google, now: () => clock } });

  const tokenFromMail = (i = -1) => new URL(mailer.sent.at(i)!.url).searchParams.get('token')!;
  const sessionCookie = (res: { cookies: Array<{ name: string; value: string }> }) =>
    res.cookies.find((c) => c.name === SESSION_COOKIE);

  async function signIn(email: string) {
    const a = app();
    await a.inject({ method: 'POST', url: '/auth/magic/request', payload: { email } });
    const res = await a.inject({
      method: 'POST',
      url: '/auth/magic/verify',
      payload: { token: tokenFromMail() },
    });
    return sessionCookie(res)!.value;
  }

  beforeAll(async () => {
    await connectDb(uri!, { autoIndex: true });
    await mongoose.connection.dropDatabase();
    await Promise.all([
      UserModel.syncIndexes(),
      SessionModel.syncIndexes(),
      MagicTokenModel.syncIndexes(),
      RateLimitModel.syncIndexes(),
    ]);
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });
  beforeEach(async () => {
    clock = new Date('2026-10-18T10:00:00Z');
    mailer = new RecordingMailer();
    google = new FakeGoogle();
    await Promise.all([
      UserModel.deleteMany({}),
      SessionModel.deleteMany({}),
      MagicTokenModel.deleteMany({}),
      RateLimitModel.deleteMany({}),
    ]);
  });

  test('magic link: request, verify, cookie flags, /auth/me', async () => {
    const a = app();
    const req = await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: '  Asha@Example.com ' },
    });
    expect(req.json()).toEqual({ success: true, data: { sent: true } });
    expect(mailer.sent[0]!.to).toBe('asha@example.com');
    expect(mailer.sent[0]!.url).toStartWith('http://localhost:5173/auth/magic?token=');

    const res = await a.inject({
      method: 'POST',
      url: '/auth/magic/verify',
      payload: { token: tokenFromMail() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.user.email).toBe('asha@example.com');
    const cookie = sessionCookie(res)!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });

    const me = await a.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: cookie.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.user).toMatchObject({ email: 'asha@example.com', name: null });
  });

  test('a magic token cannot be used twice', async () => {
    const a = app();
    await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    const token = tokenFromMail();
    const first = await a.inject({ method: 'POST', url: '/auth/magic/verify', payload: { token } });
    expect(first.statusCode).toBe(200);
    const second = await a.inject({
      method: 'POST',
      url: '/auth/magic/verify',
      payload: { token },
    });
    expect(second.statusCode).toBe(401);
    expect(second.json().error.message).toBe('This sign-in link is invalid or has expired.');
    expect(sessionCookie(second)).toBeUndefined();
  });

  test('a token used concurrently still logs in only once', async () => {
    const a = app();
    await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    const token = tokenFromMail();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        a.inject({ method: 'POST', url: '/auth/magic/verify', payload: { token } }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 401, 401, 401, 401]);
  });

  test('an expired magic token is rejected', async () => {
    const a = app();
    await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    clock = new Date(clock.getTime() + 15 * 60 * 1000 + 1);
    const res = await a.inject({
      method: 'POST',
      url: '/auth/magic/verify',
      payload: { token: tokenFromMail() },
    });
    expect(res.statusCode).toBe(401);
  });

  test('a token just inside 15 minutes still works', async () => {
    const a = app();
    await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    clock = new Date(clock.getTime() + 15 * 60 * 1000 - 1000);
    const res = await a.inject({
      method: 'POST',
      url: '/auth/magic/verify',
      payload: { token: tokenFromMail() },
    });
    expect(res.statusCode).toBe(200);
  });

  test('tokens are stored hashed, never raw', async () => {
    const a = app();
    await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    const token = tokenFromMail();
    const docs = await MagicTokenModel.find().lean();
    expect(docs).toHaveLength(1);
    expect(JSON.stringify(docs)).not.toContain(token);
    expect(docs[0]!.tokenHash).toHaveLength(64);

    const res = await a.inject({ method: 'POST', url: '/auth/magic/verify', payload: { token } });
    const sessionToken = sessionCookie(res)!.value;
    expect(JSON.stringify(await SessionModel.find().lean())).not.toContain(sessionToken);
  });

  test('rate limit: 6th request for one email in 15 minutes is 429', async () => {
    const a = app();
    for (let i = 0; i < 5; i++) {
      const r = await a.inject({
        method: 'POST',
        url: '/auth/magic/request',
        payload: { email: 'a@example.com' },
      });
      expect(r.statusCode).toBe(200);
    }
    const blocked = await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe('RATE_LIMITED');
    expect(mailer.sent).toHaveLength(5);

    clock = new Date(clock.getTime() + 15 * 60 * 1000);
    const later = await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'a@example.com' },
    });
    expect(later.statusCode).toBe(200);
  });

  test('rate limit: 21st request from one IP is 429, across different emails', async () => {
    const a = app();
    for (let i = 0; i < 20; i++) {
      const r = await a.inject({
        method: 'POST',
        url: '/auth/magic/request',
        payload: { email: `u${i}@example.com` },
      });
      expect(r.statusCode).toBe(200);
    }
    const blocked = await a.inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'new@example.com' },
    });
    expect(blocked.statusCode).toBe(429);
    // The rate-limit store holds no email addresses.
    expect(JSON.stringify(await RateLimitModel.find().lean())).not.toContain('@example.com');
  });

  test('invalid email is a 400 VALIDATION_ERROR', async () => {
    const res = await app().inject({
      method: 'POST',
      url: '/auth/magic/request',
      payload: { email: 'nope' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  test('/auth/me only ever returns the caller, never another user', async () => {
    const asha = await signIn('asha@example.com');
    const ben = await signIn('ben@example.com');
    const meA = await app().inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: asha },
    });
    const meB = await app().inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: ben },
    });
    expect(meA.json().data.user.email).toBe('asha@example.com');
    expect(meB.json().data.user.email).toBe('ben@example.com');
    expect(meA.body).not.toContain('ben@');
  });

  test('a made-up session cookie is 401', async () => {
    const res = await app().inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: 'x'.repeat(43) },
    });
    expect(res.statusCode).toBe(401);
  });

  test('an expired session is 401', async () => {
    const cookie = await signIn('a@example.com');
    clock = new Date(clock.getTime() + 31 * 24 * 60 * 60 * 1000);
    const res = await app().inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: cookie },
    });
    expect(res.statusCode).toBe(401);
  });

  test('logout deletes the session and clears the cookie', async () => {
    const cookie = await signIn('a@example.com');
    const out = await app().inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { [SESSION_COOKIE]: cookie },
    });
    expect(out.statusCode).toBe(200);
    expect(sessionCookie(out)?.value).toBe('');
    expect(await SessionModel.countDocuments()).toBe(0);
    const me = await app().inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [SESSION_COOKIE]: cookie },
    });
    expect(me.statusCode).toBe(401);
  });

  describe('Google', () => {
    async function start(a: ReturnType<typeof app>) {
      const res = await a.inject({ method: 'GET', url: '/auth/google' });
      expect(res.statusCode).toBe(302);
      const state = new URL(res.headers.location as string).searchParams.get('state')!;
      const cookie = res.cookies.find((c) => c.name === 'ricfey_oauth_state')!;
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
      expect(cookie.value).toBe(state);
      return state;
    }

    test('callback with matching state creates the user and a session', async () => {
      const a = app();
      const state = await start(a);
      const res = await a.inject({
        method: 'GET',
        url: `/auth/google/callback?code=good-code&state=${state}`,
        cookies: { ricfey_oauth_state: state },
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('http://localhost:5173/');
      expect(sessionCookie(res)).toBeDefined();
      const user = await UserModel.findOne({ email: 'asha@example.com' }).lean();
      expect(user).toMatchObject({ googleId: 'g-123', name: 'Asha' });
    });

    test('state mismatch is refused without calling Google', async () => {
      const a = app();
      await start(a);
      const res = await a.inject({
        method: 'GET',
        url: '/auth/google/callback?code=good-code&state=attacker',
        cookies: { ricfey_oauth_state: 'real-state' },
      });
      expect(res.headers.location).toBe('http://localhost:5173/login?error=google_state');
      expect(sessionCookie(res)).toBeUndefined();
      expect(await UserModel.countDocuments()).toBe(0);
    });

    test('missing state cookie is refused', async () => {
      const res = await app().inject({
        method: 'GET',
        url: '/auth/google/callback?code=good-code&state=abc',
      });
      expect(res.headers.location).toBe('http://localhost:5173/login?error=google_state');
    });

    test('unverified Google email is refused', async () => {
      google.profile = { ...google.profile, emailVerified: false };
      const a = app();
      const state = await start(a);
      const res = await a.inject({
        method: 'GET',
        url: `/auth/google/callback?code=good-code&state=${state}`,
        cookies: { ricfey_oauth_state: state },
      });
      expect(res.headers.location).toBe('http://localhost:5173/login?error=google_unverified');
    });

    test('links to an existing magic-link user with the same verified email', async () => {
      await signIn('asha@example.com');
      const a = app();
      const state = await start(a);
      await a.inject({
        method: 'GET',
        url: `/auth/google/callback?code=good-code&state=${state}`,
        cookies: { ricfey_oauth_state: state },
      });
      const users = await UserModel.find().lean();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ email: 'asha@example.com', googleId: 'g-123' });
    });

    test('a failed code exchange redirects with an error', async () => {
      const a = app();
      const state = await start(a);
      const res = await a.inject({
        method: 'GET',
        url: `/auth/google/callback?code=bad&state=${state}`,
        cookies: { ricfey_oauth_state: state },
      });
      expect(res.headers.location).toBe('http://localhost:5173/login?error=google_failed');
    });
  });
});
