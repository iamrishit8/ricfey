import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseModel } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { CreditEntryModel } from '../models/credit-entry';
import { GalleryCourseModel } from '../models/gallery-course';
import { GalleryDayModel } from '../models/gallery-day';
import { ReportModel } from '../models/report';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };
const RIGHT = [0, 1, 2, 3, 0]; // the fake quiz key
const SECRET_ANSWER =
  'My private answer: I knit scarves for my cousin Priya and always drop the third stitch.';

describe.skipIf(!TEST_DB_URI)('gallery (needs MONGODB_URI_TEST)', () => {
  useTestDb();

  let background: RecordingBackground;
  let main: FakeProvider;
  const app = () =>
    buildApp({
      deps: {
        background,
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

  /** Draft, buy and open every day of a 1-week (5-day) 20-minute basic course. Does not finish it. */
  async function boughtCourse(cookies: Cookies, skill = 'Knitting', depth = 'basic') {
    const res = await call('POST', '/courses', cookies, {
      skill,
      depth,
      weeks: 1,
      minutesPerDay: 20,
    });
    await background.drain();
    const id = res.json().data.course.id as string;
    if (depth !== 'basic') {
      // Skip the placement quiz: the course starts at the outline in these tests.
      await CourseModel.updateOne({ _id: id }, { $set: { status: 'outline' } });
      await call('POST', `/courses/${id}/outline/retry`, cookies);
      await background.drain();
    }
    expect(
      (await call('POST', `/courses/${id}/outline/approve`, cookies, { version: 1 })).statusCode,
    ).toBe(200);
    return id;
  }
  async function finishDay(id: string, n: number, cookies: Cookies, answer = SECRET_ANSWER) {
    await call('GET', `/courses/${id}/days/${n}`, cookies);
    await background.drain();
    await call('POST', `/courses/${id}/days/${n}/quiz`, cookies, { answers: RIGHT });
    await call('POST', `/courses/${id}/days/${n}/task`, cookies, { answer });
    await background.drain();
  }
  async function finishCourse(id: string, cookies: Cookies) {
    for (let n = 1; n <= 5; n++) await finishDay(id, n, cookies);
    await background.drain();
  }
  /** A finished custom course, published. Costs the creator 40 credits. */
  async function publishedCourse(cookies: Cookies, skill = 'Knitting') {
    const id = await boughtCourse(cookies, skill);
    await finishCourse(id, cookies);
    return id;
  }
  const search = async (cookies: Cookies, qs = '') =>
    (await call('GET', `/gallery${qs}`, cookies)).json().data.courses as Array<{
      id: string;
      skill: string;
      priceCredits: number;
    }>;
  const balance = async (cookies: Cookies) =>
    (await call('GET', '/credits', cookies)).json().data.credits.balance as number;

  test('a finished course joins the gallery at 60 % of its price, with no trace of its learner', async () => {
    const a = await signedInUser('a@example.com');
    const id = await publishedCourse(a.cookies);
    expect((await CourseModel.findById(id))!.status).toBe('completed');

    const g = await GalleryCourseModel.find({}).lean();
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      skill: 'Knitting',
      depth: 'basic',
      weeks: 1,
      minutesPerDay: 20,
      totalDays: 5,
      priceCredits: 20, // custom price 40 × 0.6 = 24 → 20
      status: 'live',
      completions: 0,
    });
    expect(await GalleryDayModel.countDocuments({ galleryId: g[0]!._id })).toBe(5);

    const stored = JSON.stringify([g, await GalleryDayModel.find({}).lean()]);
    expect(stored).not.toContain(a.user._id.toString());
    expect(stored).not.toContain('a@example.com');
    expect(stored).not.toContain('cousin Priya');
  });

  test('quality gates: a flagged day or an open report keeps a course out', async () => {
    const a = await signedInUser('a@example.com');
    const flagged = await boughtCourse(a.cookies, 'Flagged course');
    // Day 3 was written but the self-check flagged it (its content is kept and shown).
    for (let n = 1; n <= 5; n++) {
      await finishDay(flagged, n, a.cookies);
      if (n === 3)
        await CourseDayModel.updateOne(
          { courseId: flagged, day: 3 },
          { $set: { status: 'flagged' } },
        );
    }
    expect((await CourseModel.findById(flagged))!.status).toBe('completed');

    const reported = await boughtCourse(a.cookies, 'Reported course');
    await call('GET', `/courses/${reported}/days/1`, a.cookies);
    await background.drain();
    await call('POST', `/courses/${reported}/days/1/report`, a.cookies, {
      kind: 'factual_error',
      message: 'This lesson has a wrong date in it.',
    });
    await finishCourse(reported, a.cookies);
    expect(await ReportModel.countDocuments({ status: 'open' })).toBe(1);

    expect(await GalleryCourseModel.countDocuments({})).toBe(0);
  });

  test('only one course per variant is published; a second learner finishing it adds nothing', async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    await publishedCourse(a.cookies);
    await publishedCourse(b.cookies);
    expect(await GalleryCourseModel.countDocuments({})).toBe(1);
  });

  test('a gallery copy bought by someone else is never re-published', async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    await publishedCourse(a.cookies);
    const [g] = await search(b.cookies);
    const copy = (await call('POST', `/gallery/${g!.id}/buy`, b.cookies)).json().data.course;
    await finishCourse(copy.id, b.cookies);
    expect(await GalleryCourseModel.countDocuments({})).toBe(1);
    expect((await GalleryCourseModel.findById(g!.id))!.completions).toBe(1);
  });

  test('search: relevance, exact skill first, filters, empty result; sign-in required', async () => {
    const a = await signedInUser('a@example.com');
    await publishedCourse(a.cookies, 'Knitting scarves');
    await publishedCourse(a.cookies, 'Knitting');
    const b = await signedInUser('b@example.com');

    const hits = await search(b.cookies, '?q=knitting');
    expect(hits.map((h) => h.skill)).toEqual(['Knitting', 'Knitting scarves']);
    expect(await search(b.cookies, '?q=quantum')).toEqual([]);
    expect(await search(b.cookies, '?q=knitting&depth=advanced')).toEqual([]);
    expect(await search(b.cookies, '?q=knitting&maxWeeks=1')).toHaveLength(2);
    expect(await search(b.cookies, '?q=knitting&minWeeks=2')).toEqual([]);
    expect(await search(b.cookies)).toHaveLength(2); // browse
    expect(await search(b.cookies, '?q=%22knitting')).toHaveLength(2); // stray quote is harmless
    expect((await call('GET', '/gallery?depth=expert', b.cookies)).statusCode).toBe(400);
    expect((await call('GET', '/gallery', {})).statusCode).toBe(401);
  });

  test('buying: fixed price once, own copy with finished lessons, no model calls, no re-plan', async () => {
    const a = await signedInUser('a@example.com');
    await publishedCourse(a.cookies);
    const b = await signedInUser('b@example.com');
    const [g] = await search(b.cookies);

    const detail = (await call('GET', `/gallery/${g!.id}`, b.cookies)).json().data.course;
    expect(detail).toMatchObject({ priceCredits: 20, days: 5, ownedCourseId: null });
    expect(detail.outline.weeks).toHaveLength(1);
    expect(JSON.stringify(detail)).not.toContain('answerIndex'); // roadmap only, no lessons

    main.purposes.length = 0;
    const res = await call('POST', `/gallery/${g!.id}/buy`, b.cookies);
    expect(res.statusCode).toBe(201);
    const copy = res.json().data.course;
    expect(copy).toMatchObject({ source: 'gallery', status: 'active', creditsPaid: 20 });
    expect(await balance(b.cookies)).toBe(80);
    expect(await CreditEntryModel.countDocuments({ reason: 'gallery' })).toBe(1);
    expect(await CourseDayModel.countDocuments({ courseId: copy.id, status: 'ready' })).toBe(5);

    // Day 1 opens with its lesson at once: nothing is generated.
    const day = (await call('GET', `/courses/${copy.id}/days/1`, b.cookies)).json().data.day;
    expect(day.status).toBe('ready');
    expect(day.content.lesson.markdown.length).toBeGreaterThan(20);
    expect(JSON.stringify(day)).not.toContain('answerIndex');
    expect(main.purposes).toEqual([]);

    // Own progress: quizzes graded, tasks graded by the model.
    const quiz = await call('POST', `/courses/${copy.id}/days/1/quiz`, b.cookies, {
      answers: RIGHT,
    });
    expect(quiz.json().data.result.score).toBe(5);

    // Fixed lessons: no re-plan, and the panel has nothing to adapt.
    expect((await call('POST', `/courses/${copy.id}/replan`, b.cookies)).statusCode).toBe(409);

    expect(
      (await call('GET', `/gallery/${g!.id}`, b.cookies)).json().data.course.ownedCourseId,
    ).toBe(copy.id);
    expect((await call('POST', `/gallery/${g!.id}/buy`, b.cookies)).statusCode).toBe(409);
    expect(await balance(b.cookies)).toBe(80);
  });

  test('five simultaneous buys: one copy, one charge', async () => {
    const a = await signedInUser('a@example.com');
    await publishedCourse(a.cookies);
    const b = await signedInUser('b@example.com');
    const [g] = await search(b.cookies);
    await balance(b.cookies);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => call('POST', `/gallery/${g!.id}/buy`, b.cookies)),
    );
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(4);
    expect(await CourseModel.countDocuments({ userId: b.user._id, source: 'gallery' })).toBe(1);
    expect(await CreditEntryModel.countDocuments({ userId: b.user._id, reason: 'gallery' })).toBe(
      1,
    );
    expect(await balance(b.cookies)).toBe(80);
  });

  test('not enough credits → 402 and no copy; hidden or unknown gallery courses are 404', async () => {
    const a = await signedInUser('a@example.com');
    await publishedCourse(a.cookies);
    const b = await signedInUser('b@example.com');
    const [g] = await search(b.cookies);
    await balance(b.cookies);
    await CreditEntryModel.create({
      userId: b.user._id,
      delta: 0,
      balanceAfter: 0,
      reason: 'adjustment',
      idempotencyKey: 'noop',
      note: 'noop',
    });
    await mongoose.connection
      .collection('creditAccounts')
      .updateOne({ userId: b.user._id }, { $set: { balance: 5 } });
    const res = await call('POST', `/gallery/${g!.id}/buy`, b.cookies);
    expect(res.statusCode).toBe(402);
    expect(res.json().error.details).toMatchObject({ needed: 20, balance: 5 });
    expect(await CourseModel.countDocuments({ userId: b.user._id })).toBe(0);

    await GalleryCourseModel.updateOne({ _id: g!.id }, { $set: { status: 'hidden' } });
    expect((await call('GET', `/gallery/${g!.id}`, b.cookies)).statusCode).toBe(404);
    expect((await call('POST', `/gallery/${g!.id}/buy`, b.cookies)).statusCode).toBe(404);
    expect(await search(b.cookies)).toEqual([]);
    expect((await call('GET', '/gallery/not-an-id', b.cookies)).statusCode).toBe(404);
  });
});
