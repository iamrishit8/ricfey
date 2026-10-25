import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { creditTransaction, applyEntry } from '../credits/service';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseDayModel } from '../models/course-day';
import { CourseModel } from '../models/course';
import { CreditAccountModel } from '../models/credit-account';
import { CreditEntryModel } from '../models/credit-entry';
import { ReplanModel } from '../models/replan';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };
const ANSWER = 'I practised the idea on two examples from my own week and wrote down what changed.';

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
  const call = (method: 'GET' | 'POST', url: string, cookies: Cookies, payload?: object) =>
    app().inject({ method, url, cookies, ...(payload ? { payload } : {}) });

  /** Approved 10-day intro course at 20 minutes a day: 2 credits per day. */
  async function activeCourse(cookies: Cookies, replanMode: 'manual' | 'auto' = 'manual') {
    const res = await call('POST', '/courses', cookies, {
      skill: 'Knitting',
      depth: 'intro',
      weeks: 2,
      minutesPerDay: 20,
      replanMode,
    });
    await background.drain();
    const id = res.json().data.course.id as string;
    await call('POST', `/courses/${id}/outline/approve`, cookies, { version: 1 });
    return id;
  }
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

  test('welcome credits are granted once', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const first = await balance(cookies);
    expect(first.balance).toBe(30);
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0]).toMatchObject({ delta: 30, reason: 'welcome' });
    await Promise.all([balance(cookies), balance(cookies), balance(cookies)]);
    expect((await balance(cookies)).balance).toBe(30);
    await assertLedgerConsistent(user._id);
  });

  test('approving charges nothing; opening a day charges ⌈minutes ÷ 15⌉ once', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    expect((await balance(cookies)).balance).toBe(30);
    await call('GET', `/courses/${id}/days/1`, cookies);
    await background.drain();
    await call('GET', `/courses/${id}/days/1`, cookies);
    const after = await balance(cookies);
    expect(after.balance).toBe(28);
    expect(after.entries[0]).toMatchObject({ delta: -2, reason: 'day', balanceAfter: 28 });
    await assertLedgerConsistent(user._id);
  });

  test('5 concurrent first opens of a day by a brand-new learner: one charge, one generation', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const opens = await Promise.all(
      Array.from({ length: 5 }, () => call('GET', `/courses/${id}/days/1`, cookies)),
    );
    expect(opens.every((r) => r.statusCode === 200)).toBe(true);
    await background.drain();
    expect(main.purposes.filter((p) => p === 'day_content')).toHaveLength(1);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'day' })).toBe(1);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'welcome' })).toBe(1);
    await assertLedgerConsistent(user._id);
  });

  test('not enough credits: 402 with details, the day is not claimed or generated', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await creditTransaction(user._id, (session) =>
      applyEntry(
        {
          userId: user._id,
          delta: -29,
          reason: 'adjustment',
          idempotencyKey: 'test:drain',
          note: 'test',
        },
        session,
      ),
    );
    const res = await call('GET', `/courses/${id}/days/1`, cookies);
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
      details: { needed: 2, balance: 1 },
    });
    const day = (await CourseDayModel.findOne({ courseId: id, day: 1 }).lean())!;
    expect(day.status).toBe('locked');
    expect(main.purposes).not.toContain('day_content');
    await assertLedgerConsistent(user._id);
  });

  test('a day whose generation failed is retried free on the next open', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const boom = () => {
      throw new Error('model down');
    };
    main.push(boom);
    await call('GET', `/courses/${id}/days/1`, cookies);
    await background.drain();
    expect((await CourseDayModel.findOne({ courseId: id, day: 1 }).lean())!.status).toBe('failed');
    await call('GET', `/courses/${id}/days/1`, cookies);
    await background.drain();
    expect((await CourseDayModel.findOne({ courseId: id, day: 1 }).lean())!.content).not.toBeNull();
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'day' })).toBe(1);
  });

  /** Finish days 1–7 (wrong quizzes), so the next re-plan costs 2 credits. */
  async function sevenDaysDone(id: string, cookies: Cookies) {
    for (let n = 1; n <= 7; n++) {
      await call('GET', `/courses/${id}/days/${n}`, cookies);
      await background.drain();
      await call('POST', `/courses/${id}/days/${n}/quiz`, cookies, { answers: [1, 2, 3, 0, 1] });
      await call('POST', `/courses/${id}/days/${n}/task`, cookies, { answer: ANSWER });
      await background.drain();
    }
  }

  test('a priced re-plan is charged once when applied; rejected ones cost nothing', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await sevenDaysDone(id, cookies); // 7 days × 2 = 14 spent → 16 left
    const r1 = (await call('POST', `/courses/${id}/replan`, cookies)).json().data.replan;
    expect(r1.priceCredits).toBe(2);
    await background.drain();
    await call('POST', `/courses/${id}/replan/${r1.id}/reject`, cookies);
    expect((await balance(cookies)).balance).toBe(16);

    const r2 = (await call('POST', `/courses/${id}/replan`, cookies)).json().data.replan;
    await background.drain();
    await call('POST', `/courses/${id}/replan/${r2.id}/accept`, cookies);
    const after = await balance(cookies);
    expect(after.balance).toBe(14);
    expect(after.entries[0]).toMatchObject({ delta: -2, reason: 'replan' });
    // A second accept cannot charge again.
    expect((await call('POST', `/courses/${id}/replan/${r2.id}/accept`, cookies)).statusCode).toBe(
      409,
    );
    expect((await balance(cookies)).balance).toBe(14);
    await assertLedgerConsistent(user._id);
  });

  test('accepting a priced re-plan without credits: 402, nothing applied, still proposed', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await sevenDaysDone(id, cookies);
    const rid = (await call('POST', `/courses/${id}/replan`, cookies)).json().data.replan.id;
    await background.drain();
    await creditTransaction(user._id, (session) =>
      applyEntry(
        {
          userId: user._id,
          delta: -15,
          reason: 'adjustment',
          idempotencyKey: 'test:drain',
          note: 'test',
        },
        session,
      ),
    );
    const res = await call('POST', `/courses/${id}/replan/${rid}/accept`, cookies);
    expect(res.statusCode).toBe(402);
    expect((await ReplanModel.findById(rid))!.status).toBe('proposed');
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(1);
    await assertLedgerConsistent(user._id);
  });

  test('auto mode without enough credits leaves the re-plan proposed', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies, 'auto');
    // Make every re-plan priced by pretending 7 days are already finished.
    await CourseDayModel.updateMany(
      { courseId: id, day: { $gte: 2, $lte: 7 } },
      { $set: { completedAt: clock, status: 'ready' } },
    );
    await creditTransaction(user._id, (session) =>
      applyEntry(
        {
          userId: user._id,
          delta: -28,
          reason: 'adjustment',
          idempotencyKey: 'test:drain',
          note: 'test',
        },
        session,
      ),
    );
    // Day 1 costs the last 2 credits; finishing it triggers an auto re-plan that costs 2.
    await call('GET', `/courses/${id}/days/1`, cookies);
    await background.drain();
    await call('POST', `/courses/${id}/days/1/quiz`, cookies, { answers: [1, 2, 3, 0, 1] });
    await call('POST', `/courses/${id}/days/1/task`, cookies, { answer: ANSWER });
    await background.drain();
    const replan = (await ReplanModel.findOne({ courseId: id }))!;
    expect(replan).toMatchObject({ status: 'proposed', trigger: 'auto', priceCredits: 2 });
    expect((await balance(cookies)).balance).toBe(0);
  });

  test('a learner sees only their own ledger', async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    const id = await activeCourse(a.cookies);
    await call('GET', `/courses/${id}/days/1`, a.cookies);
    await background.drain();
    const bView = await balance(b.cookies);
    expect(bView.balance).toBe(30);
    expect(bView.entries).toHaveLength(1);
    // b cannot spend a's credits by opening a's course.
    expect((await call('GET', `/courses/${id}/days/2`, b.cookies)).statusCode).toBe(404);
  });
});
