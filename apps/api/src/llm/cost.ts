import type { LlmPurpose } from '@ricfey/shared';
import { estimateCostUsd } from './pricing';
import type { LlmCallStatus } from './types';

/** What gen:sample writes to usage.json for one sample course. */
export type SampleUsage = {
  skill: string;
  depth: string;
  weeks: number;
  daysPerWeek: number;
  provider: string;
  model: string;
  generatedAt: string;
  calls: Array<{
    purpose: LlmPurpose;
    attempt: number;
    status: LlmCallStatus;
    tokensIn: number;
    tokensOut: number;
    tokensThinking: number;
    latencyMs: number;
  }>;
};

type Tokens = { calls: number; tokensIn: number; tokensOut: number; tokensThinking: number };

export type SampleCost = {
  totalDays: number;
  outline: Tokens & { costUsd: number };
  day: Tokens & { costUsd: number };
  /** One day's content plus this day's share of the outline. */
  costPerCourseDayUsd: number;
  /** Outline scaled to 30 days (cost per outline-day × 30) plus 30 × day cost. */
  course30DaysUsd: number;
};

function sum(calls: SampleUsage['calls'], purpose: LlmPurpose): Tokens {
  const mine = calls.filter((c) => c.purpose === purpose);
  return {
    calls: mine.length,
    tokensIn: mine.reduce((s, c) => s + c.tokensIn, 0),
    tokensOut: mine.reduce((s, c) => s + c.tokensOut, 0),
    tokensThinking: mine.reduce((s, c) => s + c.tokensThinking, 0),
  };
}

/**
 * Cost of one sample at the prices in effect on `at`. Every call counts, including retries
 * and failed attempts, because they are billed too. Day 1 stands in for every day.
 */
export function costSample(usage: SampleUsage, at: Date): SampleCost {
  const cost = (t: Tokens) => {
    const c = estimateCostUsd({
      model: usage.model,
      tokensIn: t.tokensIn,
      tokensOut: t.tokensOut,
      at,
    });
    if (c === null) throw new Error(`No price for model "${usage.model}" in pricing.ts`);
    return c;
  };
  const totalDays = usage.weeks * usage.daysPerWeek;
  const outlineTokens = sum(usage.calls, 'course_outline');
  const dayTokens = sum(usage.calls, 'day_content');
  const outlineCost = cost(outlineTokens);
  const dayCost = cost(dayTokens);
  return {
    totalDays,
    outline: { ...outlineTokens, costUsd: outlineCost },
    day: { ...dayTokens, costUsd: dayCost },
    costPerCourseDayUsd: dayCost + outlineCost / totalDays,
    course30DaysUsd: (outlineCost / totalDays) * 30 + dayCost * 30,
  };
}
