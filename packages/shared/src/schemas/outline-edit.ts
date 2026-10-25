import { z } from 'zod';
import { creditsPerDay } from '../credits';
import type { CourseOutline } from './course-outline';

/**
 * An edit references existing days by their number in the base version (`fromDay`) and may
 * change only titles and week themes. Topics and objectives always come from the stored
 * outline, so edited text can't smuggle new instructions into later prompts.
 * Omit a day to remove it; order and week placement give the new order.
 */
export const OutlineEditSchema = z.object({
  baseVersion: z.number().int().min(1),
  weeks: z
    .array(
      z.object({
        theme: z.string().trim().min(1).max(120),
        days: z.array(
          z.object({
            fromDay: z.number().int().min(1),
            title: z.string().trim().min(1).max(120),
          }),
        ),
      }),
    )
    .min(1)
    .max(12),
});
export type OutlineEdit = z.infer<typeof OutlineEditSchema>;

export const OutlineApproveSchema = z.object({ version: z.number().int().min(1) });

export type CreditQuote = {
  days: number;
  minutesPerDay: number;
  creditsPerDay: number;
  totalCredits: number;
  formula: string;
};

/** Shown before approval. Each day is charged when it is first opened, not up front. */
export function creditQuote(days: number, minutesPerDay: number): CreditQuote {
  const perDay = creditsPerDay(minutesPerDay);
  return {
    days,
    minutesPerDay,
    creditsPerDay: perDay,
    totalCredits: days * perDay,
    formula:
      'credits per day = ⌈minutes per day ÷ 15⌉, charged when you first open a day; total = days × credits per day',
  };
}

export type OutlineView = {
  status: 'none' | 'generating' | 'ready' | 'failed';
  version: number | null;
  approvedVersion: number | null;
  outline: CourseOutline | null;
  quote: CreditQuote | null;
  versions: Array<{
    version: number;
    source: 'generated' | 'edited' | 'replanned';
    createdAt: string;
  }>;
};
