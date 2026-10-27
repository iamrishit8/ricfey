import { z } from 'zod';
import type { CourseDepth } from '../course';
import { coursePrice } from '../credits';
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
  depth: CourseDepth;
  /** One-time price: the learner pays this when they buy the roadmap, then keeps the course. */
  totalCredits: number;
  formula: string;
};

/** Shown with the roadmap. Charged once, when the learner buys (approves) it. */
export function creditQuote(days: number, minutesPerDay: number, depth: CourseDepth): CreditQuote {
  return {
    days,
    minutesPerDay,
    depth,
    totalCredits: coursePrice(days, minutesPerDay, depth),
    formula:
      'days × credits per 15 minutes of daily study × a depth factor (basic 1, intermediate 1.25, advanced 1.5), one time',
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
    source: 'generated' | 'edited' | 'replanned' | 'gallery';
    createdAt: string;
  }>;
};
