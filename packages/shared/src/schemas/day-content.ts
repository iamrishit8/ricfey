import { z } from 'zod';

export const RubricCriterionSchema = z.object({
  criterion: z.string().min(3).max(80),
  description: z.string().min(10).describe('What a good answer does for this criterion'),
  points: z.number().int().min(1).max(10),
});

export const QuizQuestionSchema = z
  .object({
    question: z.string().min(10),
    options: z.array(z.string().min(1)).min(3).max(5),
    answerIndex: z.number().int().min(0).describe('0-based index into options'),
    explanation: z.string().min(10).describe('Why the answer is right and the others are not'),
    topic: z.string().min(2).max(40).describe("One of this day's topic tags"),
  })
  .refine((q) => q.answerIndex < q.options.length, {
    message: 'answerIndex must point at one of the options',
    path: ['answerIndex'],
  });

export const DayContentSchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(3).max(120),
  lesson: z.object({
    markdown: z.string().min(400).describe('The lesson body in Markdown'),
    estimatedMinutes: z.number().int().min(5).max(60),
  }),
  task: z.object({
    prompt: z.string().min(40).describe('A practice task the learner answers in text'),
    rubric: z.array(RubricCriterionSchema).min(2).max(5),
  }),
  quiz: z.object({
    questions: z.array(QuizQuestionSchema).min(3).max(8),
  }),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type DayContent = z.infer<typeof DayContentSchema>;
