import type { DayContent } from '@ricfey/shared';
import { AppError } from '../lib/errors';

/** Grade on the server: the answer key never reaches the client before this. */
export function gradeQuiz(content: DayContent, answers: number[]) {
  const questions = content.quiz.questions;
  if (answers.length !== questions.length) {
    throw new AppError('VALIDATION_ERROR', `Answer all ${questions.length} questions`);
  }
  const results = questions.map((q, i) => {
    const a = answers[i]!;
    if (a >= q.options.length)
      throw new AppError('VALIDATION_ERROR', `Question ${i + 1}: choose one of the options`);
    return { correct: a === q.answerIndex, answerIndex: q.answerIndex, topic: q.topic };
  });
  return { results, score: results.filter((r) => r.correct).length, total: questions.length };
}
