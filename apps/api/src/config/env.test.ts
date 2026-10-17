import { describe, expect, test } from 'bun:test';
import { loadEnv } from './env';

const valid = { MONGODB_URI: 'mongodb+srv://user:s3cret@cluster.example.net/ricfey' };

describe('loadEnv', () => {
  test('applies defaults and coerces PORT', () => {
    const env = loadEnv({ ...valid, PORT: '5000' });
    expect(env.PORT).toBe(5000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.HOST).toBe('127.0.0.1');
  });

  test('missing MONGODB_URI fails with the variable name', () => {
    expect(() => loadEnv({})).toThrow(/MONGODB_URI: is required/);
  });

  test('lists every problem at once and never echoes values', () => {
    let message = '';
    try {
      loadEnv({ MONGODB_URI: 'postgres://user:s3cret@x', PORT: 'abc', NODE_ENV: 'staging' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('MONGODB_URI');
    expect(message).toContain('PORT');
    expect(message).toContain('NODE_ENV');
    expect(message).not.toContain('s3cret');
  });
});

describe('redactCredentials', () => {
  test('removes user:password from connection strings', async () => {
    const { redactCredentials } = await import('../db/connect');
    const out = redactCredentials('failed mongodb+srv://ricfey:s3cret@c0.mongodb.net/x');
    expect(out).toBe('failed mongodb+srv://<redacted>@c0.mongodb.net/x');
  });
});

describe('auth env rules', () => {
  const base = { MONGODB_URI: 'mongodb://localhost/x' };

  test('Google settings are all-or-nothing', () => {
    expect(() => loadEnv({ ...base, GOOGLE_CLIENT_ID: 'id' })).toThrow(
      /GOOGLE_CLIENT_ID: set all of/,
    );
  });

  test('production requires Resend, a sender and secure cookies', () => {
    let msg = '';
    try {
      loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('RESEND_API_KEY: is required in production');
    expect(msg).toContain('EMAIL_FROM: is required in production');
    expect(msg).toContain('COOKIE_SECURE: must be true in production');
  });

  test('empty optional values count as unset', () => {
    const env = loadEnv({
      ...base,
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      GOOGLE_REDIRECT_URI: '',
    });
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.COOKIE_SECURE).toBe(true);
  });
});
