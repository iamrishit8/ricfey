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
          depth: (req.depth as 'basic' | 'intermediate' | 'advanced') ?? 'intermediate',
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
        depth: 'intermediate' as const,
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
    case 'topic_check': {
      // Deterministic stand-in: "forbidden…" is refused, a few whole fields are broad, the rest specific.
      const text = String(req.text ?? 'Topic').trim();
      const key = text.toLowerCase().replace(/\s+/g, ' ');
      const BROAD = ['quantum physics', 'physics', 'music', 'cooking', 'history', 'science'];
      if (key.startsWith('forbidden'))
        return JSON.stringify({
          verdict: 'refuse',
          reason: '[FAKE] We can’t build a course on that topic.',
          specificity: 'specific',
          topic: text,
          options: [],
        });
      const broad = BROAD.includes(key);
      return JSON.stringify({
        verdict: 'ok',
        reason: '',
        specificity: broad ? 'broad' : 'specific',
        topic: text,
        options: broad
          ? [`${text}: the core ideas`, `${text}: hands-on practice`, `${text}: a first deep dive`]
          : [],
      });
    }
    case 'replan': {
      // Keep each day's number, prefix the title, and spread the weak topics across the days.
      const days = (req.days as Array<Record<string, unknown>> | undefined) ?? [];
      const weak = (req.weakTopics as string[] | undefined) ?? [];
      return JSON.stringify({
        rationale: `[FAKE] Re-planned ${days.length} days to give more practice on ${weak.join(', ') || 'recent topics'}.`,
        days: days.map((d, i) => {
          const extra = weak.filter((_, w) => w % days.length === i);
          const topics = [...new Set([...extra, ...(d.topics as string[])])].slice(0, 4);
          return {
            day: d.day,
            title: extra.length ? `[FAKE] Revisit ${extra.join(' and ')}` : String(d.title),
            objectives: d.objectives,
            topics,
          };
        }),
      });
    }
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
