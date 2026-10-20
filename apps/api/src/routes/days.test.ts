import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseDayModel } from '../models/course-day';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };
const FAIL_CHECK = JSON.stringify({
  verdict: 'fail',
  coversObjectives: false,
  quizConsistent: true,
  issues: ['Objective 2 is never taught'],
});

describe.skipIf(!TEST_DB_URI)('daily unlock (needs MONGODB_URI_TEST)', () => {
  useTestDb();

  let background: RecordingBackground;
  let main: FakeProvider;
  let check: FakeProvider;
  // Tue 20 Oct 2026, 09:30 in India
  let clock = new Date('2026-10-20T04:00:00Z');
  const app = () => buildApp({ deps: { background, llm: { main, check }, now: () => clock } });

  beforeEach(async () => {
    background = new RecordingBackground();
    main = new FakeProvider({ usage: new InMemoryLlmUsageStore(), caps }, [], devFakeResponder);
    check = new FakeProvider({ usage: new InMemoryLlmUsageStore(), caps }, [], devFakeResponder);
    clock = new Date('2026-10-20T04:00:00Z');
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  });

  /** An approved 2-week intro course (10 days at 5/week). */
  async function activeCourse(cookies: Record<string, string>) {
    const res = await app().inject({
      method: 'POST',
      url: '/courses',
      cookies,
      payload: { skill: 'Knitting', depth: 'intro', weeks: 2, minutesPerDay: 20 },
    });
    await background.drain();
    const id = res.json().data.course.id as string;
    await app().inject({
      method: 'POST',
      url: `/courses/${id}/outline/approve`,
      cookies,
      payload: { version: 1 },
    });
    main.purposes.length = 0;
    main.prompts.length = 0;
    return id;
  }
  const getDay = (id: string, n: number | string, cookies: Record<string, string>) =>
    app().inject({ method: 'GET', url: `/courses/${id}/days/${n}`, cookies });

  test('approval creates one row per outline day, scheduled in India time', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const days = (await app().inject({ method: 'GET', url: `/courses/${id}/days`, cookies })).json()
      .data.days;
    expect(days).toHaveLength(10);
    expect(days[0]).toMatchObject({
      day: 1,
      week: 1,
      status: 'locked',
      unlocked: true,
      unlockAt: '2026-10-19T18:30:00.000Z',
    });
    expect(days[1]).toMatchObject({
      day: 2,
      unlocked: false,
      unlockAt: '2026-10-20T18:30:00.000Z',
    });
    expect(days[5]).toMatchObject({ day: 6, week: 2, unlockAt: '2026-10-26T18:30:00.000Z' });
    expect(main.purposes).toEqual([]); // nothing generated yet: lazy
  });

  test('opening a day generates it once; answers are not sent', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const first = (await getDay(id, 1, cookies)).json().data.day;
    expect(first).toMatchObject({ status: 'generating', content: null });
    await background.drain();
    const ready = (await getDay(id, 1, cookies)).json().data.day;
    expect(ready.status).toBe('ready');
    expect(ready.content.lesson.markdown.length).toBeGreaterThan(100);
    expect(Object.keys(ready.content.quiz.questions[0]).sort()).toEqual([
      'options',
      'question',
      'topic',
    ]);
    expect(JSON.stringify(ready)).not.toContain('answerIndex');
    expect(JSON.stringify(ready)).not.toContain('explanation');
    expect(main.purposes).toEqual(['day_content']);
    expect(check.purposes).toEqual(['self_check']);
    expect(main.prompts[0]).toContain('"minutesPerDay":20');
  });

  test('unlocking the same day concurrently generates it exactly once', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const results = await Promise.all(Array.from({ length: 5 }, () => getDay(id, 1, cookies)));
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    await background.drain();
    await getDay(id, 1, cookies); // and again after it's ready
    await background.drain();
    expect(main.purposes).toEqual(['day_content']);
    expect(background.names.filter((n) => n === 'day_content')).toHaveLength(1);
  });

  test('day 2 is locked until day 1 is finished or its date arrives', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const locked = await getDay(id, 2, cookies);
    expect(locked.statusCode).toBe(403);
    expect(locked.json().error).toMatchObject({
      code: 'FORBIDDEN',
      details: { unlockAt: '2026-10-20T18:30:00.000Z' },
    });
    expect(main.purposes).toEqual([]);

    // by date: midnight in India on 21 Oct
    clock = new Date('2026-10-20T18:30:00Z');
    expect((await getDay(id, 2, cookies)).statusCode).toBe(200);

    // by completion: day 3 opens early once day 2 is finished
    expect((await getDay(id, 3, cookies)).statusCode).toBe(403);
    await CourseDayModel.updateOne({ courseId: id, day: 2 }, { $set: { completedAt: clock } });
    expect((await getDay(id, 3, cookies)).statusCode).toBe(200);
  });

  test('self-check fails once → regenerated with the issues → ready', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    check.push(FAIL_CHECK); // first check fails, second uses the passing fallback
    await getDay(id, 1, cookies);
    await background.drain();
    expect(main.purposes).toEqual(['day_content', 'day_content']);
    expect(check.purposes).toEqual(['self_check', 'self_check']);
    expect(main.prompts[1]).toContain('A reviewer rejected a previous draft');
    expect(main.prompts[1]).toContain('Objective 2 is never taught');
    const day = (await getDay(id, 1, cookies)).json().data.day;
    expect(day).toMatchObject({ status: 'ready', flagged: false });
  });

  test('self-check fails twice → content kept, day flagged, no third attempt', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    check.push(FAIL_CHECK, FAIL_CHECK);
    await getDay(id, 1, cookies);
    await background.drain();
    expect(main.purposes).toEqual(['day_content', 'day_content']);
    const day = (await getDay(id, 1, cookies)).json().data.day;
    expect(day).toMatchObject({ status: 'flagged', flagged: true });
    expect(day.content).not.toBeNull();
    const row = await CourseDayModel.findOne({ courseId: id, day: 1 }).lean();
    expect(row!.selfCheck).toMatchObject({
      verdict: 'fail',
      attempts: 2,
      issues: ['Objective 2 is never taught'],
    });
  });

  test('a passing verdict that contradicts its own flags counts as a fail', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const sneaky = JSON.stringify({
      verdict: 'pass',
      coversObjectives: true,
      quizConsistent: false,
      issues: ['Q3 answer is wrong'],
    });
    check.push(sneaky, sneaky);
    await getDay(id, 1, cookies);
    await background.drain();
    expect((await getDay(id, 1, cookies)).json().data.day.status).toBe('flagged');
  });

  test('generation failure → failed; opening again retries', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    main.push('bad', 'bad');
    await getDay(id, 1, cookies);
    await background.drain();
    expect((await CourseDayModel.findOne({ courseId: id, day: 1 }))!.status).toBe('failed');
    await getDay(id, 1, cookies);
    await background.drain();
    expect((await getDay(id, 1, cookies)).json().data.day.status).toBe('ready');
  });

  test('days need an approved outline; bad day numbers are 404', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const res = await app().inject({
      method: 'POST',
      url: '/courses',
      cookies,
      payload: { skill: 'Knitting', depth: 'intro', weeks: 2, minutesPerDay: 20 },
    });
    await background.drain();
    const id = res.json().data.course.id;
    expect(
      (await app().inject({ method: 'GET', url: `/courses/${id}/days`, cookies })).statusCode,
    ).toBe(409);
    const active = await activeCourse(cookies);
    for (const n of [0, 11, 'abc', 999])
      expect((await getDay(active, n, cookies)).statusCode).toBe(404);
  });

  test('another learner gets 404 on day routes and can never trigger generation', async () => {
    const asha = await signedInUser('asha@example.com');
    const ben = await signedInUser('ben@example.com');
    const id = await activeCourse(asha.cookies);
    expect(
      (await app().inject({ method: 'GET', url: `/courses/${id}/days`, cookies: ben.cookies }))
        .statusCode,
    ).toBe(404);
    expect((await getDay(id, 1, ben.cookies)).statusCode).toBe(404);
    await background.drain();
    expect(main.purposes).toEqual([]);
  });
});
