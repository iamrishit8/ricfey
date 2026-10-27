/**
 * Fill the gallery with a finished course, written in-process by the model and published like any
 * learner's course. Used to seed demos (the gallery starts empty).
 *   bun run seed:gallery -- --skill "Music theory" --depth intermediate --weeks 2 --minutes 30
 *   bun run seed:gallery -- --skill Knitting --depth basic --weeks 1 --minutes 20 --provider fake
 * Costs model calls: about 1 (outline) + 2 to 4 per day (lesson, self-check, retries). With the
 * real provider mind the daily cap. A throwaway learner owns the course and is removed afterwards;
 * the gallery copy keeps nothing about them. Skips the placement quiz and the quizzes and tasks:
 * days are marked finished directly, then the usual quality checks run.
 */
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { z } from 'zod';
import { COURSE_DEPTHS, MAX_WEEKS, MIN_WEEKS } from '@ricfey/shared';
import { loadEnv } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';
import { applyEntry, creditTransaction } from '../src/credits/service';
import { openDay } from '../src/days/service';
import { galleryBlocker, publishToGallery } from '../src/gallery/service';
import { RecordingBackground } from '../src/lib/background';
import { createLlmProviders } from '../src/llm/factory';
import { MongoLlmUsageStore } from '../src/llm/usage-store';
import { CourseModel } from '../src/models/course';
import { CourseDayModel } from '../src/models/course-day';
import { GalleryCourseModel } from '../src/models/gallery-course';
import { UserModel } from '../src/models/user';
import { approveOutline, startOutline } from '../src/outline/service';

const Args = z.object({
  skill: z.string().min(2).max(120),
  depth: z.enum(COURSE_DEPTHS).default('basic'),
  weeks: z.coerce.number().int().min(MIN_WEEKS).max(MAX_WEEKS).default(2),
  minutes: z.coerce.number().int().min(10).max(120).default(30),
  provider: z.enum(['gemini', 'fake']).default('gemini'),
});

const { values } = parseArgs({
  options: {
    skill: { type: 'string' },
    depth: { type: 'string' },
    weeks: { type: 'string' },
    minutes: { type: 'string' },
    provider: { type: 'string' },
  },
});
const parsed = Args.safeParse(values);
if (!parsed.success) {
  console.error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(2);
}
const args = parsed.data;

const env = loadEnv({ ...process.env, LLM_PROVIDER: args.provider });
await connectDb(env.MONGODB_URI, { autoIndex: true });
const background = new RecordingBackground();
const llm = createLlmProviders(env, new MongoLlmUsageStore());
const deps = { llm, background, now: () => new Date() };
const t0 = Date.now();
const say = (s: string) => console.info(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

const user = await UserModel.create({
  email: `seed-${Date.now()}@example.com`,
  emailVerifiedAt: new Date(),
});
try {
  await creditTransaction(user._id, (session) =>
    applyEntry(
      {
        userId: user._id,
        delta: 100_000,
        reason: 'adjustment',
        idempotencyKey: `seed:${user._id.toString()}`,
        note: 'seed',
      },
      session,
    ),
  );
  const course = await CourseModel.create({
    userId: user._id,
    skill: args.skill,
    depth: args.depth,
    weeks: args.weeks,
    minutesPerDay: args.minutes,
    status: 'outline',
    replanMode: 'manual',
  });
  await startOutline(course, deps);
  await background.drain();
  const fresh = (await CourseModel.findById(course._id))!;
  if (fresh.outlineStatus !== 'ready') throw new Error('the outline could not be written');
  say(`outline ready (${fresh.weeks} weeks)`);
  await approveOutline(fresh, 1, new Date());

  const days = await CourseDayModel.find({ courseId: course._id }).sort({ day: 1 });
  for (const d of days) {
    await openDay(fresh, d.day, deps);
    await background.drain();
    const done = (await CourseDayModel.findById(d._id))!;
    // Mark it finished so the next day unlocks.
    await CourseDayModel.updateOne({ _id: d._id }, { $set: { completedAt: new Date() } });
    say(
      `day ${d.day}/${days.length}: ${done.status}${done.selfCheck?.issues?.length ? ` (${done.selfCheck.issues.length} self-check issues)` : ''}`,
    );
  }
  await CourseModel.updateOne({ _id: course._id }, { $set: { status: 'completed' } });
  const finished = (await CourseModel.findById(course._id))!;
  const blocker = await galleryBlocker(finished);
  if (blocker) {
    console.error(`Not published: ${blocker}. Days flagged by the self-check keep a course out.`);
    process.exitCode = 1;
  } else {
    const result = await publishToGallery(finished);
    say(result === 'published' ? 'published to the gallery' : `not published: ${result}`);
    if (result !== 'published') process.exitCode = 1;
  }
} catch (e) {
  console.error('FAILED:', (e as Error).message);
  process.exitCode = 1;
} finally {
  // The gallery copy stands alone; remove the throwaway learner and their course.
  await CourseDayModel.deleteMany({ userId: user._id });
  await mongoose.connection.db?.collection('courseOutlines').deleteMany({ userId: user._id });
  await CourseModel.deleteMany({ userId: user._id });
  await mongoose.connection.db?.collection('creditEntries').deleteMany({ userId: user._id });
  await mongoose.connection.db?.collection('creditAccounts').deleteMany({ userId: user._id });
  await UserModel.deleteOne({ _id: user._id });
  console.info(
    `gallery now holds ${await GalleryCourseModel.countDocuments({ status: 'live' })} course(s)`,
  );
  await disconnectDb();
}
