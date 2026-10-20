import type { LlmPurpose } from '@ricfey/shared';
import { fixtureDay, fixtureOutline } from './fake-fixtures';
import { parseRequestBlock } from './request-block';

/**
 * Answers every purpose with schema-valid placeholder JSON, using the prompt's <request>
 * block. Lets the whole app run offline (LLM_PROVIDER=fake) without spending quota.
 * Content is marked [FAKE] so nobody mistakes it for real teaching.
 */
export function devFakeResponder(prompt: string, purpose: LlmPurpose): string {
  const req = parseRequestBlock<Record<string, unknown>>(prompt) ?? {};
  switch (purpose) {
    case 'placement_bank': {
      const topics = ['basics', 'core-ideas', 'tools', 'practice', 'theory'];
      const questions = [1, 2, 3, 4, 5].flatMap((difficulty) =>
        [0, 1, 2].map((i) => ({
          question: `[FAKE] Difficulty ${difficulty} question ${i + 1} about ${String(req.skill ?? 'the skill')}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answerIndex: (difficulty + i) % 4,
          difficulty,
          topic: topics[(difficulty + i) % topics.length],
        })),
      );
      return JSON.stringify({ questions });
    }
    case 'course_outline':
      return JSON.stringify(
        fixtureOutline({
          skill: String(req.skill ?? 'Skill'),
          depth: (req.depth as 'intro' | 'working' | 'deep') ?? 'working',
          weeks: Number(req.weeks ?? 2),
          daysPerWeek: Number(req.daysPerWeek ?? 5),
        }),
      );
    case 'day_content': {
      const day = Number(req.day ?? 1);
      const topics = (req.topics as string[] | undefined) ?? [`topic-${day}`];
      const outline = {
        title: '',
        summary: '',
        skill: '',
        depth: 'working' as const,
        weeks: [
          {
            week: 1,
            theme: '',
            days: [{ day, title: String(req.title ?? `Day ${day}`), objectives: ['x'], topics }],
          },
        ],
      };
      return JSON.stringify(fixtureDay(outline, day));
    }
    case 'self_check':
      return JSON.stringify({
        verdict: 'pass',
        coversObjectives: true,
        quizConsistent: true,
        issues: [],
      });
    case 'task_grading': {
      const max = Number(req.maxScore ?? 5);
      const criteria = (req.rubric as Array<{ criterion: string }> | undefined) ?? [];
      return JSON.stringify({
        score: Math.max(0, max - 1),
        feedback: '[FAKE] Placeholder feedback: solid attempt; see the missed criterion.',
        missedCriteria: criteria.length ? [criteria[criteria.length - 1]!.criterion] : [],
      });
    }
  }
}
