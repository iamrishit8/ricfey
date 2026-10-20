import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseOutlineModel } from '../models/course-outline';
import { PlacementModel } from '../models/placement';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };

describe.skipIf(!TEST_DB_URI)('outline (needs MONGODB_URI_TEST)', () => {
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

  async function introCourse(cookies: Record<string, string>, extra: object = {}) {
    const res = await app().inject({
      method: 'POST',
      url: '/courses',
      cookies,
      payload: { skill: 'Knitting', depth: 'intro', weeks: 2, minutesPerDay: 30, ...extra },
    });
    await background.drain();
    return res.json().data.course.id as string;
  }
  const get = (id: string, cookies: Record<string, string>, q = '') =>
    app().inject({ method: 'GET', url: `/courses/${id}/outline${q}`, cookies });

  test('generated once, stored as version 1, with a credit quote', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await introCourse(cookies);
    const view = (await get(id, cookies)).json().data.outline;
    expect(view).toMatchObject({ status: 'ready', version: 1, approvedVersion: null });
    expect(view.outline.weeks).toHaveLength(2);
    expect(view.quote).toMatchObject({
      days: 10,
      minutesPerDay: 30,
      creditsPerDay: 2,
      totalCredits: 20,
    });
    expect(main.purposes).toEqual(['course_outline']);
    expect(main.prompts[0]).toContain('"minutesPerDay":30');
  });

  test('a second trigger while generating starts no second job', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const res = await app().inject({
      method: 'POST',
      url: '/courses',
      cookies,
      payload: { skill: 'Knitting', depth: 'intro', weeks: 2, minutesPerDay: 30 },
    });
    const id = res.json().data.course.id;
    // Still generating (background not drained): retry must not start another job.
    await app().inject({ method: 'POST', url: `/courses/${id}/outline/retry`, cookies });
    await background.drain();
    expect(main.purposes).toEqual(['course_outline']);
  });

  test('placement result feeds the outline prompt', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const res = await app().inject({
      method: 'POST',
      url: '/courses',
      cookies,
      payload: { skill: 'Python', depth: 'working', weeks: 2, minutesPerDay: 45 },
    });
    await background.drain();
    const id = res.json().data.course.id;
    for (let i = 0; i < 12; i++) {
      const p = await PlacementModel.findOne({ courseId: id });
      if (p!.status !== 'ready') break;
      const q = p!.bank.find((b) => b.qid === p!.currentQid)!;
      await app().inject({
        method: 'POST',
        url: `/courses/${id}/placement/answer`,
        cookies,
        payload: { questionId: q.qid, answerIndex: (q.answerIndex + 1) % 4 }, // all wrong
      });
    }
    await background.drain();
    expect(main.purposes).toEqual(['placement_bank', 'course_outline']);
    const prompt = main.prompts[1]!;
    expect(prompt).toContain('"level":"foundation"');
    expect(prompt).toContain('weakTopics');
    expect(prompt).toContain('about 45 minutes');
    expect((await get(id, cookies)).json().data.outline.status).toBe('ready');
  });

  test('edit creates version 2; old version still readable; stale base is 409', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await introCourse(cookies);
    const v1 = (await get(id, cookies)).json().data.outline;
    const edit = {
      baseVersion: 1,
      weeks: [
        {
          theme: 'Only week',
          days: [
            { fromDay: 2, title: 'Renamed day' },
            { fromDay: 1, title: v1.outline.weeks[0].days[0].title },
          ],
        },
      ],
    };
    const res = await app().inject({
      method: 'PUT',
      url: `/courses/${id}/outline`,
      cookies,
      payload: edit,
    });
    expect(res.statusCode).toBe(200);
    const v2 = res.json().data.outline;
    expect(v2.version).toBe(2);
    expect(v2.outline.weeks[0].days.map((d: { title: string }) => d.title)[0]).toBe('Renamed day');
    expect(v2.quote.days).toBe(2);
    expect(v2.versions.map((v: { source: string }) => v.source)).toEqual(['generated', 'edited']);
    expect((await get(id, cookies, '?version=1')).json().data.outline.outline.weeks).toHaveLength(
      2,
    );

    const stale = await app().inject({
      method: 'PUT',
      url: `/courses/${id}/outline`,
      cookies,
      payload: edit,
    });
    expect(stale.statusCode).toBe(409);
    expect(await CourseOutlineModel.countDocuments({ courseId: id })).toBe(2);
  });

  test('approve latest → course active; then edits and re-approval are refused', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await introCourse(cookies);
    const wrong = await app().inject({
      method: 'POST',
      url: `/courses/${id}/outline/approve`,
      cookies,
      payload: { version: 7 },
    });
    expect(wrong.statusCode).toBe(409);
    const ok = await app().inject({
      method: 'POST',
      url: `/courses/${id}/outline/approve`,
      cookies,
      payload: { version: 1 },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.course).toMatchObject({ status: 'active', approvedOutlineVersion: 1 });
    expect(ok.json().data.course.title).toContain('Knitting');
    expect(ok.json().data.course.startedAt).not.toBeNull();
    const edit = await app().inject({
      method: 'PUT',
      url: `/courses/${id}/outline`,
      cookies,
      payload: { baseVersion: 1, weeks: [{ theme: 'x', days: [{ fromDay: 1, title: 'x' }] }] },
    });
    expect(edit.statusCode).toBe(409);
  });

  test('another learner gets 404 on every outline route', async () => {
    const asha = await signedInUser('asha@example.com');
    const ben = await signedInUser('ben@example.com');
    const id = await introCourse(asha.cookies);
    for (const [method, url, payload] of [
      ['GET', `/courses/${id}/outline`],
      [
        'PUT',
        `/courses/${id}/outline`,
        { baseVersion: 1, weeks: [{ theme: 'x', days: [{ fromDay: 1, title: 'x' }] }] },
      ],
      ['POST', `/courses/${id}/outline/approve`, { version: 1 }],
      ['POST', `/courses/${id}/outline/retry`],
    ] as const) {
      const res = await app().inject({ method, url, cookies: ben.cookies, payload });
      expect(res.statusCode).toBe(404);
    }
    expect((await get(id, asha.cookies)).json().data.outline.approvedVersion).toBeNull();
  });

  test('outline generation failure → failed; retry → ready', async () => {
    const { cookies } = await signedInUser('a@example.com');
    main.push('nope', 'nope');
    const id = await introCourse(cookies);
    expect((await get(id, cookies)).json().data.outline.status).toBe('failed');
    await app().inject({ method: 'POST', url: `/courses/${id}/outline/retry`, cookies });
    await background.drain();
    expect((await get(id, cookies)).json().data.outline).toMatchObject({
      status: 'ready',
      version: 1,
    });
  });
});
