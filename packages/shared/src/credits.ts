// Credits: the unit learners pay in. Bought in packs (INR via Razorpay), spent per course day.

/** Granted once per learner, on first use. Enough for about 15 days at 30 minutes. */
export const WELCOME_CREDITS = 30;

/** A course day costs ⌈minutes per day ÷ 15⌉ credits, charged the first time it is opened. */
export function creditsPerDay(minutesPerDay: number): number {
  return Math.ceil(minutesPerDay / 15);
}

export const CREDIT_REASONS = ['welcome', 'purchase', 'day', 'replan', 'adjustment'] as const;
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
