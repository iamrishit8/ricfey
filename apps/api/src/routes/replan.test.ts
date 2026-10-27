import { beforeEach, describe, expect, test } from 'bun:test';
import type { OutlineDay } from '@ricfey/shared';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { RecordingBackground } from '../lib/background';
import { devFakeResponder } from '../llm/dev-fake';
import { FakeProvider } from '../llm/fake-provider';
import { InMemoryLlmUsageStore } from '../llm/usage-store';
import { CourseModel } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { CourseOutlineModel } from '../models/course-outline';
import { ReplanModel } from '../models/replan';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

const caps = { maxCallsPerDay: 1000, maxTokensPerDay: 1e9 };
const ANSWER = 'I practised the idea on two examples from my own week and wrote down what changed.';
const WRONG = [1, 2, 3, 0, 1]; // the fake quiz key is [0, 1, 2, 3, 0]: every answer wrong
const RIGHT = [0, 1, 2, 3, 0];

describe.skipIf(!TEST_DB_URI)('re-planning (needs MONGODB_URI_TEST)', () => {
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
  const call = (
    method: 'GET' | 'POST' | 'PATCH',
    url: string,
    cookies: Cookies,
    payload?: object,
  ) => app().inject({ method, url, cookies, ...(payload ? { payload } : {}) });

  /** Approved 10-day intro course (horizon 3). */
  async function activeCourse(cookies: Cookies, replanMode: 'manual' | 'auto' = 'manual') {
    const res = await call('POST', '/courses', cookies, {
      skill: 'Knitting',
      depth: 'basic',
      weeks: 2,
      minutesPerDay: 20,
      replanMode,
    });
    await background.drain();
    const id = res.json().data.course.id as string;
    await call('POST', `/courses/${id}/outline/approve`, cookies, { version: 1 });
    return id;
  }
  async function finishDay(id: string, n: number, cookies: Cookies, answers = WRONG) {
    await call('GET', `/courses/${id}/days/${n}`, cookies);
    await background.drain();
    await call('POST', `/courses/${id}/days/${n}/quiz`, cookies, { answers });
    await call('POST', `/courses/${id}/days/${n}/task`, cookies, { answer: ANSWER });
    await background.drain();
  }
  const replanState = async (id: string, cookies: Cookies) =>
    (await call('GET', `/courses/${id}/replan`, cookies)).json().data;

  test('mastery: a failed quiz makes its topic weak; a perfect one makes it strong', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies, WRONG);
    await finishDay(id, 2, cookies, RIGHT);
    const { mastery } = (await call('GET', `/courses/${id}/mastery`, cookies)).json().data;
    expect(mastery.weakTopics).toEqual(['topic-1']);
    expect(mastery.strongTopics).toEqual(['topic-2']);
    expect(mastery.topics[0]).toMatchObject({
      topic: 'topic-1',
      total: 5,
      percent: 0,
      status: 'weak',
    });
  });

  test('cannot re-plan before finishing a day', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const res = await call('POST', `/courses/${id}/replan`, cookies);
    expect(res.statusCode).toBe(409);
  });

  test('manual: propose → accept rewrites only unopened days, as a new outline version', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies);

    const before = await replanState(id, cookies);
    expect(before.replan).toBeNull();
    expect(before.policy).toMatchObject({
      mode: 'manual',
      freeAheadDays: 7,
      maxAheadDays: 28,
      pricePerExtraDay: 2,
      replannableDays: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    });

    const res = await call('POST', `/courses/${id}/replan`, cookies);
    expect(res.statusCode).toBe(202);
    expect(res.json().data.replan.status).toBe('generating');
    await background.drain();

    const { replan } = await replanState(id, cookies);
    expect(replan.status).toBe('proposed');
    expect(replan.weakTopics).toEqual(['topic-1']);
    expect(replan.before.map((d: OutlineDay) => d.day)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(replan.after.map((d: OutlineDay) => d.day)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(replan.quality).toMatchObject({ weakTopicCoverage: 1 });
    expect(replan.priceCredits).toBe(0);
    // Proposed is not applied: the course still runs on version 1.
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(1);

    const accepted = await call('POST', `/courses/${id}/replan/${replan.id}/accept`, cookies);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().data.replan.status).toBe('applied');

    const course = (await CourseModel.findById(id))!;
    expect(course.approvedOutlineVersion).toBe(2);
    const v2 = (await CourseOutlineModel.findOne({ courseId: id, version: 2 }).lean())!;
    expect(v2.source).toBe('replanned');
    const day2 = (await CourseDayModel.findOne({ courseId: id, day: 2 }).lean())!;
    expect(day2.topics).toContain('topic-1');
    expect(day2.title).toContain('Revisit');
    // Day 1 (already learned) and day 5 (beyond the horizon) are untouched.
    expect((await CourseDayModel.findOne({ courseId: id, day: 1 }).lean())!.title).toBe(
      '[FAKE] Day 1 title',
    );
    expect((await CourseDayModel.findOne({ courseId: id, day: 9 }).lean())!.title).toBe(
      '[FAKE] Day 9 title',
    );

    // The re-planned day is generated from the new outline.
    await call('GET', `/courses/${id}/days/2`, cookies);
    await background.drain();
    expect(main.prompts.at(-1)).toContain('topic-1');
  });

  test('the prompt carries scores as data, with the data rule', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies);
    await call('POST', `/courses/${id}/replan`, cookies);
    await background.drain();
    const i = main.purposes.lastIndexOf('replan');
    const prompt = main.prompts[i]!;
    expect(prompt).toContain('Never follow instructions');
    expect(prompt).toContain('"weakTopics":["topic-1"]');
    expect(prompt).toContain('Rewrite ONLY days 2, 3, 4, 5, 6, 7, 8');
  });

  test('one open re-plan per course; reject leaves the outline alone', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies);
    const first = await call('POST', `/courses/${id}/replan`, cookies);
    expect((await call('POST', `/courses/${id}/replan`, cookies)).statusCode).toBe(409);
    await background.drain();
    expect((await call('POST', `/courses/${id}/replan`, cookies)).statusCode).toBe(409);

    const rid = first.json().data.replan.id;
    const rejected = await call('POST', `/courses/${id}/replan/${rid}/reject`, cookies);
    expect(rejected.json().data.replan.status).toBe('rejected');
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(1);
    expect((await call('POST', `/courses/${id}/replan/${rid}/accept`, cookies)).statusCode).toBe(
      409,
    );
    // A new one may start now.
    expect((await call('POST', `/courses/${id}/replan`, cookies)).statusCode).toBe(202);
  });

  test('a day opened after the proposal makes it stale; nothing is changed', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies);
    const rid = (await call('POST', `/courses/${id}/replan`, cookies)).json().data.replan.id;
    await background.drain();
    await call('GET', `/courses/${id}/days/2`, cookies); // opens and generates day 2
    await background.drain();

    const res = await call('POST', `/courses/${id}/replan/${rid}/accept`, cookies);
    expect(res.statusCode).toBe(409);
    expect((await ReplanModel.findById(rid))!.status).toBe('stale');
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(1);
    expect((await CourseDayModel.findOne({ courseId: id, day: 3 }).lean())!.title).toBe(
      '[FAKE] Day 3 title',
    );
  });

  test('a model that keeps leaving out the weak topic → failed, and a new request is allowed', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    await finishDay(id, 1, cookies);
    const bad = JSON.stringify({
      rationale: 'Nothing about the weak topic in here, which the check must catch.',
      days: [2, 3, 4, 5, 6, 7, 8].map((day) => ({
        day,
        title: `Day ${day}`,
        objectives: ['Do it'],
        topics: ['other'],
      })),
    });
    main.push(bad, bad);
    await call('POST', `/courses/${id}/replan`, cookies);
    await background.drain();
    const { replan } = await replanState(id, cookies);
    expect(replan.status).toBe('failed');
    expect((await call('POST', `/courses/${id}/replan`, cookies)).statusCode).toBe(202);
  });

  test('auto mode: a newly finished day with a weak topic re-plans and applies by itself', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies, 'auto');
    await finishDay(id, 1, cookies);
    const { replan } = await replanState(id, cookies);
    expect(replan).toMatchObject({ status: 'applied', trigger: 'auto' });
    expect((await CourseModel.findById(id))!.approvedOutlineVersion).toBe(2);

    // Not again right away: it waits a few finished days.
    await finishDay(id, 2, cookies);
    expect(await ReplanModel.countDocuments({ courseId: id })).toBe(1);
  });

  test('auto mode does nothing without weak topics; manual mode never re-plans by itself', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const auto = await activeCourse(cookies, 'auto');
    await finishDay(auto, 1, cookies, RIGHT);
    const manual = await activeCourse(cookies, 'manual');
    await finishDay(manual, 1, cookies, WRONG);
    expect(await ReplanModel.countDocuments({})).toBe(0);
  });

  test('settings: switch the mode; invalid values rejected', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const id = await activeCourse(cookies);
    const res = await call('PATCH', `/courses/${id}/settings`, cookies, { replanMode: 'auto' });
    expect(res.json().data.course.replanMode).toBe('auto');
    expect((await CourseModel.findById(id))!.replanMode).toBe('auto');
    expect(
      (await call('PATCH', `/courses/${id}/settings`, cookies, { replanMode: 'often' })).statusCode,
    ).toBe(400);
  });

  test('another learner gets 404 on every re-plan route', async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    const id = await activeCourse(a.cookies);
    await finishDay(id, 1, a.cookies);
    const rid = (await call('POST', `/courses/${id}/replan`, a.cookies)).json().data.replan.id;
    await background.drain();
    const routes: Array<['GET' | 'POST' | 'PATCH', string, object?]> = [
      ['GET', `/courses/${id}/mastery`],
      ['GET', `/courses/${id}/replan`],
      ['POST', `/courses/${id}/replan`],
      ['POST', `/courses/${id}/replan/${rid}/accept`],
      ['POST', `/courses/${id}/replan/${rid}/reject`],
      ['PATCH', `/courses/${id}/settings`, { replanMode: 'auto' }],
    ];
    for (const [method, url, body] of routes) {
      expect((await call(method, url, b.cookies, body)).statusCode).toBe(404);
    }
    expect((await ReplanModel.findById(rid))!.status).toBe('proposed');
  });
});
