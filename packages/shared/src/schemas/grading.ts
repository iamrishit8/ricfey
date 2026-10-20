import { z } from 'zod';

export const QuizSubmitSchema = z.object({
  answers: z.array(z.number().int().min(0).max(9)).min(1).max(10),
});

export const TASK_MAX_CHARS = 5000;
export const TASK_GRADED_ATTEMPTS_PER_DAY = 3;

export const TaskSubmitSchema = z.object({
  answer: z.string().trim().min(20, 'Write at least a couple of sentences').max(TASK_MAX_CHARS),
});

/** What the grading model returns. Score range and criterion names are checked per task. */
export const TaskGradeSchema = z.object({
  score: z.number().int().min(0),
  feedback: z
    .string()
    .min(20)
    .max(2000)
    .describe('Specific, encouraging, actionable; 2 to 5 sentences'),
  missedCriteria: z
    .array(z.string().min(1))
    .max(5)
    .describe('Exact names of rubric criteria the answer did not fully meet; empty if none'),
});
export type TaskGrade = z.infer<typeof TaskGradeSchema>;

export type QuizResult = {
  score: number;
  total: number;
  submittedAt: string;
  questions: Array<{
    question: string;
    options: string[];
    topic: string;
    yourAnswer: number;
    answerIndex: number;
    correct: boolean;
    explanation: string;
  }>;
};

export type TaskResult = {
  id: string;
  status: 'grading' | 'graded' | 'failed';
  answer: string;
  score: number | null;
  maxScore: number;
  feedback: string | null;
  missedCriteria: string[];
  submittedAt: string;
};

export type DayProgress = {
  quizAttempts: number;
  bestQuizScore: number | null;
  latestQuiz: QuizResult | null;
  taskAttempts: number;
  gradedTaskAttemptsLeft: number;
  latestTask: TaskResult | null;
};

export type ProgressView = {
  daysTotal: number;
  daysCompleted: number;
  topicScores: Array<{ topic: string; correct: number; total: number; percent: number }>;
  streak: { current: number; longest: number };
};
