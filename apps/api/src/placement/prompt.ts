import type { CourseDepth } from '@ricfey/shared';
import { DATA_RULE, requestBlock } from '../llm/request-block';

export function placementBankPrompt(input: { skill: string; depth: CourseDepth }): string {
  return [
    'You write placement tests. Create a bank of multiple-choice questions that measures how much',
    'the learner already knows about the skill in the request, from absolute basics to expert level.',
    '',
    DATA_RULE,
    '',
    'Rules:',
    '- Exactly 15 questions: 3 at each difficulty 1, 2, 3, 4 and 5.',
    '  1 = vocabulary a complete beginner might know; 3 = what a regular practitioner knows;',
    '  5 = what only an expert gets right.',
    '- Cover 4 to 6 distinct subtopics; tag each question with a short kebab-case topic.',
    '- 4 options each, exactly one correct, distractors are plausible misconceptions.',
    '- Test understanding, not trivia or trick wording. No "all of the above".',
    '- Vary the position of the correct answer. answerIndex is 0-based.',
    '- The learner aims for the depth in the request; still span all five difficulties.',
    '',
    requestBlock({ skill: input.skill, depth: input.depth, questions: 15 }),
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}
