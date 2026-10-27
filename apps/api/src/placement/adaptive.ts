import {
  PLACEMENT_MAX_QUESTIONS,
  PLACEMENT_MIN_QUESTIONS,
  type PlacementLevel,
  type PlacementResult,
} from '@ricfey/shared';

export type BankItem = { qid: string; difficulty: number; topic: string };
/**
 * `target` is the staircase difficulty we aimed for; `difficulty` is the question actually
 * asked. They differ when the bank has run out of questions at the target level.
 */
export type HistoryItem = {
  qid: string;
  difficulty: number;
  target: number;
  topic: string;
  correct: boolean;
};

export const START_DIFFICULTY = 3;

/** Harder after a correct answer, easier after a wrong one, within 1..5. */
export function nextDifficulty(current: number, correct: boolean): number {
  return Math.min(5, Math.max(1, current + (correct ? 1 : -1)));
}

/**
 * Next question at (or nearest to) the target difficulty. Among equals, prefer the topic
 * asked least so far, so the quiz samples the subject broadly. Deterministic.
 */
export function pickQuestion(
  bank: BankItem[],
  history: HistoryItem[],
  target: number,
): BankItem | null {
  const asked = new Set(history.map((h) => h.qid));
  const topicCount = new Map<string, number>();
  for (const h of history) topicCount.set(h.topic, (topicCount.get(h.topic) ?? 0) + 1);
  const candidates = bank.filter((b) => !asked.has(b.qid));
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) ||
      (topicCount.get(a.topic) ?? 0) - (topicCount.get(b.topic) ?? 0) ||
      a.difficulty - b.difficulty,
  )[0]!;
}

/**
 * Stop at 12 questions, or from 8 on once the staircase has settled: the last 4 targets
 * span at most one difficulty step. Also stop if the bank runs out.
 */
export function shouldStop(history: HistoryItem[], bankSize: number): boolean {
  if (history.length >= PLACEMENT_MAX_QUESTIONS || history.length >= bankSize) return true;
  if (history.length < PLACEMENT_MIN_QUESTIONS) return false;
  const last4 = history.slice(-4).map((h) => h.target);
  return Math.max(...last4) - Math.min(...last4) <= 1;
}

/**
 * Ability = mean of the next target after each of the last 4 answers: where the staircase
 * settled. Uses targets, not asked difficulties, so a thin bank doesn't distort it.
 */
export function placementResult(history: HistoryItem[]): PlacementResult {
  const last = history.slice(-4);
  const ability =
    last.reduce((s, h) => s + nextDifficulty(h.target, h.correct), 0) / Math.max(1, last.length);
  const level: PlacementLevel =
    ability < 2.5 ? 'foundation' : ability < 3.75 ? 'intermediate' : 'advanced';

  const byTopic = new Map<string, { right: number; total: number }>();
  for (const h of history) {
    const t = byTopic.get(h.topic) ?? { right: 0, total: 0 };
    t.total += 1;
    if (h.correct) t.right += 1;
    byTopic.set(h.topic, t);
  }
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];
  for (const [topic, { right, total }] of byTopic) {
    if (total >= 2 && right / total >= 0.75) strongTopics.push(topic);
    else if (right / total <= 0.5) weakTopics.push(topic);
  }
  return {
    level,
    ability: Math.round(ability * 100) / 100,
    strongTopics: strongTopics.sort(),
    weakTopics: weakTopics.sort(),
  };
}
