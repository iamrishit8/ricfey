import {
  SelfCheckSchema,
  creditsPerDay,
  toPublicContent,
  type CourseOutline,
  type DayContent,
  type DaySummary,
  type DayView,
  type SelfCheck,
} from '@ricfey/shared';
import { applyEntry, creditTransaction } from '../credits/service';
import type { Background } from '../lib/background';
import { AppError } from '../lib/errors';
import { generateDay } from '../llm/course-generator';
import type { LlmProviders } from '../llm/providers';
import type { CourseDoc } from '../models/course';
import { CourseDayModel, type CourseDayDoc } from '../models/course-day';
import { CourseOutlineModel } from '../models/course-outline';
import { isUnlocked, unlockDate } from './schedule';
import { selfCheckPrompt } from './self-check-prompt';

export type DayDeps = { llm: LlmProviders; background: Background; now: () => Date };

const STALE_MS = 5 * 60 * 1000;

/** One row per outline day, created at approval. Safe to call twice (unique index). */
export async function createDays(course: CourseDoc, outline: CourseOutline): Promise<void> {
  const startedAt = course.startedAt!;
  const rows = outline.weeks.flatMap((w) =>
    w.days.map((d) => ({
      courseId: course._id,
      userId: course.userId,
      day: d.day,
      week: w.week,
      title: d.title,
      objectives: d.objectives,
      topics: d.topics,
      unlockAt: unlockDate(startedAt, d.day, course.daysPerWeek),
      status: 'locked' as const,
    })),
  );
  try {
    await CourseDayModel.insertMany(rows, { ordered: false });
  } catch (err) {
    // Duplicate keys mean the days already exist (a retried approval); anything else is real.
    if ((err as { code?: number }).code !== 11000) throw err;
  }
}

async function approvedOutline(course: CourseDoc): Promise<CourseOutline> {
  const row = await CourseOutlineModel.findOne({
    courseId: course._id,
    userId: course.userId,
    version: course.approvedOutlineVersion,
  }).lean();
  if (!row) throw new AppError('NOT_FOUND', 'Approved outline not found');
  return row.outline as CourseOutline;
}

function assertActive(course: CourseDoc): void {
  if (course.status !== 'active' && course.status !== 'completed') {
    throw new AppError('CONFLICT', 'Approve the outline first');
  }
}

function summary(d: CourseDayDoc, unlocked: boolean): DaySummary {
  return {
    day: d.day,
    week: d.week,
    title: d.title,
    topics: [...d.topics],
    status: d.status,
    unlocked,
    unlockAt: d.unlockAt.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
    flagged: d.status === 'flagged',
  };
}

export async function listDays(course: CourseDoc, now: Date): Promise<DaySummary[]> {
  assertActive(course);
  const days = await CourseDayModel.find({ courseId: course._id, userId: course.userId }).sort({
    day: 1,
  });
  return days.map((d, i) =>
    summary(
      d,
      isUnlocked({
        day: d.day,
        unlockAt: d.unlockAt,
        previousCompleted: !!days[i - 1]?.completedAt,
        now,
      }),
    ),
  );
}

export async function loadDay(course: CourseDoc, n: number): Promise<CourseDayDoc> {
  const day = await CourseDayModel.findOne({ courseId: course._id, userId: course.userId, day: n });
  if (!day) throw new AppError('NOT_FOUND', 'Day not found');
  return day;
}

export async function assertDayUnlocked(
  course: CourseDoc,
  day: CourseDayDoc,
  now: Date,
): Promise<void> {
  const prev =
    day.day > 1
      ? await CourseDayModel.findOne({ courseId: course._id, day: day.day - 1 }).lean()
      : null;
  if (
    !isUnlocked({
      day: day.day,
      unlockAt: day.unlockAt,
      previousCompleted: !!prev?.completedAt,
      now,
    })
  ) {
    throw new AppError(
      'FORBIDDEN',
      `Day ${day.day} opens when you finish day ${day.day - 1}, or on its date.`,
      { unlockAt: day.unlockAt.toISOString() },
    );
  }
}

/**
 * Open a day: check it's unlocked, and the first time, start generating it. The claim is a
 * single conditional update (content still null, not already generating), so any number of
 * concurrent requests start exactly one generation. Lazy: nothing is generated until asked.
 */
export async function openDay(course: CourseDoc, n: number, deps: DayDeps): Promise<DayView> {
  assertActive(course);
  const now = deps.now();
  let day = await loadDay(course, n);
  await assertDayUnlocked(course, day, now);

  if (day.content === null) {
    // Claim and charge together: if the learner can't pay, the claim is rolled back. The charge
    // is keyed by course and day, so a retried or regenerated day is never charged twice.
    const claimed = await creditTransaction(course.userId, async (session) => {
      const c = await CourseDayModel.findOneAndUpdate(
        {
          _id: day._id,
          content: null,
          $or: [
            { status: { $in: ['locked', 'failed'] } },
            {
              status: 'generating',
              generationStartedAt: { $lt: new Date(now.getTime() - STALE_MS) },
            },
          ],
        },
        { $set: { status: 'generating', generationStartedAt: now } },
        { returnDocument: 'after', session },
      );
      if (!c) return null;
      await applyEntry(
        {
          userId: course.userId,
          delta: -creditsPerDay(course.minutesPerDay),
          reason: 'day',
          idempotencyKey: `day:${course.id as string}:${n}`,
          note: `Day ${n}: ${day.title}`.slice(0, 200),
          courseId: course._id,
        },
        session,
      );
      return c;
    });
    if (claimed) {
      day = claimed;
      deps.background.run('day_content', () => generateAndCheck(claimed, course, deps));
    }
  }
  return dayView(day);
}

export function dayView(day: CourseDayDoc): DayView {
  const content = day.content as DayContent | null;
  return {
    ...summary(day, true),
    objectives: [...day.objectives],
    // Quiz answers and explanations stay on the server until the quiz is submitted.
    content: content ? toPublicContent(content) : null,
  };
}

const passed = (c: SelfCheck) => c.verdict === 'pass' && c.coversObjectives && c.quizConsistent;

/**
 * Generate → self-check with the cheaper model → if it fails, regenerate once with the
 * reviewer's issues → check again → still failing: keep the second draft and flag the day.
 */
async function generateAndCheck(
  day: CourseDayDoc,
  course: CourseDoc,
  deps: DayDeps,
): Promise<void> {
  try {
    const outline = await approvedOutline(course);
    const entry = {
      day: day.day,
      title: day.title,
      objectives: [...day.objectives],
      topics: [...day.topics],
    };
    let issues: string[] | undefined;
    let content: DayContent | undefined;
    let check: SelfCheck | undefined;
    let attempts = 0;

    for (attempts = 1; attempts <= 2; attempts++) {
      content = (
        await generateDay(deps.llm.main, outline, day.day, {
          minutesPerDay: course.minutesPerDay,
          reviewerIssues: issues,
        })
      ).data;
      try {
        check = (
          await deps.llm.check.generateStructured(
            SelfCheckSchema,
            selfCheckPrompt(entry, content),
            'self_check',
          )
        ).data;
      } catch {
        check = {
          verdict: 'fail',
          coversObjectives: false,
          quizConsistent: false,
          issues: ['The self-check could not run.'],
        };
        break; // don't regenerate a lesson because the reviewer was unavailable
      }
      if (passed(check)) break;
      issues = check.issues.length
        ? check.issues
        : ['Rejected without details: re-check objectives and every quiz answer.'];
    }

    await CourseDayModel.updateOne(
      { _id: day._id, status: 'generating' },
      {
        $set: {
          content,
          status: passed(check!) ? 'ready' : 'flagged',
          selfCheck: { ...check!, attempts: Math.min(attempts, 2) },
        },
      },
    );
  } catch (err) {
    await CourseDayModel.updateOne(
      { _id: day._id, status: 'generating' },
      { $set: { status: 'failed' } },
    );
    throw err;
  }
}
