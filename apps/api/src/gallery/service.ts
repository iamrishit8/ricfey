import type { Types } from 'mongoose';
import {
  CourseOutlineSchema,
  DayContentSchema,
  galleryPrice,
  type CourseOutline,
  type GalleryDetail,
  type GalleryQuery,
  type GallerySummary,
} from '@ricfey/shared';
import { applyEntry, creditTransaction } from '../credits/service';
import { unlockDate } from '../days/schedule';
import { AppError } from '../lib/errors';
import { parseId } from '../lib/ids';
import { CourseModel, type CourseDoc } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { CourseOutlineModel } from '../models/course-outline';
import { GalleryCourseModel, type GalleryCourseDoc } from '../models/gallery-course';
import { GalleryDayModel } from '../models/gallery-day';
import { ReportModel } from '../models/report';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Why a finished course may not go to the gallery, or null if it may. */
export async function galleryBlocker(course: CourseDoc): Promise<string | null> {
  if (course.source !== 'custom') return 'it is itself a gallery course';
  if (course.status !== 'completed') return 'it is not finished';
  const days = await CourseDayModel.find({ courseId: course._id, userId: course.userId })
    .select({ status: 1, content: 1 })
    .lean();
  if (days.length === 0) return 'it has no days';
  if (days.some((d) => d.content === null || d.status !== 'ready'))
    return 'a day was flagged by the self-check or is missing';
  if (await ReportModel.exists({ courseId: course._id, status: 'open' }))
    return 'a learner flagged a mistake that is still open';
  return null;
}

/**
 * Offer a finished course to other learners. Idempotent: one course per variant (skill, depth,
 * weeks, minutes a day); the first to finish is kept. Everything copied is re-validated, and
 * nothing about the learner (name, answers, scores) is stored.
 */
export async function publishToGallery(course: CourseDoc): Promise<'published' | string> {
  const blocker = await galleryBlocker(course);
  if (blocker) return blocker;

  const variantKey = [norm(course.skill), course.depth, course.weeks, course.minutesPerDay].join(
    '|',
  );
  if (await GalleryCourseModel.exists({ variantKey }))
    return 'this course is already in the gallery';

  const outlineRow = await CourseOutlineModel.findOne({
    courseId: course._id,
    userId: course.userId,
    version: course.approvedOutlineVersion,
  }).lean();
  if (!outlineRow) return 'its outline is missing';
  const outline = CourseOutlineSchema.parse(outlineRow.outline);
  const days = await CourseDayModel.find({ courseId: course._id, userId: course.userId })
    .sort({ day: 1 })
    .lean();
  const totalDays = outline.weeks.reduce((n, w) => n + w.days.length, 0);
  if (days.length !== totalDays) return 'its days do not match its outline';

  let gallery: GalleryCourseDoc;
  try {
    gallery = await GalleryCourseModel.create({
      skill: course.skill,
      variantKey,
      title: outline.title,
      summary: outline.summary,
      depth: course.depth,
      weeks: course.weeks,
      daysPerWeek: course.daysPerWeek,
      minutesPerDay: course.minutesPerDay,
      totalDays,
      topics: [...new Set(outline.weeks.flatMap((w) => w.days.flatMap((d) => d.topics)))],
      outline,
      priceCredits: galleryPrice(totalDays, course.minutesPerDay, course.depth),
      sourceCourseId: course._id,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return 'this course is already in the gallery';
    throw err;
  }
  await GalleryDayModel.insertMany(
    days.map((d) => ({
      galleryId: gallery._id,
      day: d.day,
      week: d.week,
      title: d.title,
      objectives: d.objectives,
      topics: d.topics,
      content: DayContentSchema.parse(d.content),
    })),
  );
  return 'published';
}

const toSummary = (g: {
  _id: Types.ObjectId;
  skill: string;
  title: string;
  summary: string;
  depth: GallerySummary['depth'];
  weeks: number;
  minutesPerDay: number;
  totalDays: number;
  topics: string[];
  priceCredits: number;
  completions: number;
}): GallerySummary => ({
  id: g._id.toString(),
  skill: g.skill,
  title: g.title,
  summary: g.summary,
  depth: g.depth,
  weeks: g.weeks,
  minutesPerDay: g.minutesPerDay,
  days: g.totalDays,
  topics: g.topics.slice(0, 8),
  priceCredits: g.priceCredits,
  completions: g.completions,
});

/** Mongo's text syntax treats quotes and a leading "-" specially; learners type neither on purpose. */
const safeSearch = (q: string) =>
  q
    .replace(/["\\]/g, ' ')
    .replace(/(^|\s)-+/g, '$1')
    .trim();

/**
 * Search the gallery. With a query, results are ranked by text relevance and an exact or
 * leading match on the skill is put first ("the most precise one"); without, the most completed.
 */
export async function searchGallery(query: GalleryQuery): Promise<GallerySummary[]> {
  const filter: Record<string, unknown> = { status: 'live' };
  if (query.depth) filter.depth = query.depth;
  if (query.minWeeks || query.maxWeeks)
    filter.weeks = {
      ...(query.minWeeks ? { $gte: query.minWeeks } : {}),
      ...(query.maxWeeks ? { $lte: query.maxWeeks } : {}),
    };
  const q = query.q ? safeSearch(query.q) : '';
  if (!q) {
    const rows = await GalleryCourseModel.find(filter)
      .sort({ completions: -1, createdAt: -1 })
      .limit(query.limit)
      .lean();
    return rows.map(toSummary);
  }
  const rows = await GalleryCourseModel.find(
    { ...filter, $text: { $search: q } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(query.limit * 2)
    .lean();
  const key = norm(q);
  const rank = (r: { skill: string; score?: number }) => {
    const skill = norm(r.skill);
    return (r.score ?? 0) + (skill === key ? 100 : skill.startsWith(key) ? 20 : 0);
  };
  return rows
    .map((r) => ({ r, rank: rank(r as { skill: string; score?: number }) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, query.limit)
    .map(({ r }) => toSummary(r));
}

async function loadLive(rawId: unknown): Promise<GalleryCourseDoc> {
  const g = await GalleryCourseModel.findOne({
    _id: parseId(rawId, 'Gallery course'),
    status: 'live',
  });
  if (!g) throw new AppError('NOT_FOUND', 'Gallery course not found');
  return g;
}

export async function galleryDetail(
  rawId: unknown,
  userId: Types.ObjectId,
): Promise<GalleryDetail> {
  const g = await loadLive(rawId);
  const owned = await CourseModel.findOne({ userId, galleryId: g._id, source: 'gallery' })
    .select({ _id: 1 })
    .lean();
  return {
    ...toSummary(g),
    outline: g.outline as CourseOutline,
    ownedCourseId: owned ? owned._id.toString() : null,
  };
}

/**
 * Buy a gallery course: charge its fixed price once and give the learner their own copy (own
 * schedule, progress, graded quizzes and tasks) over the same finished lessons. One transaction.
 */
export async function buyGalleryCourse(
  userId: Types.ObjectId,
  rawId: unknown,
  now: Date,
): Promise<CourseDoc> {
  const g = await loadLive(rawId);
  if (await CourseModel.exists({ userId, galleryId: g._id, source: 'gallery' }))
    throw new AppError('CONFLICT', 'You already have this course.');
  const lessons = await GalleryDayModel.find({ galleryId: g._id }).sort({ day: 1 }).lean();
  if (lessons.length !== g.totalDays)
    throw new AppError('SERVICE_UNAVAILABLE', 'This course is not available right now.');

  try {
    return await creditTransaction(userId, async (session) => {
      const [course] = await CourseModel.create(
        [
          {
            userId,
            skill: g.skill,
            depth: g.depth,
            weeks: g.weeks,
            minutesPerDay: g.minutesPerDay,
            daysPerWeek: g.daysPerWeek,
            status: 'active',
            title: g.title,
            startedAt: now,
            creditsPaid: g.priceCredits,
            outlineStatus: 'ready',
            currentOutlineVersion: 1,
            approvedOutlineVersion: 1,
            replanMode: 'manual',
            source: 'gallery',
            galleryId: g._id,
          },
        ],
        { session },
      );
      await applyEntry(
        {
          userId,
          delta: -g.priceCredits,
          reason: 'gallery',
          idempotencyKey: `gallery:${g._id.toString()}:${userId.toString()}`,
          note: `Course: ${g.title}`.slice(0, 200),
          courseId: course!._id,
        },
        session,
      );
      await CourseOutlineModel.create(
        [{ courseId: course!._id, userId, version: 1, source: 'gallery', outline: g.outline }],
        { session },
      );
      await CourseDayModel.insertMany(
        lessons.map((l) => ({
          courseId: course!._id,
          userId,
          day: l.day,
          week: l.week,
          title: l.title,
          objectives: l.objectives,
          topics: l.topics,
          unlockAt: unlockDate(now, l.day, g.daysPerWeek),
          status: 'ready',
          content: l.content,
        })),
        { session },
      );
      await GalleryCourseModel.updateOne({ _id: g._id }, { $inc: { buyers: 1 } }, { session });
      return course!;
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new AppError('CONFLICT', 'You already have this course.');
    throw err;
  }
}
