import {
  CourseOutlineSchema,
  DayContentSchema,
  type CourseOutline,
  type DayContent,
} from '@ricfey/shared';
import { AppError } from '../lib/errors';
import { dayPrompt, outlinePrompt, type CourseRequest, type DayPromptOptions } from './prompts';
import type { LlmProvider, StructuredResult } from './types';

/** Generate a course outline. Checks the day count matches the request, beyond the schema. */
export function generateOutline(
  llm: LlmProvider,
  req: CourseRequest,
): Promise<StructuredResult<CourseOutline>> {
  const total = req.weeks * req.daysPerWeek;
  const schema = CourseOutlineSchema.refine((o) => o.weeks.length === req.weeks, {
    message: `must have exactly ${req.weeks} weeks`,
    path: ['weeks'],
  }).refine((o) => o.weeks.every((w) => w.days.length === req.daysPerWeek), {
    message: `every week must have exactly ${req.daysPerWeek} days (${total} total)`,
    path: ['weeks'],
  });
  return llm.generateStructured(schema, outlinePrompt(req), 'course_outline');
}

/** Generate one day. Checks day number and that quiz topics come from that day's tags. */
export function generateDay(
  llm: LlmProvider,
  outline: CourseOutline,
  dayNumber: number,
  opts: DayPromptOptions = {},
): Promise<StructuredResult<DayContent>> {
  const day = outline.weeks.flatMap((w) => w.days).find((d) => d.day === dayNumber);
  if (!day) throw new AppError('NOT_FOUND', `Day ${dayNumber} is not in the outline`);

  const allowed = new Set(day.topics);
  const schema = DayContentSchema.refine((c) => c.day === dayNumber, {
    message: `day must be ${dayNumber}`,
    path: ['day'],
  }).refine((c) => c.quiz.questions.every((q) => allowed.has(q.topic)), {
    message: `every quiz question's topic must be one of: ${day.topics.join(', ')}`,
    path: ['quiz', 'questions'],
  });
  return llm.generateStructured(schema, dayPrompt(outline, day, opts), 'day_content');
}
