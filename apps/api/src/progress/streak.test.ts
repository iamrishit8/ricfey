import { describe, expect, test } from 'bun:test';
import { indiaDateKey, streaks } from './streak';

const ist = (date: string, time = '10:00') => new Date(`${date}T${time}:00+05:30`);

describe('streaks', () => {
  const now = ist('2026-10-20', '09:00');

  test('nothing done', () => {
    expect(streaks([], now)).toEqual({ current: 0, longest: 0 });
  });

  test('counts back from today, several completions a day count once', () => {
    const c = [
      ist('2026-10-18'),
      ist('2026-10-19'),
      ist('2026-10-20', '08:00'),
      ist('2026-10-20', '08:30'),
    ];
    expect(streaks(c, now)).toEqual({ current: 3, longest: 3 });
  });

  test('not done today yet: counts back from yesterday', () => {
    expect(streaks([ist('2026-10-18'), ist('2026-10-19')], now)).toEqual({
      current: 2,
      longest: 2,
    });
  });

  test('a gap resets the current streak but not the longest', () => {
    const c = [
      ist('2026-10-10'),
      ist('2026-10-11'),
      ist('2026-10-12'),
      ist('2026-10-14'),
      ist('2026-10-20'),
    ];
    expect(streaks(c, now)).toEqual({ current: 1, longest: 3 });
    expect(streaks([ist('2026-10-17')], now).current).toBe(0);
  });

  test('India midnight is the boundary, not UTC', () => {
    // 23:50 IST on the 19th is 18:20 UTC on the 19th; 00:10 IST on the 20th is still the 19th in UTC
    expect(indiaDateKey(ist('2026-10-19', '23:50'))).toBe('2026-10-19');
    expect(indiaDateKey(ist('2026-10-20', '00:10'))).toBe('2026-10-20');
  });
});
