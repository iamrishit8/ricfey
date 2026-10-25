import { z } from 'zod';
import { COURSE_DEPTHS, MAX_WEEKS, MIN_WEEKS } from '../course';
import { REPLAN_MODES } from './replan';

export const MIN_MINUTES_PER_DAY = 10;
export const MAX_MINUTES_PER_DAY = 120;

export const CreateCourseSchema = z.object({
  skill: z
    .string()
    .trim()
    .min(2, 'Tell us what you want to learn')
    .max(120)
    .refine((s) => !/[\r\n]/.test(s), 'Keep it to one line'),
  depth: z.enum(COURSE_DEPTHS),
  weeks: z.coerce.number().int().min(MIN_WEEKS).max(MAX_WEEKS),
  minutesPerDay: z.coerce.number().int().min(MIN_MINUTES_PER_DAY).max(MAX_MINUTES_PER_DAY),
  replanMode: z.enum(REPLAN_MODES).default('manual'),
});
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
