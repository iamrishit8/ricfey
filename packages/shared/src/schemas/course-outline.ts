import { z } from 'zod';
import { COURSE_DEPTHS, MAX_WEEKS, MIN_WEEKS } from '../course';

export const OutlineDaySchema = z.object({
  day: z.number().int().min(1).describe('1-based day number across the whole course'),
  title: z.string().min(3).max(120),
  objectives: z
    .array(z.string().min(3))
    .min(1)
    .max(4)
    .describe('What the learner can do after this day, as observable actions'),
  topics: z
    .array(z.string().min(2).max(40))
    .min(1)
    .max(4)
    .describe('Short kebab-case topic tags; quiz questions are tagged with these'),
});

export const OutlineWeekSchema = z.object({
  week: z.number().int().min(1),
  theme: z.string().min(3).max(120),
  days: z.array(OutlineDaySchema).min(1).max(7),
});

export const CourseOutlineSchema = z
  .object({
    title: z.string().min(3).max(120),
    summary: z.string().min(20).max(600),
    skill: z.string().min(1),
    depth: z.enum(COURSE_DEPTHS),
    weeks: z.array(OutlineWeekSchema).min(MIN_WEEKS).max(MAX_WEEKS),
  })
  .superRefine((outline, ctx) => {
    // Days must be numbered 1..N with no gaps or repeats, in order.
    const days = outline.weeks.flatMap((w) => w.days.map((d) => d.day));
    days.forEach((d, i) => {
      if (d !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          message: `days must be numbered 1..${days.length} in order; position ${i + 1} has day ${d}`,
          path: ['weeks'],
        });
      }
    });
  });

export type OutlineDay = z.infer<typeof OutlineDaySchema>;
export type CourseOutline = z.infer<typeof CourseOutlineSchema>;
