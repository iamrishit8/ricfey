import type { CourseDepth } from './course';

// Credits: the unit learners pay in. A course is bought once, with credits; credits are bought
// in rupee packs. Constants here are the only place prices live (see docs/pricing.md).

/** Granted once, when a learner's account first touches credits (at sign-up in practice). */
export const WELCOME_CREDITS = 100;

/** Credits per 15 minutes of daily study, per day of the course, before the depth factor. */
export const CREDITS_PER_15_MIN_DAY = 4;

export const DEPTH_PRICE_FACTOR: Record<CourseDepth, number> = {
  basic: 1,
  intermediate: 1.25,
  advanced: 1.5,
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

/** A ready-made gallery course costs this share of what a custom one would (no writing cost, no re-plans). */
export const GALLERY_PRICE_FACTOR = 0.6;

/** Price of a gallery course, fixed when it is published: 60 % of the custom price, nearest 10 (min 10). */
export function galleryPrice(days: number, minutesPerDay: number, depth: CourseDepth): number {
  const custom = coursePrice(days, minutesPerDay, depth);
  return Math.max(10, Math.round((custom * GALLERY_PRICE_FACTOR) / 10) * 10);
}

export const CREDIT_REASONS = [
  'welcome',
  'purchase',
  'course',
  'gallery',
  'replan',
  'adjustment',
] as const;
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
