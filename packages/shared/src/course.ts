// How deep the learner wants to go. Used by the Course model and (C3) the generator.
export const COURSE_DEPTHS = ['intro', 'working', 'deep'] as const;
export type CourseDepth = (typeof COURSE_DEPTHS)[number];

// placement → outline → active → completed. Intro-depth courses start at outline.
export const COURSE_STATUSES = ['placement', 'outline', 'active', 'completed', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;

export type PublicCourse = {
  id: string;
  skill: string;
  depth: CourseDepth;
  weeks: number;
  minutesPerDay: number;
  daysPerWeek: number;
  status: CourseStatus;
  title: string | null;
  placement: {
    level: 'foundation' | 'intermediate' | 'advanced';
    ability: number;
    strongTopics: string[];
    weakTopics: string[];
  } | null;
  outlineStatus: 'none' | 'generating' | 'ready' | 'failed';
  replanMode: 'manual' | 'auto';
  approvedOutlineVersion: number | null;
  /** Credits paid for the course, once; null until bought. */
  creditsPaid: number | null;
  startedAt: string | null;
  createdAt: string;
};
