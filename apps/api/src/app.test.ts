import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { buildApp } from './app';
import { AppError } from './lib/errors';
import { validate } from './lib/validate';

function appWithTestRoutes() {
  const app = buildApp();
  app.get('/_test/app-error', async () => {
    throw new AppError('CONFLICT', 'Already exists');
  });
  app.get('/_test/crash', async () => {
    throw new Error('db password is hunter2');
  });
  app.post('/_test/validate', async (req) => {
    const body = validate(z.object({ name: z.string().min(1), age: z.number() }), req.body);
    return { success: true, data: body };
  });
  return app;
}

describe('GET /health', () => {
  test('returns 200 with the success envelope', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.db).toBe('disconnected');
    expect(typeof body.data.uptimeSeconds).toBe('number');
  });
});

describe('error envelope', () => {
  test('unknown route is 404 NOT_FOUND', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route GET /nope not found' },
    });
  });

  test('AppError keeps its code, status and message', async () => {
    const res = await appWithTestRoutes().inject({ method: 'GET', url: '/_test/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      success: false,
      error: { code: 'CONFLICT', message: 'Already exists' },
    });
  });

  test('unexpected errors become a generic 500 that leaks nothing', async () => {
    const res = await appWithTestRoutes().inject({ method: 'GET', url: '/_test/crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(res.body).not.toContain('hunter2');
  });

  test('malformed JSON is a 400 BAD_REQUEST', async () => {
    const res = await appWithTestRoutes().inject({
      method: 'POST',
      url: '/_test/validate',
      headers: { 'content-type': 'application/json' },
      payload: '{not json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});

describe('validate()', () => {
  test('invalid body is 400 VALIDATION_ERROR with per-field issues', async () => {
    const res = await appWithTestRoutes().inject({
      method: 'POST',
      url: '/_test/validate',
      payload: { name: '', age: 'old' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const paths = body.error.details.issues.map((i: { path: string }) => i.path).sort();
    expect(paths).toEqual(['age', 'name']);
  });

  test('valid body passes through typed', async () => {
    const res = await appWithTestRoutes().inject({
      method: 'POST',
      url: '/_test/validate',
      payload: { name: 'Asha', age: 30 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: { name: 'Asha', age: 30 } });
  });
});
