import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../db/connect';
import { LlmCallModel } from '../models/llm-call';
import type { LlmCallRecord } from './types';
import { MongoLlmUsageStore } from './usage-store';

const uri = process.env.MONGODB_URI_TEST;

const rec = (createdAt: Date, tokensIn: number, tokensOut: number): LlmCallRecord => ({
  purpose: 'day_content',
  provider: 'fake',
  model: 'fake',
  status: 'ok',
  attempt: 1,
  tokensIn,
  tokensOut,
  tokensThinking: 0,
  latencyMs: 5,
  estimatedCostUsd: 0,
  createdAt,
});

describe.skipIf(!uri)('MongoLlmUsageStore (needs MONGODB_URI_TEST)', () => {
  beforeAll(async () => {
    await connectDb(uri!, { autoIndex: true });
    await LlmCallModel.deleteMany({});
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  test('writes to llmCalls and sums only today (UTC)', async () => {
    const store = new MongoLlmUsageStore();
    const now = new Date('2026-10-18T12:00:00Z');
    await store.record(rec(new Date('2026-10-17T23:59:59Z'), 1000, 1000));
    await store.record(rec(new Date('2026-10-18T00:00:00Z'), 10, 20));
    await store.record(rec(new Date('2026-10-18T11:00:00Z'), 30, 40));
    expect(await store.todayTotals(now)).toEqual({ calls: 2, tokens: 100 });
    expect(await mongoose.connection.db!.collection('llmCalls').countDocuments()).toBe(3);
  });

  test('empty day is zero', async () => {
    expect(await new MongoLlmUsageStore().todayTotals(new Date('2030-01-01'))).toEqual({
      calls: 0,
      tokens: 0,
    });
  });
});
