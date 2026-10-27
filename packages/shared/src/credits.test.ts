import { describe, expect, test } from 'bun:test';
import { CREDIT_PACKS } from './payments';
import { WELCOME_CREDITS, coursePrice } from './credits';

describe('course price', () => {
  test('days × ⌈minutes ÷ 15⌉ × 4 × depth factor, rounded to the nearest 10', () => {
    expect(coursePrice(10, 20, 'intro')).toBe(80); // 10 × 2 × 4
    expect(coursePrice(20, 30, 'working')).toBe(200); // 20 × 2 × 4 × 1.25
    expect(coursePrice(60, 60, 'deep')).toBe(1440); // 60 × 4 × 4 × 1.5
    expect(coursePrice(5, 15, 'intro')).toBe(20);
  });

  test('never below 10, and rounds to tens', () => {
    expect(coursePrice(1, 10, 'intro')).toBe(10);
    expect(coursePrice(9, 10, 'working')).toBe(50); // 9 × 1 × 4 × 1.25 = 45 → 50
    expect(coursePrice(7, 25, 'working')).toBe(70); // 7 × 2 × 4 × 1.25
  });

  test('deeper is dearer, longer is dearer', () => {
    expect(coursePrice(20, 30, 'deep')).toBeGreaterThan(coursePrice(20, 30, 'working'));
    expect(coursePrice(20, 30, 'working')).toBeGreaterThan(coursePrice(20, 30, 'intro'));
    expect(coursePrice(30, 30, 'intro')).toBeGreaterThan(coursePrice(20, 30, 'intro'));
  });
});

describe('packs', () => {
  test('more credits for the money as packs grow, and a new account can almost afford a short course', () => {
    const perCredit = CREDIT_PACKS.map((p) => p.pricePaise / p.credits);
    for (let i = 1; i < perCredit.length; i++)
      expect(perCredit[i]!).toBeLessThan(perCredit[i - 1]!);
    expect(WELCOME_CREDITS).toBe(100);
    expect(coursePrice(10, 20, 'intro')).toBeLessThanOrEqual(WELCOME_CREDITS);
  });
});
