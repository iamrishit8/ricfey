import { describe, expect, test } from 'bun:test';
import { masteryStatus, replanHorizon, replanPrice, replanQuality } from './replan';

describe('re-plan rules', () => {
  test('mastery needs 2 answers; weak below 60%, strong from 85%', () => {
    expect(masteryStatus(0, 1)).toBe('developing');
    expect(masteryStatus(1, 2)).toBe('weak');
    expect(masteryStatus(3, 5)).toBe('developing');
    expect(masteryStatus(17, 20)).toBe('strong');
  });

  test('horizon is about a quarter of the course, 3 to 10 days', () => {
    expect(replanHorizon(5)).toBe(3);
    expect(replanHorizon(20)).toBe(5);
    expect(replanHorizon(30)).toBe(8);
    expect(replanHorizon(60)).toBe(10);
  });

  test('free until 7 days are finished', () => {
    expect(replanPrice(0)).toBe(0);
    expect(replanPrice(6)).toBe(0);
    expect(replanPrice(7)).toBe(2);
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
