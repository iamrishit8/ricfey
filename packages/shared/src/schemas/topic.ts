import { z } from 'zod';

/** Unpaid drafts (courses created but not bought) a learner may start in 24 hours. */
export const DRAFTS_PER_DAY = 5;
/** Topic checks (one model call each) per learner per hour. */
export const TOPIC_CHECKS_PER_HOUR = 30;

// No line breaks or other control characters (code points below 32).
const oneLine = (s: string) => ![...s].some((c) => c.charCodeAt(0) < 32);

export const TopicCheckRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, 'Tell us what you want to learn')
    .max(200)
    .refine(oneLine, 'Keep it to one line'),
});

/**
 * The model's judgement of what a learner typed: is it a subject we may teach, how specific is
 * it, and for a broad area, three narrower courses to offer.
 */
export const TopicAssessmentSchema = z
  .object({
    verdict: z.enum(['ok', 'refuse']),
    reason: z
      .string()
      .max(200)
      .describe('If refusing: one short, polite sentence for the learner. Else empty.'),
    specificity: z
      .enum(['specific', 'broad'])
      .describe(
        'specific: a topic a learner could finish in a few weeks. broad: a whole field with no focus yet.',
      ),
    topic: z
      .string()
      .min(2)
      .max(120)
      .refine(oneLine)
      .describe('The topic cleaned up: no filler words, no instructions'),
    options: z
      .array(z.string().min(2).max(120).refine(oneLine))
      .max(3)
      .describe('For a broad topic, exactly 3 narrower, concrete course topics. Else empty.'),
  })
  .refine((a) => a.verdict === 'ok' || a.reason.length > 0, {
    message: 'a refusal needs a reason',
    path: ['reason'],
  })
  .refine((a) => !(a.verdict === 'ok' && a.specificity === 'broad') || a.options.length === 3, {
    message: 'a broad topic needs exactly 3 options',
    path: ['options'],
  });
export type TopicAssessment = z.infer<typeof TopicAssessmentSchema>;

/** What the page needs; options are empty for a specific topic. */
export type TopicCheckView =
  | { verdict: 'refuse'; reason: string }
  | { verdict: 'ok'; specificity: 'specific' | 'broad'; topic: string; options: string[] };
