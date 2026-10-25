import type { ClientSession } from 'mongoose';
import {
  AUTO_REPLAN_EVERY_DAYS,
  CourseOutlineSchema,
  REPLAN_FREE_DAYS,
  REPLAN_MAX_WEAK_TOPICS,
  ReplanOutputSchema,
  masteryStatus,
  replanHorizon,
  replanPrice,
  replanQuality,
  type CourseOutline,
  type MasteryView,
  type OutlineDay,
  type ReplanPolicy,
  type ReplanQuality,
  type ReplanView,
} from '@ricfey/shared';
import { applyEntry, creditTransaction } from '../credits/service';
import type { Background } from '../lib/background';
import { AppError } from '../lib/errors';
import { parseId } from '../lib/ids';
import type { LlmProviders } from '../llm/providers';
import { CourseModel, type CourseDoc } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { CourseOutlineModel } from '../models/course-outline';
import { ReplanModel, type ReplanDoc } from '../models/replan';
import { topicScores } from '../progress/service';
import { replanPrompt } from './prompt';

export type ReplanDeps = { llm: LlmProviders; background: Background; now: () => Date };

const STALE_MS = 5 * 60 * 1000;

export async function courseMastery(course: CourseDoc): Promise<MasteryView> {
  const topics = (await topicScores(course)).map((t) => ({
    ...t,
    status: masteryStatus(t.correct, t.total),
  }));
  return {
    topics,
    // topicScores is sorted weakest first, so these are the lowest scores.
    weakTopics: topics
      .filter((t) => t.status === 'weak')
      .slice(0, REPLAN_MAX_WEAK_TOPICS)
      .map((t) => t.topic),
    strongTopics: topics.filter((t) => t.status === 'strong').map((t) => t.topic),
  };
}

function assertActive(course: CourseDoc): void {
  if (course.status !== 'active')
    throw new AppError('CONFLICT', 'Only a course in progress can be re-planned');
}

const daysCompleted = (course: CourseDoc) =>
  CourseDayModel.countDocuments({
    courseId: course._id,
    userId: course.userId,
    completedAt: { $ne: null },
  });

/**
 * Days a re-plan may rewrite: after the last day that has been opened or finished, never
 * generated, not finished. Content that exists is never rewritten under the learner.
 */
async function replannableDays(course: CourseDoc): Promise<number[]> {
  const days = await CourseDayModel.find({ courseId: course._id, userId: course.userId })
    .select({ day: 1, content: 1, completedAt: 1, status: 1 })
    .sort({ day: 1 })
    .lean();
  const touched = days.filter((d) => d.content !== null || d.completedAt || d.status !== 'locked');
  const after = touched.length ? Math.max(...touched.map((d) => d.day)) : 0;
  const open = days.filter((d) => d.day > after).map((d) => d.day);
  return open.slice(0, replanHorizon(days.length));
}

export async function replanPolicy(course: CourseDoc): Promise<ReplanPolicy> {
  const [completed, total, replannable] = await Promise.all([
    daysCompleted(course),
    CourseDayModel.countDocuments({ courseId: course._id, userId: course.userId }),
    replannableDays(course),
  ]);
  return {
    mode: course.replanMode,
    horizon: replanHorizon(total),
    freeDays: REPLAN_FREE_DAYS,
    priceNow: replanPrice(completed),
    replannableDays: replannable,
  };
}

async function approvedOutline(course: CourseDoc, session?: ClientSession) {
  const row = await CourseOutlineModel.findOne(
    { courseId: course._id, userId: course.userId, version: course.approvedOutlineVersion },
    null,
    { session },
  ).lean();
  if (!row) throw new AppError('NOT_FOUND', 'Approved outline not found');
  return row.outline as CourseOutline;
}

const outlineDays = (o: CourseOutline) => o.weeks.flatMap((w) => w.days);

/**
 * Start a re-plan of the next few unopened days. One open re-plan per course (unique partial
 * index); a generating one older than 5 minutes is abandoned so a new one can start.
 */
export async function requestReplan(
  course: CourseDoc,
  trigger: 'learner' | 'auto',
  deps: ReplanDeps,
): Promise<ReplanDoc> {
  assertActive(course);
  const now = deps.now();
  const [completed, days, mastery] = await Promise.all([
    daysCompleted(course),
    replannableDays(course),
    courseMastery(course),
  ]);
  if (completed === 0)
    throw new AppError(
      'CONFLICT',
      'Finish at least one day first, so there are scores to adapt to',
    );
  if (days.length === 0) throw new AppError('CONFLICT', 'There are no upcoming days left to adapt');

  await ReplanModel.updateMany(
    {
      courseId: course._id,
      open: true,
      status: 'generating',
      generationStartedAt: { $lt: new Date(now.getTime() - STALE_MS) },
    },
    { $set: { status: 'failed' }, $unset: { open: 1 } },
  );

  const outline = await approvedOutline(course);
  const wanted = new Set(days);
  const before = outlineDays(outline).filter((d) => wanted.has(d.day));
  let replan: ReplanDoc;
  try {
    replan = await ReplanModel.create({
      courseId: course._id,
      userId: course.userId,
      status: 'generating',
      open: true,
      trigger,
      generationStartedAt: now,
      baseOutlineVersion: course.approvedOutlineVersion!, // set at approval; the course is active
      before,
      weakTopics: mastery.weakTopics,
      strongTopics: mastery.strongTopics,
      daysCompletedAtRequest: completed,
      priceCredits: replanPrice(completed),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new AppError('CONFLICT', 'A re-plan for this course is already in progress');
    throw err;
  }
  deps.background.run('replan', () => generate(replan, course, outline, mastery, deps));
  return replan;
}

async function generate(
  replan: ReplanDoc,
  course: CourseDoc,
  outline: CourseOutline,
  mastery: MasteryView,
  deps: ReplanDeps,
): Promise<void> {
  const before = replan.before as OutlineDay[];
  const numbers = before.map((d) => d.day);
  const schema = ReplanOutputSchema.refine(
    (o) => o.days.length === numbers.length && o.days.every((d, i) => d.day === numbers[i]),
    { message: `days must be exactly ${numbers.join(', ')} in that order`, path: ['days'] },
  ).refine(
    (o) => {
      const tags = new Set(o.days.flatMap((d) => d.topics));
      return mastery.weakTopics.every((t) => tags.has(t));
    },
    {
      message: `every weak topic must appear as a topic tag: ${mastery.weakTopics.join(', ')}`,
      path: ['days'],
    },
  );
  try {
    const { data } = await deps.llm.main.generateStructured(
      schema,
      replanPrompt({
        outline,
        minutesPerDay: course.minutesPerDay,
        days: before,
        mastery: mastery.topics,
        weakTopics: mastery.weakTopics,
        strongTopics: mastery.strongTopics,
      }),
      'replan',
    );
    const proposed = await ReplanModel.findOneAndUpdate(
      { _id: replan._id, status: 'generating' },
      {
        $set: {
          status: 'proposed',
          after: data.days,
          rationale: data.rationale,
          quality: replanQuality(before, data.days, mastery.weakTopics),
        },
      },
      { returnDocument: 'after' },
    );
    if (!proposed || proposed.trigger !== 'auto') return;
    const fresh = await CourseModel.findById(course._id);
    if (!fresh) return;
    try {
      await applyReplan(fresh, proposed);
    } catch (err) {
      // Auto mode but not enough credits: leave it proposed for the learner to decide.
      if (!(err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS')) throw err;
    }
  } catch (err) {
    await ReplanModel.updateOne(
      { _id: replan._id, status: 'generating' },
      { $set: { status: 'failed' }, $unset: { open: 1 } },
    );
    throw err;
  }
}

/**
 * Apply a proposed re-plan in one transaction (charging its price, if any): a new outline version (source "replanned")
 * becomes the approved one, and the rewritten days' entries are updated. If any of those days
 * was opened or finished in the meantime, nothing changes and the re-plan is marked stale.
 */
export async function applyReplan(course: CourseDoc, replan: ReplanDoc): Promise<void> {
  if (replan.status !== 'proposed' || !replan.after)
    throw new AppError('CONFLICT', 'This re-plan is not waiting for a decision');
  const after = replan.after as OutlineDay[];
  const numbers = after.map((d) => d.day);

  let stale = false;
  await creditTransaction(course.userId, async (session) => {
    stale = false;
    const untouched = await CourseDayModel.countDocuments(
      {
        courseId: course._id,
        day: { $in: numbers },
        content: null,
        completedAt: null,
        status: 'locked',
      },
      { session },
    );
    const fresh = await CourseModel.findById(course._id, null, { session });
    if (
      untouched !== numbers.length ||
      !fresh ||
      fresh.approvedOutlineVersion !== replan.baseOutlineVersion
    ) {
      stale = true;
      await ReplanModel.updateOne(
        { _id: replan._id, status: 'proposed' },
        { $set: { status: 'stale' }, $unset: { open: 1 } },
        { session },
      );
      return;
    }

    const base = await approvedOutline(fresh, session);
    const byDay = new Map(after.map((d) => [d.day, d]));
    const next = CourseOutlineSchema.parse({
      ...base,
      weeks: base.weeks.map((w) => ({ ...w, days: w.days.map((d) => byDay.get(d.day) ?? d) })),
    });
    const version = (fresh.currentOutlineVersion ?? 0) + 1;

    const marked = await ReplanModel.updateOne(
      { _id: replan._id, status: 'proposed' },
      { $set: { status: 'applied', appliedOutlineVersion: version }, $unset: { open: 1 } },
      { session },
    );
    if (marked.modifiedCount !== 1)
      throw new AppError('CONFLICT', 'This re-plan is not waiting for a decision');
    if (replan.priceCredits > 0) {
      await applyEntry(
        {
          userId: course.userId,
          delta: -replan.priceCredits,
          reason: 'replan',
          idempotencyKey: `replan:${replan.id as string}`,
          note: `Re-plan of days ${numbers[0]}–${numbers.at(-1)}`,
          courseId: course._id,
        },
        session,
      );
    }

    await CourseOutlineModel.create(
      [
        {
          courseId: course._id,
          userId: course.userId,
          version,
          source: 'replanned',
          outline: next,
        },
      ],
      { session },
    );
    await CourseModel.updateOne(
      { _id: course._id },
      { $set: { currentOutlineVersion: version, approvedOutlineVersion: version } },
      { session },
    );
    for (const d of after) {
      await CourseDayModel.updateOne(
        { courseId: course._id, day: d.day, content: null },
        { $set: { title: d.title, objectives: d.objectives, topics: d.topics } },
        { session },
      );
    }
    course.currentOutlineVersion = version;
    course.approvedOutlineVersion = version;
  });
  if (stale)
    throw new AppError(
      'CONFLICT',
      'Some of these days were opened since the re-plan was made. Ask for a new re-plan.',
    );
}

export async function loadReplan(course: CourseDoc, rawId: unknown): Promise<ReplanDoc> {
  const replan = await ReplanModel.findOne({
    _id: parseId(rawId),
    courseId: course._id,
    userId: course.userId,
  });
  if (!replan) throw new AppError('NOT_FOUND', 'Re-plan not found');
  return replan;
}

export async function rejectReplan(replan: ReplanDoc): Promise<ReplanDoc> {
  const updated = await ReplanModel.findOneAndUpdate(
    { _id: replan._id, status: 'proposed' },
    { $set: { status: 'rejected' }, $unset: { open: 1 } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('CONFLICT', 'This re-plan is not waiting for a decision');
  return updated;
}

export async function latestReplan(course: CourseDoc): Promise<ReplanDoc | null> {
  return ReplanModel.findOne({ courseId: course._id, userId: course.userId }).sort({
    createdAt: -1,
    _id: -1,
  });
}

/**
 * Auto mode: after a day is newly finished, re-plan if there are weak topics and enough days
 * have passed since the last applied re-plan. Never throws: a skipped auto re-plan is fine.
 */
export async function maybeAutoReplan(course: CourseDoc, deps: ReplanDeps): Promise<boolean> {
  if (course.replanMode !== 'auto' || course.status !== 'active') return false;
  const mastery = await courseMastery(course);
  if (mastery.weakTopics.length === 0) return false;
  const [completed, last] = await Promise.all([
    daysCompleted(course),
    ReplanModel.findOne({ courseId: course._id, status: 'applied' }).sort({ createdAt: -1 }),
  ]);
  if (last && completed - last.daysCompletedAtRequest < AUTO_REPLAN_EVERY_DAYS) return false;
  try {
    await requestReplan(course, 'auto', deps);
    return true;
  } catch (err) {
    if (err instanceof AppError && err.code === 'CONFLICT') return false;
    throw err;
  }
}

export function toReplanView(r: ReplanDoc): ReplanView {
  return {
    id: r.id as string,
    status: r.status,
    trigger: r.trigger,
    before: r.before as OutlineDay[],
    after: (r.after as OutlineDay[] | null) ?? null,
    rationale: r.rationale ?? null,
    weakTopics: [...r.weakTopics],
    strongTopics: [...r.strongTopics],
    quality: (r.quality as ReplanQuality | null) ?? null,
    priceCredits: r.priceCredits,
    createdAt: (r.get('createdAt') as Date).toISOString(),
  };
}
