import { describe, expect, test } from 'bun:test';
import {
  nextDifficulty,
  pickQuestion,
  placementResult,
  shouldStop,
  START_DIFFICULTY,
  type BankItem,
  type HistoryItem,
} from './adaptive';

// 3 questions per difficulty, topics a..c
const bank: BankItem[] = [1, 2, 3, 4, 5].flatMap((d) =>
  ['a', 'b', 'c'].map((t) => ({ qid: `d${d}${t}`, difficulty: d, topic: t })),
);

/** Simulate a learner who answers correctly iff difficulty <= skill. */
function simulate(skill: number) {
  const history: HistoryItem[] = [];
  let difficulty = START_DIFFICULTY;
  while (!shouldStop(history, bank.length)) {
    const q = pickQuestion(bank, history, difficulty)!;
    const correct = q.difficulty <= skill;
    history.push({
      qid: q.qid,
      difficulty: q.difficulty,
      target: difficulty,
      topic: q.topic,
      correct,
    });
    difficulty = nextDifficulty(difficulty, correct);
  }
  return history;
}

describe('adaptive placement', () => {
  test('harder after correct, easier after wrong, bounded 1..5', () => {
    expect(nextDifficulty(3, true)).toBe(4);
    expect(nextDifficulty(3, false)).toBe(2);
    expect(nextDifficulty(5, true)).toBe(5);
    expect(nextDifficulty(1, false)).toBe(1);
  });

  test('never repeats a question and spreads topics', () => {
    const h = simulate(3);
    expect(new Set(h.map((x) => x.qid)).size).toBe(h.length);
    const first3 = h.slice(0, 3).map((x) => x.topic);
    expect(new Set(first3).size).toBeGreaterThan(1);
  });

  test('asks between 8 and 12 questions', () => {
    for (const skill of [0, 1, 2, 3, 4, 5]) {
      const n = simulate(skill).length;
      expect(n).toBeGreaterThanOrEqual(8);
      expect(n).toBeLessThanOrEqual(12);
    }
  });

  test('levels track the simulated learner', () => {
    // skill = highest difficulty the simulated learner answers correctly
    expect(placementResult(simulate(0)).level).toBe('foundation');
    expect(placementResult(simulate(1)).level).toBe('foundation');
    expect(placementResult(simulate(2)).level).toBe('intermediate');
    expect(placementResult(simulate(3)).level).toBe('intermediate');
    expect(placementResult(simulate(4)).level).toBe('advanced');
    expect(placementResult(simulate(5)).level).toBe('advanced');
  });

  test('falls back to the nearest difficulty when a level runs out', () => {
    const tiny: BankItem[] = [
      { qid: 'x', difficulty: 1, topic: 'a' },
      { qid: 'y', difficulty: 5, topic: 'a' },
    ];
    expect(pickQuestion(tiny, [], 2)?.qid).toBe('x');
    expect(pickQuestion(tiny, [], 4)?.qid).toBe('y');
  });

  test('strong and weak topics', () => {
    const h: HistoryItem[] = [
      { qid: '1', difficulty: 3, target: 3, topic: 'loops', correct: true },
      { qid: '2', difficulty: 3, target: 3, topic: 'loops', correct: true },
      { qid: '3', difficulty: 3, target: 3, topic: 'types', correct: false },
      { qid: '4', difficulty: 3, target: 3, topic: 'types', correct: true },
      { qid: '5', difficulty: 3, target: 3, topic: 'io', correct: true },
    ];
    expect(placementResult(h)).toMatchObject({ strongTopics: ['loops'], weakTopics: ['types'] });
  });
});
