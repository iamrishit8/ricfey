import { describe, expect, test } from 'bun:test';
import { isUnlocked, startOfIndiaDay, unlockDate } from './schedule';

describe('schedule (India time)', () => {
  test('start of the India day', () => {
    // 2026-10-20 23:00 IST = 17:30 UTC → midnight IST 2026-10-20 = 2026-10-19T18:30Z
    expect(startOfIndiaDay(new Date('2026-10-20T17:30:00Z')).toISOString()).toBe(
      '2026-10-19T18:30:00.000Z',
    );
    // 2026-10-21 00:30 IST = 2026-10-20T19:00Z → already the 21st in India
    expect(startOfIndiaDay(new Date('2026-10-20T19:00:00Z')).toISOString()).toBe(
      '2026-10-20T18:30:00.000Z',
    );
  });

  test('5 days a week: days 1–5 consecutive, day 6 a week after day 1', () => {
    const start = new Date('2026-10-20T04:00:00Z'); // 09:30 IST on 20 Oct
    const d = (n: number) => unlockDate(start, n, 5).toISOString();
    expect(d(1)).toBe('2026-10-19T18:30:00.000Z'); // 20 Oct 00:00 IST
    expect(d(5)).toBe('2026-10-23T18:30:00.000Z'); // 24 Oct
    expect(d(6)).toBe('2026-10-26T18:30:00.000Z'); // 27 Oct = day 1 + 7
    expect(d(11)).toBe('2026-11-02T18:30:00.000Z'); // 3 Nov = day 1 + 14
  });

  test('7 days a week is every day', () => {
    const start = new Date('2026-10-20T04:00:00Z');
    expect(unlockDate(start, 8, 7).toISOString()).toBe('2026-10-26T18:30:00.000Z');
  });

  test('open if day 1, previous finished, or date arrived', () => {
    const unlockAt = new Date('2026-10-25T18:30:00Z');
    const before = new Date('2026-10-25T18:29:59Z');
    expect(isUnlocked({ day: 1, unlockAt, previousCompleted: false, now: before })).toBe(true);
    expect(isUnlocked({ day: 3, unlockAt, previousCompleted: false, now: before })).toBe(false);
    expect(isUnlocked({ day: 3, unlockAt, previousCompleted: true, now: before })).toBe(true);
    expect(isUnlocked({ day: 3, unlockAt, previousCompleted: false, now: unlockAt })).toBe(true);
  });
});
