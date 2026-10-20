import { z } from 'zod';

export const PLACEMENT_MIN_QUESTIONS = 8;
export const PLACEMENT_MAX_QUESTIONS = 12;
export const PLACEMENT_LEVELS = ['foundation', 'intermediate', 'advanced'] as const;
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number];

/** One question in the generated bank. Difficulty 1 = absolute basics, 5 = expert. */
export const PlacementQuestionSchema = z
  .object({
    question: z.string().min(10),
    options: z.array(z.string().min(1)).min(3).max(5),
    answerIndex: z.number().int().min(0),
    difficulty: z.number().int().min(1).max(5),
    topic: z.string().min(2).max(40).describe('Short kebab-case subtopic tag'),
  })
  .refine((q) => q.answerIndex < q.options.length, {
    message: 'answerIndex must point at one of the options',
    path: ['answerIndex'],
  });

export const PlacementBankSchema = z
  .object({ questions: z.array(PlacementQuestionSchema).min(12).max(20) })
  .refine(
    (b) => [1, 2, 3, 4, 5].every((d) => b.questions.filter((q) => q.difficulty === d).length >= 2),
    { message: 'need at least 2 questions at each difficulty 1 to 5', path: ['questions'] },
  );

export type PlacementQuestion = z.infer<typeof PlacementQuestionSchema>;

export const PlacementAnswerSchema = z.object({
  questionId: z.string().min(1).max(40),
  answerIndex: z.number().int().min(0).max(9),
});

/** What the client sees: never the answer. */
export type PublicPlacementQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type PlacementResult = {
  level: PlacementLevel;
  ability: number;
  strongTopics: string[];
  weakTopics: string[];
};

export type PlacementView = {
  status: 'generating' | 'ready' | 'failed' | 'completed' | 'skipped';
  answered: number;
  minQuestions: number;
  maxQuestions: number;
  question: PublicPlacementQuestion | null;
  result: PlacementResult | null;
};
