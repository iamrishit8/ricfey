import {
  TASK_GRADED_ATTEMPTS_PER_DAY,
  TaskGradeSchema,
  type DayContent,
  type DayProgress,
  type QuizResult,
  type TaskResult,
} from '@ricfey/shared';
import { assertDayUnlocked, loadDay } from '../days/service';
import type { Background } from '../lib/background';
import { AppError } from '../lib/errors';
import type { LlmProviders } from '../llm/providers';
import { CourseModel, type CourseDoc } from '../models/course';
import { CourseDayModel, type CourseDayDoc } from '../models/course-day';
import { QuizAttemptModel } from '../models/quiz-attempt';
import { TaskAttemptModel, type TaskAttemptDoc } from '../models/task-attempt';
import { gradeQuiz } from './quiz';
import { maxScore, taskGradingPrompt } from './task-prompt';

export type GradingDeps = { llm: LlmProviders; background: Background; now: () => Date };

const GRADING_STALE_MS = 5 * 60 * 1000;

async function readyDay(
  course: CourseDoc,
  n: number,
  now: Date,
): Promise<{ day: CourseDayDoc; content: DayContent }> {
  if (course.status !== 'active' && course.status !== 'completed')
    throw new AppError('CONFLICT', 'Approve the outline first');
  const day = await loadDay(course, n);
  await assertDayUnlocked(course, day, now);
  if (!day.content) throw new AppError('CONFLICT', 'This day is still being prepared');
  return { day, content: day.content as DayContent };
}

function quizResult(
  content: DayContent,
  a: { answers: number[]; score: number; total: number; createdAt: Date },
): QuizResult {
  return {
    score: a.score,
    total: a.total,
    submittedAt: a.createdAt.toISOString(),
    questions: content.quiz.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      topic: q.topic,
      yourAnswer: a.answers[i]!,
      answerIndex: q.answerIndex,
      correct: a.answers[i] === q.answerIndex,
      explanation: q.explanation,
    })),
  };
}

function taskResult(t: TaskAttemptDoc): TaskResult {
  return {
    id: t.id as string,
    status: t.status,
    answer: t.answer,
    score: t.score ?? null,
    maxScore: t.maxScore,
    feedback: t.feedback ?? null,
    missedCriteria: [...t.missedCriteria],
    submittedAt: (t.get('createdAt') as Date).toISOString(),
  };
}

/**
 * A day is finished once the quiz and the task have both been submitted. The write is
 * conditional on completedAt being null, so it happens once. When every day is finished the
 * course is completed.
 */
async function maybeCompleteDay(course: CourseDoc, day: CourseDayDoc, now: Date): Promise<void> {
  if (day.completedAt) return;
  const [quiz, task] = await Promise.all([
    QuizAttemptModel.exists({ courseId: course._id, day: day.day }),
    TaskAttemptModel.exists({ courseId: course._id, day: day.day }),
  ]);
  if (!quiz || !task) return;
  await CourseDayModel.updateOne(
    { _id: day._id, completedAt: null },
    { $set: { completedAt: now } },
  );
  const open = await CourseDayModel.exists({ courseId: course._id, completedAt: null });
  if (!open)
    await CourseModel.updateOne(
      { _id: course._id, status: 'active' },
      { $set: { status: 'completed' } },
    );
}

export async function submitQuiz(
  course: CourseDoc,
  n: number,
  answers: number[],
  deps: GradingDeps,
): Promise<QuizResult> {
  const now = deps.now();
  const { day, content } = await readyDay(course, n, now);
  const graded = gradeQuiz(content, answers);
  const attempt = await QuizAttemptModel.create({
    courseId: course._id,
    userId: course.userId,
    day: n,
    answers,
    ...graded,
  });
  await maybeCompleteDay(course, day, now);
  return quizResult(content, {
    answers,
    score: graded.score,
    total: graded.total,
    createdAt: attempt.createdAt as Date,
  });
}

export async function submitTask(
  course: CourseDoc,
  n: number,
  answer: string,
  deps: GradingDeps,
): Promise<TaskResult> {
  const now = deps.now();
  const { day, content } = await readyDay(course, n, now);
  const previous = await TaskAttemptModel.find({
    courseId: course._id,
    userId: course.userId,
    day: n,
  });
  // Each grade costs an LLM call against a small daily quota, so attempts are capped.
  if (previous.length >= TASK_GRADED_ATTEMPTS_PER_DAY) {
    throw new AppError(
      'RATE_LIMITED',
      `You can submit this task ${TASK_GRADED_ATTEMPTS_PER_DAY} times.`,
    );
  }
  const inFlight = previous.some(
    (p) =>
      p.status === 'grading' && now.getTime() - p.gradingStartedAt.getTime() < GRADING_STALE_MS,
  );
  if (inFlight) throw new AppError('CONFLICT', 'Your previous answer is still being graded');

  const attempt = await TaskAttemptModel.create({
    courseId: course._id,
    userId: course.userId,
    day: n,
    answer,
    status: 'grading',
    gradingStartedAt: now,
    maxScore: maxScore(content),
  });
  await maybeCompleteDay(course, day, now);
  deps.background.run('task_grading', () => gradeTask(attempt, content, deps));
  return taskResult(attempt);
}

async function gradeTask(
  attempt: TaskAttemptDoc,
  content: DayContent,
  deps: GradingDeps,
): Promise<void> {
  const max = maxScore(content);
  const names = new Set(content.task.rubric.map((r) => r.criterion));
  const schema = TaskGradeSchema.refine((g) => g.score <= max, {
    message: `score must be at most ${max}`,
    path: ['score'],
  }).refine((g) => g.missedCriteria.every((m) => names.has(m)), {
    message: `missedCriteria must be exact rubric criterion names: ${[...names].join(', ')}`,
    path: ['missedCriteria'],
  });
  try {
    const { data } = await deps.llm.main.generateStructured(
      schema,
      taskGradingPrompt(content, attempt.answer),
      'task_grading',
    );
    await TaskAttemptModel.updateOne(
      { _id: attempt._id, status: 'grading' },
      {
        $set: {
          status: 'graded',
          score: data.score,
          feedback: data.feedback,
          missedCriteria: data.missedCriteria,
        },
      },
    );
  } catch (err) {
    await TaskAttemptModel.updateOne(
      { _id: attempt._id, status: 'grading' },
      { $set: { status: 'failed' } },
    );
    throw err;
  }
}

/** This learner's attempts on one day, with quiz answers revealed only after an attempt. */
export async function dayProgress(course: CourseDoc, day: CourseDayDoc): Promise<DayProgress> {
  const filter = { courseId: course._id, userId: course.userId, day: day.day };
  const [quizzes, tasks] = await Promise.all([
    QuizAttemptModel.find(filter).sort({ createdAt: -1 }).lean(),
    TaskAttemptModel.find(filter).sort({ createdAt: -1 }),
  ]);
  const content = day.content as DayContent | null;
  const latestQuiz = quizzes[0];
  return {
    quizAttempts: quizzes.length,
    bestQuizScore: quizzes.length ? Math.max(...quizzes.map((q) => q.score)) : null,
    latestQuiz:
      latestQuiz && content
        ? quizResult(content, { ...latestQuiz, createdAt: latestQuiz.createdAt as Date })
        : null,
    taskAttempts: tasks.length,
    gradedTaskAttemptsLeft: Math.max(0, TASK_GRADED_ATTEMPTS_PER_DAY - tasks.length),
    latestTask: tasks[0] ? taskResult(tasks[0]) : null,
  };
}
