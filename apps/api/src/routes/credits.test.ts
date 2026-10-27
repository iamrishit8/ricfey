import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { applyEntry, creditTransaction } from '../credits/service';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseModel } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { CreditAccountModel } from '../models/credit-account';
import { CreditEntryModel } from '../models/credit-entry';
import { ReplanModel } from '../models/replan';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };
const ANSWER = 'I practised the idea on two examples from my own week and wrote down what changed.';
const WRONG = [1, 2, 3, 0, 1]; // the fake quiz key is [0, 1, 2, 3, 0]: every answer wrong

describe.skipIf(!TEST_DB_URI)('credits (needs MONGODB_URI_TEST)', () => {
  useTestDb();

  let background: RecordingBackground;
  let main: FakeProvider;
  const clock = new Date('2026-10-20T04:00:00Z');
  const app = () =>
    buildApp({
      deps: {
        background,
        now: () => clock,
        llm: {
          main,
          check: new FakeProvider(
            { usage: new InMemoryLlmUsageStore(), caps },
            [],
            devFakeResponder,
          ),
        },
      },
    });

  beforeEach(async () => {
    background = new RecordingBackground();
    main = new FakeProvider({ usage: new InMemoryLlmUsageStore(), caps }, [], devFakeResponder);
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  });

  type Cookies = Record<string, string>;
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, cookies: Cookies, payload?: object) =>
    app().inject({ method, url, cookies, ...(payload ? { payload } : {}) });

  /** An intro course of `weeks` weeks at 20 minutes a day: 8 credits per day, so 80 for 2 weeks. */
  async function draftCourse(
    cookies: Cookies,
    opts: { weeks?: number; replanMode?: 'manual' | 'auto' } = {},
  ) {
    const res = await call('POST', '/courses', cookies, {
      skill: 'Knitting',
      depth: 'intro',
      weeks: opts.weeks ?? 2,
      minutesPerDay: 20,
      replanMode: opts.replanMode ?? 'manual',
    });
    await background.drain();
    return res.json().data.course.id as string;
  }
  const buy = (id: string, cookies: Cookies, version = 1) =>
    call('POST', `/courses/${id}/outline/approve`, cookies, { version });
  async function balance(cookies: Cookies) {
    return (await call('GET', '/credits', cookies)).json().data.credits;
  }
  /** Sum of the ledger must equal the stored balance, and each balanceAfter must chain. */
  async function assertLedgerConsistent(userId: mongoose.Types.ObjectId) {
    const entries = await CreditEntryModel.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean();
    let running = 0;
    for (const e of entries) {
      running += e.delta;
      expect(e.balanceAfter).toBe(running);
    }
    expect((await CreditAccountModel.findOne({ userId }).lean())!.balance).toBe(running);
  }
  const adjust = (userId: mongoose.Types.ObjectId, delta: number, key: string) =>
    creditTransaction(userId, (session) =>
      applyEntry(
        { userId, delta, reason: 'adjustment', idempotencyKey: key, note: 'test' },
        session,
      ),
    );
  /** Open and finish a day with a wrong quiz, so its topic is weak. */
  async function finishDay(id: string, n: number, cookies: Cookies) {
    await call('GET', `/courses/${id}/days/${n}`, cookies);
    await background.drain();
    await call('POST', `/courses/${id}/days/${n}/quiz`, cookies, { answers: WRONG });
    await call('POST', `/courses/${id}/days/${n}/task`, cookies, { answer: ANSWER });
    await background.drain();
  }

  test('a new account gets 100 welcome credits, once', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const first = await balance(cookies);
    expect(first.balance).toBe(100);
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0]).toMatchObject({ delta: 100, reason: 'welcome' });
    await Promise.all([balance(cookies), balance(cookies), balance(cookies)]);
    expect((await balance(cookies)).balance).toBe(100);
    await assertLedgerConsistent(user._id);
  });

  test('drafting a course costs nothing; the quote shows the one-time price', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    expect((await balance(cookies)).balance).toBe(100);
    const quote = (await call('GET', `/courses/${id}/outline`, cookies)).json().data.outline.quote;
    expect(quote).toMatchObject({ days: 10, depth: 'intro', totalCredits: 80 });
  });

  test('buying charges the price once and the course starts; opening days is free', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    expect((await buy(id, cookies)).statusCode).toBe(200);
    const after = await balance(cookies);
    expect(after.balance).toBe(20);
    expect(after.entries[0]).toMatchObject({ delta: -80, reason: 'course', balanceAfter: 20 });
    expect(await CourseModel.findById(id)).toMatchObject({ status: 'active', creditsPaid: 80 });
    expect(await CourseDayModel.countDocuments({ courseId: id })).toBe(10);

    for (let n = 1; n <= 3; n++) {
      await call('GET', `/courses/${id}/days/${n}`, cookies);
      await background.drain();
    }
    expect((await balance(cookies)).balance).toBe(20);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'course' })).toBe(1);
    await assertLedgerConsistent(user._id);
  });

  test('five clicks on Buy at once: one charge, one set of days', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    const results = await Promise.all(Array.from({ length: 5 }, () => buy(id, cookies)));
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(4);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'course' })).toBe(1);
    expect(await CourseDayModel.countDocuments({ courseId: id })).toBe(10);
    expect((await balance(cookies)).balance).toBe(20);
    await assertLedgerConsistent(user._id);
  });

  test('not enough credits: 402 with details; stays a draft; works after topping up', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    await balance(cookies); // grants the welcome credits
    await adjust(user._id, -30, 'test:drain'); // 70 left, the price is 80
    const res = await buy(id, cookies);
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
      details: { needed: 80, balance: 70 },
    });
    const course = (await CourseModel.findById(id))!;
    expect(course.status).toBe('outline');
    expect(course.creditsPaid).toBeNull();
    expect(await CourseDayModel.countDocuments({ courseId: id })).toBe(0);

    await adjust(user._id, 100, 'test:topup');
    expect((await buy(id, cookies)).statusCode).toBe(200);
    expect((await balance(cookies)).balance).toBe(90);
    await assertLedgerConsistent(user._id);
  });

  test('the price follows the version being bought: removing days makes it cheaper', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    const view = (await call('GET', `/courses/${id}/outline`, cookies)).json().data.outline;
    type W = { theme: string; days: Array<{ day: number; title: string }> };
    const weeks = (view.outline.weeks as W[]).map((w, i) => ({
      theme: w.theme,
      days: w.days.slice(0, i === 0 ? 5 : 2).map((d) => ({ fromDay: d.day, title: d.title })),
    }));
    await call('PUT', `/courses/${id}/outline`, cookies, { baseVersion: 1, weeks });
    const v2 = (await call('GET', `/courses/${id}/outline`, cookies)).json().data.outline;
    expect(v2.quote.totalCredits).toBe(60); // 7 days × 2 × 4 = 56 → 60
    expect((await buy(id, cookies, 2)).statusCode).toBe(200);
    expect((await balance(cookies)).balance).toBe(40);
  });

  test('a re-plan of the next 7 days is free', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    await buy(id, cookies);
    await finishDay(id, 1, cookies);
    const replan = (await call('POST', `/courses/${id}/replan`, cookies)).json().data.replan;
    expect(replan.priceCredits).toBe(0);
    expect(replan.before.map((d: { day: number }) => d.day)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    await background.drain();
    expect(
      (await call('POST', `/courses/${id}/replan/${replan.id}/accept`, cookies)).statusCode,
    ).toBe(200);
    expect((await balance(cookies)).balance).toBe(20);
    await assertLedgerConsistent(user._id);
  });

  /** A 20-day course, bought, with day 1 finished: 19 upcoming days. Starts with 1000 spare credits. */
  async function longCourse(cookies: Cookies, userId: mongoose.Types.ObjectId) {
    await balance(cookies);
    await adjust(userId, 1000, 'test:topup');
    const id = await draftCourse(cookies, { weeks: 4 });
    expect((await buy(id, cookies)).statusCode).toBe(200); // 20 × 2 × 4 = 160
    await finishDay(id, 1, cookies);
    return id;
  }

  test('beyond 7 days ahead costs 2 per extra day, charged once on accept; reject is free', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await longCourse(cookies, user._id);
    const start = (await balance(cookies)).balance;
    expect(start).toBe(100 + 1000 - 160);

    const policy = (await call('GET', `/courses/${id}/replan`, cookies)).json().data.policy;
    expect(policy).toMatchObject({ freeAheadDays: 7, maxAheadDays: 28, pricePerExtraDay: 2 });
    expect(policy.replannableDays).toHaveLength(19);

    const r1 = (await call('POST', `/courses/${id}/replan`, cookies, { ahead: 12 })).json().data
      .replan;
    expect(r1.priceCredits).toBe(10); // 5 extra days × 2
    expect(r1.before).toHaveLength(12);
    await background.drain();
    await call('POST', `/courses/${id}/replan/${r1.id}/reject`, cookies);
    expect((await balance(cookies)).balance).toBe(start);

    const r2 = (await call('POST', `/courses/${id}/replan`, cookies, { ahead: 12 })).json().data
      .replan;
    await background.drain();
    await call('POST', `/courses/${id}/replan/${r2.id}/accept`, cookies);
    const after = await balance(cookies);
    expect(after.balance).toBe(start - 10);
    expect(after.entries[0]).toMatchObject({ delta: -10, reason: 'replan' });
    expect((await call('POST', `/courses/${id}/replan/${r2.id}/accept`, cookies)).statusCode).toBe(
      409,
    );
    expect((await balance(cookies)).balance).toBe(start - 10);
    await assertLedgerConsistent(user._id);
  });

  test('accepting a priced re-plan without credits: 402, still proposed, nothing applied', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await longCourse(cookies, user._id);
    const rid = (await call('POST', `/courses/${id}/replan`, cookies, { ahead: 12 })).json().data
      .replan.id;
    await background.drain();
    await adjust(user._id, -(await balance(cookies)).balance, 'test:drain-all');
    const accept = await call('POST', `/courses/${id}/replan/${rid}/accept`, cookies);
    expect(accept.statusCode).toBe(402);
    expect((await ReplanModel.findById(rid))!.status).toBe('proposed');
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(1);
    await assertLedgerConsistent(user._id);
  });

  test('requests for more than 28 days ahead are refused', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies);
    await buy(id, cookies);
    await finishDay(id, 1, cookies);
    expect((await call('POST', `/courses/${id}/replan`, cookies, { ahead: 29 })).statusCode).toBe(
      400,
    );
  });

  test('auto mode only ever looks 7 days ahead, free', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await draftCourse(cookies, { replanMode: 'auto' });
    await buy(id, cookies);
    await finishDay(id, 1, cookies);
    const replan = (await ReplanModel.findOne({ courseId: id }))!;
    expect(replan).toMatchObject({ status: 'applied', trigger: 'auto', priceCredits: 0 });
    expect(replan.before).toHaveLength(7);
    expect((await balance(cookies)).balance).toBe(20);
  });

  test("a learner sees only their own ledger and can't buy someone else's course", async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    const id = await draftCourse(a.cookies);
    expect((await buy(id, b.cookies)).statusCode).toBe(404);
    expect((await buy(id, a.cookies)).statusCode).toBe(200);
    const bView = await balance(b.cookies);
    expect(bView.balance).toBe(100);
    expect(bView.entries).toHaveLength(1);
  });
});
