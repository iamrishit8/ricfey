import { z } from 'zod';
import type { DayContent } from './day-content';

/** The cheaper model's verdict on a generated day, checked against its outline entry. */
export const SelfCheckSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  coversObjectives: z.boolean().describe('The lesson and task teach and exercise every objective'),
  quizConsistent: z
    .boolean()
    .describe('Every quiz answer is correct and matches its explanation and topic list'),
  issues: z.array(z.string().min(3).max(300)).max(8).describe('Concrete problems; empty if none'),
});
export type SelfCheck = z.infer<typeof SelfCheckSchema>;

export const DAY_STATUSES = ['locked', 'generating', 'ready', 'flagged', 'failed'] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

/** Day content as the learner sees it before taking the quiz: no answers, no explanations. */
export type PublicDayContent = Omit<DayContent, 'quiz'> & {
  quiz: { questions: Array<{ question: string; options: string[]; topic: string }> };
};

export type DaySummary = {
  day: number;
  week: number;
  title: string;
  topics: string[];
  status: DayStatus;
  unlocked: boolean;
  unlockAt: string;
  completedAt: string | null;
  flagged: boolean;
};

export type DayView = DaySummary & {
  objectives: string[];
  content: PublicDayContent | null;
};

export function toPublicContent(c: DayContent): PublicDayContent {
  return {
    ...c,
    quiz: {
      questions: c.quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        topic: q.topic,
      })),
    },
  };
}
