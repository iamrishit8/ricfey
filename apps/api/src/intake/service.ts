import type { Types } from 'mongoose';
import {
  DRAFTS_PER_DAY,
  TOPIC_CHECKS_PER_HOUR,
  TopicAssessmentSchema,
  type TopicCheckView,
} from '@ricfey/shared';
import { hitRateLimit } from '../auth/rate-limit';
import { AppError } from '../lib/errors';
import type { LlmProviders } from '../llm/providers';
import { CourseModel } from '../models/course';
import { TopicCheckModel } from '../models/topic-check';
import { topicCheckPrompt } from './prompt';

export type IntakeDeps = { llm: LlmProviders; now: () => Date };

export const topicKey = (topic: string) => topic.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Judge a topic (one cheap model call), remember the verdict, and return what the page needs.
 * A topic already judged for this learner today is answered from memory.
 */
export async function checkTopic(
  userId: Types.ObjectId,
  text: string,
  deps: IntakeDeps,
): Promise<TopicCheckView> {
  const known = await TopicCheckModel.findOne({ userId, key: topicKey(text) }).lean();
  if (known?.verdict === 'ok' && known.via === 'option')
    return { verdict: 'ok', specificity: 'specific', topic: text.trim(), options: [] };
  if (known?.verdict === 'refuse') return { verdict: 'refuse', reason: known.reason };

  await hitRateLimit({
    key: `topic:${userId.toString()}`,
    limit: TOPIC_CHECKS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
    now: deps.now(),
  });
  const { data } = await deps.llm.check.generateStructured(
    TopicAssessmentSchema,
    topicCheckPrompt(text),
    'topic_check',
  );

  if (data.verdict === 'refuse') {
    await remember(userId, text, 'refuse', data.reason, 'check');
    return { verdict: 'refuse', reason: data.reason };
  }
  // The typed text and the cleaned-up topic both count as approved; so do the options the model offers.
  await remember(userId, text, 'ok', '', 'check');
  await remember(userId, data.topic, 'ok', '', 'check');
  if (data.specificity === 'broad') {
    for (const option of data.options) await remember(userId, option, 'ok', '', 'option');
  }
  return {
    verdict: 'ok',
    specificity: data.specificity,
    topic: data.topic,
    options: data.specificity === 'broad' ? data.options : [],
  };
}

async function remember(
  userId: Types.ObjectId,
  topic: string,
  verdict: 'ok' | 'refuse',
  reason: string,
  via: 'check' | 'option',
): Promise<void> {
  await TopicCheckModel.updateOne(
    { userId, key: topicKey(topic) },
    { $setOnInsert: { verdict, reason, via } },
    { upsert: true },
  );
}

/**
 * The gate every new course goes through, whichever way it arrives. A topic already approved is
 * allowed at once; anything else is judged now. A broad topic is allowed too (the learner may
 * choose to keep it broad); only refusals stop here.
 */
export async function assertTopicAllowed(
  userId: Types.ObjectId,
  skill: string,
  deps: IntakeDeps,
): Promise<void> {
  const known = await TopicCheckModel.findOne({ userId, key: topicKey(skill) }).lean();
  if (known?.verdict === 'ok') return;
  const view = known
    ? ({ verdict: 'refuse', reason: known.reason } as const)
    : await checkTopic(userId, skill, deps);
  if (view.verdict === 'refuse')
    throw new AppError('BAD_REQUEST', view.reason || 'We can’t build a course on that topic.');
}

/**
 * Drafting is free for the learner but costs us model calls (placement quiz, roadmap), so a
 * learner may start only a few courses a day without buying one.
 */
export async function assertDraftAllowed(userId: Types.ObjectId, now: Date): Promise<void> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const drafts = await CourseModel.countDocuments({
    userId,
    creditsPaid: null,
    createdAt: { $gte: since },
  });
  if (drafts >= DRAFTS_PER_DAY) {
    throw new AppError(
      'RATE_LIMITED',
      `You have started ${DRAFTS_PER_DAY} courses today without buying one. Buy one of them, or come back tomorrow.`,
    );
  }
}
