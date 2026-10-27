import { describe, expect, test } from 'bun:test';
import { costSample, type SampleUsage } from './cost';

const call = (
  purpose: 'course_outline' | 'day_content',
  tokensIn: number,
  tokensOut: number,
  attempt = 1,
) => ({
  purpose,
  attempt,
  status: 'ok' as const,
  tokensIn,
  tokensOut,
  tokensThinking: 0,
  latencyMs: 1,
});

const usage: SampleUsage = {
  skill: 'Python',
  depth: 'intermediate',
  weeks: 4,
  daysPerWeek: 5,
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  generatedAt: '2026-10-18T00:00:00Z',
  calls: [call('course_outline', 1_000, 4_000), call('day_content', 2_000, 6_000)],
};

describe('costSample', () => {
  const after = costSample(usage, new Date('2027-01-01T00:00:00Z'));

  test('per course-day = day cost + outline share, at 2027 prices', () => {
    const outline = (1_000 * 1.5 + 4_000 * 7.5) / 1e6; // 0.0315
    const day = (2_000 * 1.5 + 6_000 * 7.5) / 1e6; // 0.048
    expect(after.totalDays).toBe(20);
    expect(after.costPerCourseDayUsd).toBeCloseTo(day + outline / 20, 10);
    expect(after.course30DaysUsd).toBeCloseTo((outline / 20) * 30 + day * 30, 10);
  });

  test("today's price is exactly half for 3.8 flash", () => {
    const before = costSample(usage, new Date('2026-10-18T00:00:00Z'));
    expect(before.course30DaysUsd * 2).toBeCloseTo(after.course30DaysUsd, 10);
  });

  test('retries are counted, because they are billed', () => {
    const withRetry = { ...usage, calls: [...usage.calls, call('day_content', 2_000, 6_000, 2)] };
    const c = costSample(withRetry, new Date('2027-01-01T00:00:00Z'));
    expect(c.day.calls).toBe(2);
    expect(c.day.costUsd).toBeCloseTo(after.day.costUsd * 2, 10);
  });

  test('an unpriced model fails loudly', () => {
    expect(() => costSample({ ...usage, model: 'gemini-9' }, new Date())).toThrow(
      'No price for model',
    );
  });
});
