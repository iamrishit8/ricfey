import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { FakeProvider } from './fake-provider';
import { InMemoryLlmUsageStore } from './usage-store';

const Schema = z.object({ answer: z.number() });
const NOW = new Date('2026-10-18T10:00:00Z');

function setup(
  replies: Array<string | (() => string)>,
  caps = { maxCallsPerDay: 10, maxTokensPerDay: 10_000 },
) {
  const usage = new InMemoryLlmUsageStore();
  const llm = new FakeProvider({ usage, caps, now: () => NOW }, replies);
  return { usage, llm };
}

async function rejection(p: Promise<unknown>): Promise<AppError> {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  return err as AppError;
}

describe('generateStructured', () => {
  test('valid JSON: returns typed data and logs one ok call', async () => {
    const { llm, usage } = setup(['{"answer": 42}']);
    const res = await llm.generateStructured(Schema, 'q', 'day_content');
    expect(res).toEqual({ data: { answer: 42 }, attempts: 1 });
    expect(usage.calls).toHaveLength(1);
    expect(usage.calls[0]).toMatchObject({
      purpose: 'day_content',
      provider: 'fake',
      model: 'fake',
      status: 'ok',
      attempt: 1,
      estimatedCostUsd: 0,
      createdAt: NOW,
    });
    expect(usage.calls[0]!.tokensIn).toBeGreaterThan(0);
  });

  test('invalid then valid: retries once with the validation error in the prompt', async () => {
    const { llm, usage } = setup(['{"answer": "forty-two"}', '{"answer": 42}']);
    const res = await llm.generateStructured(Schema, 'ORIGINAL', 'day_content');
    expect(res.attempts).toBe(2);
    expect(usage.calls.map((c) => c.status)).toEqual(['invalid_output', 'ok']);
    expect(llm.prompts[1]).toContain('ORIGINAL');
    expect(llm.prompts[1]).toContain('answer: Invalid input: expected number');
  });

  test('non-JSON text is fed back as "not valid JSON"', async () => {
    const { llm } = setup(['Sure! Here is your JSON:', '{"answer": 1}']);
    await llm.generateStructured(Schema, 'q', 'day_content');
    expect(llm.prompts[1]).toContain('not valid JSON');
  });

  test('invalid twice: LLM_INVALID_OUTPUT, both attempts logged, no third call', async () => {
    const { llm, usage } = setup(['nope', 'still nope', '{"answer": 1}']);
    const err = await rejection(llm.generateStructured(Schema, 'q', 'day_content'));
    expect(err.code).toBe('LLM_INVALID_OUTPUT');
    expect(err.details).toBeUndefined(); // nothing internal goes to the client
    expect(usage.calls.map((c) => c.status)).toEqual(['invalid_output', 'invalid_output']);
    expect(llm.prompts).toHaveLength(2);
  });

  test('provider error: LLM_UNAVAILABLE, logged as error, no retry', async () => {
    const { llm, usage } = setup([
      () => {
        throw new Error('503 Service Unavailable');
      },
    ]);
    const err = await rejection(llm.generateStructured(Schema, 'q', 'day_content'));
    expect(err.code).toBe('LLM_UNAVAILABLE');
    expect(err.statusCode).toBe(503);
    expect(usage.calls).toHaveLength(1);
    expect(usage.calls[0]).toMatchObject({
      status: 'error',
      error: 'Error: 503 Service Unavailable',
    });
  });

  test('call cap: refuses before calling the model', async () => {
    const { llm, usage } = setup(['{"answer": 1}', '{"answer": 2}'], {
      maxCallsPerDay: 1,
      maxTokensPerDay: 1e9,
    });
    await llm.generateStructured(Schema, 'q', 'day_content');
    const err = await rejection(llm.generateStructured(Schema, 'q', 'day_content'));
    expect(err.code).toBe('LLM_CAP_REACHED');
    expect(err.statusCode).toBe(429);
    expect(err.details).toBeUndefined();
    expect(llm.prompts).toHaveLength(1);
    expect(usage.calls).toHaveLength(1);
  });

  test('token cap counts tokens in + out', async () => {
    const { llm } = setup(['{"answer": 1}', '{"answer": 2}'], {
      maxCallsPerDay: 100,
      maxTokensPerDay: 5,
    });
    await llm.generateStructured(Schema, 'a long enough prompt', 'day_content');
    const err = await rejection(llm.generateStructured(Schema, 'q', 'day_content'));
    expect(err.code).toBe('LLM_CAP_REACHED');
  });

  test('the retry is also checked against the cap', async () => {
    const { llm } = setup(['bad', '{"answer": 2}'], { maxCallsPerDay: 1, maxTokensPerDay: 1e9 });
    const err = await rejection(llm.generateStructured(Schema, 'q', 'day_content'));
    expect(err.code).toBe('LLM_CAP_REACHED');
    expect(llm.prompts).toHaveLength(1);
  });

  test("yesterday's calls do not count toward today's cap", async () => {
    const usage = new InMemoryLlmUsageStore();
    usage.calls.push({
      purpose: 'day_content',
      provider: 'fake',
      model: 'fake',
      status: 'ok',
      attempt: 1,
      tokensIn: 1e6,
      tokensOut: 1e6,
      tokensThinking: 0,
      latencyMs: 1,
      estimatedCostUsd: 0,
      createdAt: new Date('2026-10-17T23:59:59Z'),
    });
    const llm = new FakeProvider(
      { usage, caps: { maxCallsPerDay: 1, maxTokensPerDay: 10 }, now: () => NOW },
      ['{"answer": 1}'],
    );
    expect((await llm.generateStructured(Schema, 'q', 'day_content')).data.answer).toBe(1);
  });
});
