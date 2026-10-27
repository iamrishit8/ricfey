import { z } from 'zod';
import { OutlineDaySchema, type OutlineDay } from './course-outline';

/** manual = re-plan only when the learner asks; auto = after a finished day that shows weak topics. */
export const REPLAN_MODES = ['manual', 'auto'] as const;
export type ReplanMode = (typeof REPLAN_MODES)[number];

export const CourseSettingsSchema = z.object({ replanMode: z.enum(REPLAN_MODES) });
export type CourseSettings = z.infer<typeof CourseSettingsSchema>;

/** Below this share of quiz questions right, a topic is weak; at or above STRONG it is strong. */
export const WEAK_BELOW_PERCENT = 60;
export const STRONG_FROM_PERCENT = 85;
/** A topic needs this many answered questions before it can be called weak or strong. */
export const MASTERY_MIN_QUESTIONS = 2;
/** At most this many weak topics are handed to a re-plan (the lowest first). */
export const REPLAN_MAX_WEAK_TOPICS = 3;
/** A re-plan may rewrite this many upcoming days for free; each day beyond that costs credits. */
export const REPLAN_FREE_AHEAD_DAYS = 7;
export const REPLAN_MAX_AHEAD_DAYS = 28;
export const REPLAN_CREDITS_PER_EXTRA_DAY = 2;
/** Auto mode waits this many finished days after the last re-plan before re-planning again. */
export const AUTO_REPLAN_EVERY_DAYS = 3;

export type MasteryStatus = 'weak' | 'developing' | 'strong';

export type TopicMastery = {
  topic: string;
  correct: number;
  total: number;
  percent: number;
  status: MasteryStatus;
};

export type MasteryView = {
  topics: TopicMastery[];
  weakTopics: string[];
  strongTopics: string[];
};

export function masteryStatus(correct: number, total: number): MasteryStatus {
  if (total < MASTERY_MIN_QUESTIONS) return 'developing';
  const percent = (correct / total) * 100;
  if (percent < WEAK_BELOW_PERCENT) return 'weak';
  if (percent >= STRONG_FROM_PERCENT) return 'strong';
  return 'developing';
}

/** Credits for rewriting `days` upcoming days: the first 7 are free, then 2 per extra day. */
export function replanPrice(days: number): number {
  return Math.max(0, days - REPLAN_FREE_AHEAD_DAYS) * REPLAN_CREDITS_PER_EXTRA_DAY;
}

/** What the model returns: the rewritten days, same numbers, plus a short reason. */
export const ReplanOutputSchema = z.object({
  rationale: z
    .string()
    .min(20)
    .max(600)
    .describe('Two or three sentences to the learner: what changed and why, based on their scores'),
  days: z.array(OutlineDaySchema).min(1).max(REPLAN_MAX_AHEAD_DAYS),
});
export type ReplanOutput = z.infer<typeof ReplanOutputSchema>;

export const REPLAN_STATUSES = [
  'generating',
  'proposed',
  'applied',
  'rejected',
  'failed',
  'stale',
] as const;
export type ReplanStatus = (typeof REPLAN_STATUSES)[number];

export type ReplanQuality = {
  /** Share of the weak topics given to the model that appear in the rewritten days (0–1). */
  weakTopicCoverage: number;
  /** Share of the original days' topic tags still present after the rewrite (0–1). */
  topicsKept: number;
  /** Rewritten days whose title or topics changed. */
  daysChanged: number;
};

export type ReplanView = {
  id: string;
  status: ReplanStatus;
  trigger: 'learner' | 'auto';
  before: OutlineDay[];
  after: OutlineDay[] | null;
  rationale: string | null;
  weakTopics: string[];
  strongTopics: string[];
  quality: ReplanQuality | null;
  priceCredits: number;
  createdAt: string;
};

export type ReplanPolicy = {
  mode: ReplanMode;
  freeAheadDays: number;
  maxAheadDays: number;
  pricePerExtraDay: number;
  /** Upcoming days a re-plan could rewrite right now (never opened, not finished), in order. */
  replannableDays: number[];
};

export const ReplanRequestSchema = z.object({
  /** How many upcoming days to rewrite. Default: the free 7. */
  ahead: z.number().int().min(1).max(REPLAN_MAX_AHEAD_DAYS).default(REPLAN_FREE_AHEAD_DAYS),
});

/** Deterministic quality measures of a re-plan, stored with it. */
export function replanQuality(
  before: OutlineDay[],
  after: OutlineDay[],
  weakTopics: string[],
): ReplanQuality {
  const afterTopics = new Set(after.flatMap((d) => d.topics));
  const beforeTopics = new Set(before.flatMap((d) => d.topics));
  const kept = [...beforeTopics].filter((t) => afterTopics.has(t)).length;
  const changed = after.filter((d, i) => {
    const b = before[i];
    return !b || b.title !== d.title || b.topics.join() !== d.topics.join();
  }).length;
  return {
    weakTopicCoverage: weakTopics.length
      ? weakTopics.filter((t) => afterTopics.has(t)).length / weakTopics.length
      : 1,
    topicsKept: beforeTopics.size ? kept / beforeTopics.size : 1,
    daysChanged: changed,
  };
}
