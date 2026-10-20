import type { DayContent, OutlineDay } from '@ricfey/shared';
import { DATA_RULE, delimit, requestBlock } from '../llm/request-block';

/** Prompt for the cheaper reviewer model: does this day deliver its outline entry, correctly? */
export function selfCheckPrompt(entry: OutlineDay, content: DayContent): string {
  return [
    'You are a strict reviewer of one day of an online course. Compare the draft with what the',
    'course outline promised for this day (in the request) and check its correctness.',
    '',
    DATA_RULE,
    '',
    'Check:',
    '1. coversObjectives: the lesson teaches, and the task exercises, every objective.',
    '2. quizConsistent: for every question, the option at answerIndex (0-based) is actually',
    '   correct, the explanation agrees with it, and the topic is one of the listed topic tags.',
    '3. Factual errors anywhere in the lesson, task or quiz.',
    '',
    'verdict is "fail" if any objective is missing, any quiz answer is wrong or inconsistent,',
    'or there is any factual error. Otherwise "pass". Minor style issues alone are not a fail.',
    'List each concrete problem in issues (empty when passing), specific enough to fix.',
    '',
    requestBlock({
      day: entry.day,
      title: entry.title,
      objectives: entry.objectives,
      topics: entry.topics,
    }),
    '',
    'The draft to review:',
    delimit('draft', JSON.stringify(content)),
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}
