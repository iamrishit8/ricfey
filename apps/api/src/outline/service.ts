import {
  CourseOutlineSchema,
  creditQuote,
  type CourseOutline,
  type OutlineEdit,
  type OutlineView,
} from '@ricfey/shared';
import type { Background } from '../lib/background';
import { AppError } from '../lib/errors';
import { generateOutline } from '../llm/course-generator';
import type { LlmProviders } from '../llm/providers';
import { CourseModel, type CourseDoc } from '../models/course';
import { CourseOutlineModel } from '../models/course-outline';

export type OutlineDeps = { llm: LlmProviders; background: Background; now: () => Date };

const STALE_MS = 5 * 60 * 1000;

/**
 * Start generating the outline unless it is already generating or done. The claim is one
 * atomic update on the course, so concurrent triggers start exactly one job.
 */
export async function startOutline(course: CourseDoc, deps: OutlineDeps): Promise<boolean> {
  const now = deps.now();
  const claimed = await CourseModel.findOneAndUpdate(
    {
      _id: course._id,
      status: 'outline',
      $or: [
        { outlineStatus: { $in: ['none', 'failed'] } },
        {
          outlineStatus: 'generating',
          outlineGenerationStartedAt: { $lt: new Date(now.getTime() - STALE_MS) },
        },
      ],
    },
    { $set: { outlineStatus: 'generating', outlineGenerationStartedAt: now } },
    { returnDocument: 'after' },
  );
  if (!claimed) return false;
  deps.background.run('course_outline', () => generateAndStore(claimed, deps));
  return true;
}

async function generateAndStore(course: CourseDoc, deps: OutlineDeps): Promise<void> {
  try {
    const { data } = await generateOutline(deps.llm.main, {
      skill: course.skill,
      depth: course.depth,
      weeks: course.weeks,
      daysPerWeek: course.daysPerWeek,
      minutesPerDay: course.minutesPerDay,
      placement: course.placement ?? null,
    });
    await CourseOutlineModel.create({
      courseId: course._id,
      userId: course.userId,
      version: 1,
      source: 'generated',
      outline: data,
    });
    await CourseModel.updateOne(
      { _id: course._id, outlineStatus: 'generating' },
      { $set: { outlineStatus: 'ready', currentOutlineVersion: 1 } },
    );
  } catch (err) {
    await CourseModel.updateOne(
      { _id: course._id, outlineStatus: 'generating' },
      { $set: { outlineStatus: 'failed' } },
    );
    throw err;
  }
}

function totalDays(o: CourseOutline): number {
  return o.weeks.reduce((n, w) => n + w.days.length, 0);
}

export async function getOutlineView(course: CourseDoc, version?: number): Promise<OutlineView> {
  const rows = await CourseOutlineModel.find({ courseId: course._id, userId: course.userId })
    .sort({ version: 1 })
    .select({ version: 1, source: 1, createdAt: 1 })
    .lean();
  const wanted = version ?? course.currentOutlineVersion ?? null;
  const row = wanted
    ? await CourseOutlineModel.findOne({
        courseId: course._id,
        userId: course.userId,
        version: wanted,
      }).lean()
    : null;
  if (version && !row) throw new AppError('NOT_FOUND', `Outline version ${version} not found`);
  const outline = row ? (row.outline as CourseOutline) : null;
  return {
    status: course.outlineStatus,
    version: row?.version ?? null,
    approvedVersion: course.approvedOutlineVersion ?? null,
    outline,
    quote: outline ? creditQuote(totalDays(outline), course.minutesPerDay) : null,
    versions: rows.map((r) => ({
      version: r.version,
      source: r.source,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  };
}

/** Apply a rename/remove/reorder edit to the current version, producing the next version. */
export function applyEdit(base: CourseOutline, edit: OutlineEdit): CourseOutline {
  const byNumber = new Map(base.weeks.flatMap((w) => w.days).map((d) => [d.day, d]));
  const used = new Set<number>();
  let dayNo = 0;
  const weeks = edit.weeks
    .filter((w) => w.days.length > 0) // a week emptied by removals disappears
    .map((w, wi) => ({
      week: wi + 1,
      theme: w.theme,
      days: w.days.map((d) => {
        const original = byNumber.get(d.fromDay);
        if (!original)
          throw new AppError(
            'VALIDATION_ERROR',
            `Day ${d.fromDay} is not in version ${edit.baseVersion}`,
          );
        if (used.has(d.fromDay))
          throw new AppError('VALIDATION_ERROR', `Day ${d.fromDay} appears twice`);
        used.add(d.fromDay);
        dayNo += 1;
        return {
          day: dayNo,
          title: d.title,
          objectives: original.objectives,
          topics: original.topics,
        };
      }),
    }));
  if (dayNo === 0) throw new AppError('VALIDATION_ERROR', 'Keep at least one day');
  const next = { ...base, weeks };
  const parsed = CourseOutlineSchema.safeParse(next);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'The edited outline is not valid', {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return parsed.data;
}

export async function editOutline(course: CourseDoc, edit: OutlineEdit): Promise<void> {
  if (course.status !== 'outline' || course.outlineStatus !== 'ready') {
    throw new AppError('CONFLICT', 'The outline can only be edited before it is approved');
  }
  if (edit.baseVersion !== course.currentOutlineVersion) {
    throw new AppError(
      'CONFLICT',
      'The outline changed since you loaded it. Reload and try again.',
    );
  }
  const base = await CourseOutlineModel.findOne({
    courseId: course._id,
    version: edit.baseVersion,
  }).lean();
  if (!base) throw new AppError('NOT_FOUND', 'Outline not found');
  const next = applyEdit(base.outline as CourseOutline, edit);
  const version = edit.baseVersion + 1;

  // Bump the version only if nobody else did first; the unique (courseId, version) index
  // backs this up if two edits race.
  const bumped = await CourseModel.updateOne(
    { _id: course._id, currentOutlineVersion: edit.baseVersion, status: 'outline' },
    { $set: { currentOutlineVersion: version } },
  );
  if (bumped.modifiedCount !== 1) {
    throw new AppError(
      'CONFLICT',
      'The outline changed since you loaded it. Reload and try again.',
    );
  }
  await CourseOutlineModel.create({
    courseId: course._id,
    userId: course.userId,
    version,
    source: 'edited',
    outline: next,
  });
  course.currentOutlineVersion = version;
}

/** Approve the current version. The course becomes active (days are created in P2-C3). */
export async function approveOutline(
  course: CourseDoc,
  version: number,
  now: Date,
): Promise<CourseOutline> {
  if (course.status !== 'outline' || course.outlineStatus !== 'ready') {
    throw new AppError('CONFLICT', 'There is no outline waiting for approval');
  }
  if (version !== course.currentOutlineVersion) {
    throw new AppError(
      'CONFLICT',
      'You can only approve the latest version. Reload and try again.',
    );
  }
  const row = await CourseOutlineModel.findOne({ courseId: course._id, version }).lean();
  if (!row) throw new AppError('NOT_FOUND', 'Outline not found');
  const outline = row.outline as CourseOutline;
  const updated = await CourseModel.findOneAndUpdate(
    { _id: course._id, status: 'outline', currentOutlineVersion: version },
    {
      $set: {
        status: 'active',
        approvedOutlineVersion: version,
        startedAt: now,
        title: outline.title,
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated)
    throw new AppError(
      'CONFLICT',
      'The outline changed since you loaded it. Reload and try again.',
    );
  Object.assign(course, {
    status: 'active',
    approvedOutlineVersion: version,
    startedAt: now,
    title: outline.title,
  });
  return outline;
}
