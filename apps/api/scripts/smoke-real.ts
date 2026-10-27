/**
 * One course through every LLM step with the REAL provider, in-process:
 * placement bank → placement → outline → day 1 + self-check → task grading → re-plan.
 * Costs about 6 calls on GEMINI_MODEL and 1–2 on GEMINI_CHECK_MODEL (more if retries happen).
 *   bun run smoke:real                      (uses MONGODB_URI; llmCalls are logged there)
 * Writes the generated course to docs/samples/smoke/<date>.json for reading.
 */
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';
import { buildApp } from '../src/app';
import { RecordingBackground } from '../src/lib/background';
import { loadEnv } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';
import { createLlmProviders } from '../src/llm/factory';
import { MongoLlmUsageStore } from '../src/llm/usage-store';
import { CourseDayModel } from '../src/models/course-day';
import { CourseOutlineModel } from '../src/models/course-outline';
import { PlacementModel } from '../src/models/placement';
import { TaskAttemptModel } from '../src/models/task-attempt';
import { signedInUser } from '../src/test/helpers';

const env = loadEnv({ ...process.env, LLM_PROVIDER: 'gemini' });
await connectDb(env.MONGODB_URI, { autoIndex: true });
const background = new RecordingBackground();
const app = buildApp({
  deps: { background, llm: createLlmProviders(env, new MongoLlmUsageStore()) },
});
const { cookies } = await signedInUser(`smoke-${Date.now()}@example.com`);
const t0 = Date.now();
const say = (s: string) => console.info(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);
const inject = (method: 'GET' | 'POST', url: string, payload?: object) =>
  app.inject({ method, url, cookies, payload });

try {
  const created = await inject('POST', '/courses', {
    skill: 'Personal finance',
    depth: 'intermediate',
    weeks: 2,
    minutesPerDay: 20,
  });
  const id = created.json().data.course.id as string;
  await background.drain();
  let p = await PlacementModel.findOne({ courseId: id });
  say(`placement bank: ${p!.status} (${p!.bank.length} questions)`);
  if (p!.status !== 'ready') throw new Error('placement bank failed');

  // Answer like a learner who knows the basics: right at difficulty ≤ 2, wrong above.
  while (p!.status === 'ready') {
    const q = p!.bank.find((b) => b.qid === p!.currentQid)!;
    const answerIndex = q.difficulty <= 2 ? q.answerIndex : (q.answerIndex + 1) % q.options.length;
    await inject('POST', `/courses/${id}/placement/answer`, { questionId: q.qid, answerIndex });
    p = await PlacementModel.findOne({ courseId: id });
  }
  say(`placement: ${p!.history.length} questions → ${JSON.stringify(p!.result)}`);

  await background.drain();
  const outline = (await inject('GET', `/courses/${id}/outline`)).json().data.outline;
  say(`outline: ${outline.status}, ${outline.quote?.days} days, "${outline.outline?.title}"`);
  if (outline.status !== 'ready') throw new Error('outline failed');
  await inject('POST', `/courses/${id}/outline/approve`, { version: 1 });

  await inject('GET', `/courses/${id}/days/1`);
  await background.drain();
  const day = await CourseDayModel.findOne({ courseId: id, day: 1 }).lean();
  say(`day 1: ${day!.status}; self-check ${JSON.stringify(day!.selfCheck)}`);
  if (!day!.content) throw new Error('day generation failed');

  await inject('POST', `/courses/${id}/days/1/task`, {
    answer:
      'I would list my fixed costs first (rent, EMIs), then track variable spending for a month in a notebook, and move ₹2,000 to savings on payday before spending anything else.',
  });
  await background.drain();
  const task = await TaskAttemptModel.findOne({ courseId: id }).lean();
  say(
    `task grading: ${task!.status} ${task!.score}/${task!.maxScore}; missed ${JSON.stringify(task!.missedCriteria)}`,
  );

  // Fail day 1's quiz on purpose so its topics are weak, then ask for a re-plan.
  const key = (day!.content as { quiz: { questions: Array<{ answerIndex: number }> } }).quiz
    .questions;
  await inject('POST', `/courses/${id}/days/1/quiz`, {
    answers: key.map((q) => (q.answerIndex + 1) % 4),
  });
  await inject('POST', `/courses/${id}/replan`);
  await background.drain();
  const replan = (await inject('GET', `/courses/${id}/replan`)).json().data.replan;
  say(
    `re-plan: ${replan?.status}; weak ${JSON.stringify(replan?.weakTopics)}; quality ${JSON.stringify(replan?.quality)}`,
  );

  const out = resolve(import.meta.dir, '../../../docs/samples/smoke');
  await mkdir(out, { recursive: true });
  const file = join(out, `${new Date().toISOString().slice(0, 10)}-personal-finance.json`);
  await Bun.write(
    file,
    JSON.stringify(
      {
        placement: { result: p!.result, bank: p!.bank },
        outline: (await CourseOutlineModel.findOne({ courseId: id, version: 1 }).lean())!.outline,
        day1: { content: day!.content, selfCheck: day!.selfCheck },
        task: {
          answer: task!.answer,
          score: task!.score,
          maxScore: task!.maxScore,
          feedback: task!.feedback,
          missedCriteria: task!.missedCriteria,
        },
        replan,
      },
      null,
      2,
    ) + '\n',
  );
  say(`written ${file}`);
} catch (e) {
  console.error('FAILED:', (e as Error).message);
  process.exitCode = 1;
} finally {
  await mongoose.connection.db?.collection('users').deleteMany({ email: /^smoke-/ });
  await disconnectDb();
}
