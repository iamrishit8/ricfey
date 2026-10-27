import {
  PLACEMENT_MAX_QUESTIONS,
  PLACEMENT_MIN_QUESTIONS,
  PlacementBankSchema,
  type PlacementView,
} from '@ricfey/shared';
import { AppError } from '../lib/errors';
import type { Background } from '../lib/background';
import type { LlmProviders } from '../llm/providers';
import type { CourseDoc } from '../models/course';
import { PlacementModel, type PlacementDoc } from '../models/placement';
import {
  nextDifficulty,
  pickQuestion,
  placementResult,
  shouldStop,
  START_DIFFICULTY,
} from './adaptive';
import { placementBankPrompt } from './prompt';

export type PlacementDeps = {
  llm: LlmProviders;
  background: Background;
  now: () => Date;
  /** Called once when the learner finishes placement (C2 starts outline generation here). */
  onComplete?: (course: CourseDoc) => Promise<void>;
};

const STALE_MS = 5 * 60 * 1000;

export async function startPlacement(course: CourseDoc, deps: PlacementDeps): Promise<void> {
  const placement = await PlacementModel.create({
    courseId: course._id,
    userId: course.userId,
    status: 'generating',
    generationStartedAt: deps.now(),
  });
  deps.background.run('placement_bank', () => generateBank(placement._id, course, deps));
}

async function generateBank(id: PlacementDoc['_id'], course: CourseDoc, deps: PlacementDeps) {
  try {
    const { data } = await deps.llm.main.generateStructured(
      PlacementBankSchema,
      placementBankPrompt({ skill: course.skill, depth: course.depth }),
      'placement_bank',
    );
    const bank = data.questions.map((q, i) => ({ ...q, qid: `q${i + 1}` }));
    const first = pickQuestion(bank, [], START_DIFFICULTY);
    await PlacementModel.updateOne(
      { _id: id, status: 'generating' },
      {
        $set: {
          status: 'ready',
          bank,
          currentQid: first?.qid ?? null,
          currentTarget: START_DIFFICULTY,
        },
      },
    );
  } catch (err) {
    await PlacementModel.updateOne(
      { _id: id, status: 'generating' },
      { $set: { status: 'failed' } },
    );
    throw err;
  }
}

/** Retry a failed (or stuck) bank generation. Atomic, so two clicks start one job. */
export async function retryPlacement(course: CourseDoc, deps: PlacementDeps): Promise<void> {
  const now = deps.now();
  const claimed = await PlacementModel.findOneAndUpdate(
    {
      courseId: course._id,
      $or: [
        { status: 'failed' },
        { status: 'generating', generationStartedAt: { $lt: new Date(now.getTime() - STALE_MS) } },
      ],
    },
    { $set: { status: 'generating', generationStartedAt: now } },
    { returnDocument: 'after' },
  );
  if (claimed) deps.background.run('placement_bank', () => generateBank(claimed._id, course, deps));
}

export async function getPlacement(course: CourseDoc): Promise<PlacementDoc | null> {
  return PlacementModel.findOne({ courseId: course._id, userId: course.userId });
}

export function toPlacementView(p: PlacementDoc | null): PlacementView {
  const base = {
    answered: p?.history.length ?? 0,
    minQuestions: PLACEMENT_MIN_QUESTIONS,
    maxQuestions: PLACEMENT_MAX_QUESTIONS,
  };
  if (!p) return { ...base, status: 'skipped', question: null, result: null };
  const q = p.status === 'ready' ? p.bank.find((b) => b.qid === p.currentQid) : undefined;
  return {
    ...base,
    status: p.status,
    // Never the answer: id, question and options only.
    question: q ? { id: q.qid, question: q.question, options: [...q.options] } : null,
    result: p.result
      ? {
          level: p.result.level,
          ability: p.result.ability,
          strongTopics: [...p.result.strongTopics],
          weakTopics: [...p.result.weakTopics],
        }
      : null,
  };
}

/**
 * Record an answer to the current question and move the staircase. The write is
 * conditional on `currentQid`, so a double submit records once and the second gets 409.
 */
export async function answerPlacement(
  course: CourseDoc,
  input: { questionId: string; answerIndex: number },
  deps: PlacementDeps,
): Promise<PlacementDoc> {
  const p = await getPlacement(course);
  if (!p || p.status !== 'ready')
    throw new AppError('CONFLICT', 'Placement is not waiting for an answer');
  if (p.currentQid !== input.questionId) {
    throw new AppError('CONFLICT', 'That question was already answered. Reload to continue.');
  }
  const q = p.bank.find((b) => b.qid === input.questionId);
  if (!q || input.answerIndex >= q.options.length) {
    throw new AppError('VALIDATION_ERROR', 'Choose one of the options');
  }

  const correct = input.answerIndex === q.answerIndex;
  const entry = {
    qid: q.qid,
    difficulty: q.difficulty,
    target: p.currentTarget,
    topic: q.topic,
    answerIndex: input.answerIndex,
    correct,
  };
  // Plain copies: spreading a Mongoose subdocument yields its internals, not its fields.
  const history = [
    ...p.history.map((h) => ({
      qid: h.qid,
      difficulty: h.difficulty,
      target: h.target,
      topic: h.topic,
      correct: h.correct,
    })),
    entry,
  ];
  const done = shouldStop(history, p.bank.length);
  const target = nextDifficulty(p.currentTarget, correct);
  const next = done ? null : pickQuestion(p.bank, history, target);

  const update =
    done || !next
      ? {
          $push: { history: entry },
          $set: { status: 'completed', currentQid: null, result: placementResult(history) },
        }
      : { $push: { history: entry }, $set: { currentQid: next.qid, currentTarget: target } };
  const saved = await PlacementModel.findOneAndUpdate(
    { _id: p._id, status: 'ready', currentQid: input.questionId },
    update,
    { returnDocument: 'after' },
  );
  if (!saved)
    throw new AppError('CONFLICT', 'That question was already answered. Reload to continue.');

  if (saved.status === 'completed' && saved.result) {
    course.placement = saved.result;
    course.status = 'outline';
    await course.save();
    await deps.onComplete?.(course);
  }
  return saved;
}
