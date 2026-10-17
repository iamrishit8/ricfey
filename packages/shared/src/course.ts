// How deep the learner wants to go. Used by the Course model and (C3) the generator.
export const COURSE_DEPTHS = ['intro', 'working', 'deep'] as const;
export type CourseDepth = (typeof COURSE_DEPTHS)[number];

export const COURSE_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;
