import type { CourseOutline, OutlineDay, TopicMastery } from '@ricfey/shared';
import { DATA_RULE, delimit, requestBlock } from '../llm/request-block';

export type ReplanPromptInput = {
  outline: CourseOutline;
  minutesPerDay: number;
  /** The days to rewrite, as they are now. */
  days: OutlineDay[];
  mastery: TopicMastery[];
  weakTopics: string[];
  strongTopics: string[];
};

export function replanPrompt(input: ReplanPromptInput): string {
  const outlineSummary = input.outline.weeks
    .map(
      (w) =>
        `Week ${w.week}: ${w.theme}\n` +
        w.days.map((d) => `  Day ${d.day}: ${d.title} [${d.topics.join(', ')}]`).join('\n'),
    )
    .join('\n');
  const numbers = input.days.map((d) => d.day);
  return [
    'You are an expert tutor adapting a course plan to how a learner is actually doing.',
    '',
    DATA_RULE,
    '',
    'The full course outline, for context:',
    delimit('course_outline', `${input.outline.title}\n${outlineSummary}`),
    '',
    `Rewrite ONLY days ${numbers.join(', ')}. Their current entries, the learner's quiz scores per`,
    'topic, and their weak and strong topics are in the request block.',
    '',
    'Rules:',
    `- Return exactly ${numbers.length} days, numbered ${numbers.join(', ')}, in that order.`,
    '- Every weak topic must appear in the topic tags of at least one rewritten day, early on,',
    '  taught from a new angle with more practice. Use the weak topic tag exactly as given.',
    '- Strong topics: do not re-teach them; build on them or move faster.',
    '- Keep the course heading to the same goal: later weeks must still make sense after these days.',
    "- Keep a day unchanged if it already serves the learner; don't change for the sake of it.",
    `- Each day fits about ${input.minutesPerDay} minutes with a short task and a quiz.`,
    '- Objectives are observable actions. Topic tags are short kebab-case; reuse existing tags for the same idea.',
    '- rationale: two or three plain sentences to the learner, naming the topics you changed and why.',
    '',
    requestBlock({
      days: input.days,
      topicScores: input.mastery.map((m) => ({
        topic: m.topic,
        correct: m.correct,
        total: m.total,
        percent: m.percent,
      })),
      weakTopics: input.weakTopics,
      strongTopics: input.strongTopics,
      minutesPerDay: input.minutesPerDay,
    }),
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}
