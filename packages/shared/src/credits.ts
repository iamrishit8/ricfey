import type { CourseDepth } from './course';

// Credits: the unit learners pay in. A course is bought once, with credits; credits are bought
// in rupee packs. Constants here are the only place prices live (see docs/pricing.md).

/** Granted once, when a learner's account first touches credits (at sign-up in practice). */
export const WELCOME_CREDITS = 100;

/** Credits per 15 minutes of daily study, per day of the course, before the depth factor. */
export const CREDITS_PER_15_MIN_DAY = 4;

export const DEPTH_PRICE_FACTOR: Record<CourseDepth, number> = {
  intro: 1,
  working: 1.25,
  deep: 1.5,
};

/**
 * One-time price of a course, in credits: days × ⌈minutes ÷ 15⌉ × 4 × depth factor, rounded to
 * the nearest 10 (never below 10). Charged when the learner buys (approves) the roadmap.
 */
export function coursePrice(days: number, minutesPerDay: number, depth: CourseDepth): number {
  const raw =
    days * Math.ceil(minutesPerDay / 15) * CREDITS_PER_15_MIN_DAY * DEPTH_PRICE_FACTOR[depth];
  return Math.max(10, Math.round(raw / 10) * 10);
}

export const CREDIT_REASONS = ['welcome', 'purchase', 'course', 'replan', 'adjustment'] as const;
export type CreditReason = (typeof CREDIT_REASONS)[number];

export type CreditEntryView = {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: CreditReason;
  note: string;
  createdAt: string;
};

export type CreditsView = { balance: number; entries: CreditEntryView[] };
