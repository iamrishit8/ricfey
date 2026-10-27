import { z } from 'zod';
import { COURSE_DEPTHS, type CourseDepth } from './course';
import type { CourseOutline } from './schemas/course-outline';

/** A completed custom course that passed the quality checks, offered to other learners. */
export type GallerySummary = {
  id: string;
  skill: string;
  title: string;
  summary: string;
  depth: CourseDepth;
  weeks: number;
  minutesPerDay: number;
  days: number;
  topics: string[];
  priceCredits: number;
  completions: number;
};

export type GalleryDetail = GallerySummary & {
  /** The roadmap: weeks, days, objectives, topics. Lessons are not previewed. */
  outline: CourseOutline;
  /** The caller's own copy of this course, if they already bought it. */
  ownedCourseId: string | null;
};

export const GalleryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  depth: z.enum(COURSE_DEPTHS).optional(),
  minWeeks: z.coerce.number().int().min(1).max(12).optional(),
  maxWeeks: z.coerce.number().int().min(1).max(12).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});
export type GalleryQuery = z.infer<typeof GalleryQuerySchema>;
