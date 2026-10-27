import { describe, expect, test } from 'bun:test';
import { masteryStatus, replanPrice, replanQuality } from './replan';

describe('re-plan rules', () => {
  test('mastery needs 2 answers; weak below 60%, strong from 85%', () => {
    expect(masteryStatus(0, 1)).toBe('developing');
    expect(masteryStatus(1, 2)).toBe('weak');
    expect(masteryStatus(3, 5)).toBe('developing');
    expect(masteryStatus(17, 20)).toBe('strong');
  });

  test('re-plan price: the first 7 days ahead are free, then 2 credits per extra day', () => {
    expect(replanPrice(1)).toBe(0);
    expect(replanPrice(7)).toBe(0);
    expect(replanPrice(8)).toBe(2);
    expect(replanPrice(28)).toBe(42);
  });

  test('quality: weak-topic coverage, topics kept, days changed', () => {
    const d = (day: number, title: string, topics: string[]) => ({
      day,
      title,
      objectives: ['x x x'],
      topics,
    });
    const before = [d(2, 'A', ['loops']), d(3, 'B', ['maps'])];
    const after = [d(2, 'A again', ['loops', 'vars']), d(3, 'B', ['maps'])];
    expect(replanQuality(before, after, ['vars', 'types'])).toEqual({
      weakTopicCoverage: 0.5,
      topicsKept: 1,
      daysChanged: 1,
    });
  });
});
