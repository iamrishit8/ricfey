import { describe, expect, test } from 'bun:test';
import { creditQuote, type CourseOutline } from '@ricfey/shared';
import { AppError } from '../lib/errors';
import { applyEdit } from './service';

const base: CourseOutline = {
  title: 'Python basics',
  summary: 'A short practical course on Python for everyday automation tasks.',
  skill: 'Python',
  depth: 'working',
  weeks: [
    {
      week: 1,
      theme: 'Foundations',
      days: [
        { day: 1, title: 'Variables', objectives: ['Assign values'], topics: ['variables'] },
        { day: 2, title: 'Loops', objectives: ['Write a for loop'], topics: ['loops'] },
      ],
    },
    {
      week: 2,
      theme: 'Data',
      days: [
        { day: 3, title: 'Lists', objectives: ['Index a list'], topics: ['lists'] },
        { day: 4, title: 'Dicts', objectives: ['Look up a key'], topics: ['dicts'] },
      ],
    },
  ],
};

const err = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  throw new Error('expected an error');
};

describe('applyEdit', () => {
  test('rename, remove and reorder; days renumbered; topics and objectives kept', () => {
    const next = applyEdit(base, {
      baseVersion: 1,
      weeks: [
        {
          theme: 'Start here',
          days: [
            { fromDay: 3, title: 'Lists first' },
            { fromDay: 1, title: 'Variables' },
          ],
        },
        { theme: 'Then', days: [{ fromDay: 4, title: 'Dicts' }] },
      ],
    });
    expect(next.weeks.map((w) => w.theme)).toEqual(['Start here', 'Then']);
    expect(next.weeks.flatMap((w) => w.days.map((d) => [d.day, d.title, d.topics[0]]))).toEqual([
      [1, 'Lists first', 'lists'],
      [2, 'Variables', 'variables'],
      [3, 'Dicts', 'dicts'],
    ]);
    expect(next.title).toBe(base.title);
  });

  test('an emptied week disappears and weeks renumber', () => {
    const next = applyEdit(base, {
      baseVersion: 1,
      weeks: [
        { theme: 'Foundations', days: [] },
        { theme: 'Data', days: [{ fromDay: 3, title: 'Lists' }] },
      ],
    });
    expect(next.weeks).toHaveLength(1);
    expect(next.weeks[0]).toMatchObject({ week: 1, theme: 'Data' });
  });

  test('unknown or duplicate days, or removing everything, are refused', () => {
    expect(
      err(() =>
        applyEdit(base, {
          baseVersion: 1,
          weeks: [{ theme: 'x', days: [{ fromDay: 9, title: 'x' }] }],
        }),
      ).message,
    ).toContain('Day 9 is not in version 1');
    expect(
      err(() =>
        applyEdit(base, {
          baseVersion: 1,
          weeks: [
            {
              theme: 'x',
              days: [
                { fromDay: 1, title: 'a' },
                { fromDay: 1, title: 'b' },
              ],
            },
          ],
        }),
      ).message,
    ).toContain('appears twice');
    expect(
      err(() => applyEdit(base, { baseVersion: 1, weeks: [{ theme: 'x', days: [] }] })).message,
    ).toBe('Keep at least one day');
  });
});

describe('creditQuote', () => {
  test('⌈minutes ÷ 15⌉ credits per day × days', () => {
    expect(creditQuote(20, 30)).toMatchObject({ creditsPerDay: 2, totalCredits: 40 });
    expect(creditQuote(20, 10)).toMatchObject({ creditsPerDay: 1, totalCredits: 20 });
    expect(creditQuote(20, 16)).toMatchObject({ creditsPerDay: 2, totalCredits: 40 });
    expect(creditQuote(5, 120)).toMatchObject({ creditsPerDay: 8, totalCredits: 40 });
  });
});
