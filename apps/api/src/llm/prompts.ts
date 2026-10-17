import type { CourseDepth, CourseOutline, OutlineDay } from '@ricfey/shared';

export type CourseRequest = {
  skill: string;
  depth: CourseDepth;
  weeks: number;
  daysPerWeek: number;
};

const DEPTH_MEANING: Record<CourseDepth, string> = {
  intro:
    'INTRO: a curious beginner. Build intuition and core vocabulary. Assume no prior knowledge.',
  working:
    'WORKING: the learner should be able to use this independently for real, everyday tasks. ' +
    'Practical fluency over theory; theory only where it prevents common mistakes.',
  deep:
    'DEEP: the learner wants expert-level understanding: underlying mechanisms, trade-offs, ' +
    'edge cases and how practitioners reason.',
};

const AUDIENCE =
  'The learner is an adult in India studying alone, about 30 minutes a day, on a phone or laptop. ' +
  'Use Indian context (rupees, Indian examples) only where it genuinely helps; do not force it.';

export function outlinePrompt(req: CourseRequest): string {
  const total = req.weeks * req.daysPerWeek;
  return [
    `You are an expert curriculum designer. Design a ${req.weeks}-week course on: "${req.skill}".`,
    '',
    `Target depth: ${DEPTH_MEANING[req.depth]}`,
    AUDIENCE,
    '',
    'Constraints:',
    `- Exactly ${req.weeks} weeks with exactly ${req.daysPerWeek} days each: ${total} days total.`,
    `- Number days 1 to ${total} continuously across weeks.`,
    '- Each day is one focused, self-contained step that builds on earlier days. No filler days.',
    '- Every day must be teachable in text and testable with a written task and a multiple-choice quiz.',
    '- Order matters: prerequisites first; revisit hard ideas later in harder contexts.',
    '- Objectives are observable ("calculate...", "explain why...", "write..."), not "understand".',
    '- Topic tags: short kebab-case (e.g. "list-comprehensions"). Reuse a tag when a later day returns to it.',
    `- Set "skill" to "${req.skill}" and "depth" to "${req.depth}".`,
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}

export function dayPrompt(outline: CourseOutline, day: OutlineDay): string {
  const outlineSummary = outline.weeks
    .map(
      (w) =>
        `Week ${w.week}: ${w.theme}\n` +
        w.days.map((d) => `  Day ${d.day}: ${d.title} [${d.topics.join(', ')}]`).join('\n'),
    )
    .join('\n');

  return [
    `You are an expert teacher writing day ${day.day} of the course "${outline.title}".`,
    '',
    `Course depth: ${DEPTH_MEANING[outline.depth]}`,
    AUDIENCE,
    '',
    'Full course outline (for context; write ONLY today):',
    outlineSummary,
    '',
    `TODAY: Day ${day.day}: ${day.title}`,
    `Objectives:\n${day.objectives.map((o) => `- ${o}`).join('\n')}`,
    `Topic tags: ${day.topics.join(', ')}`,
    '',
    'Write:',
    '1. lesson.markdown: a lesson of roughly 600 to 900 words in Markdown.',
    '   - Open with why today matters in one or two sentences.',
    '   - Teach with concrete worked examples; show, then explain.',
    '   - Call out one or two common mistakes.',
    '   - End with a 3-bullet recap.',
    '   - Use headings, short paragraphs, and code blocks or tables where they help.',
    '   - Do not reference days that have not happened yet as if the learner knows them.',
    '2. task: one practice task the learner completes in 15 to 25 minutes and answers in text.',
    "   It must exercise today's objectives, not just recall. The rubric has 2 to 5 criteria",
    '   with points, specific enough that a grader could score an answer consistently.',
    '3. quiz: exactly 5 multiple-choice questions with 4 options each.',
    '   - Test understanding and application, not trivia or wording tricks.',
    '   - Distractors must be plausible mistakes a learner would actually make.',
    '   - Vary the position of the correct answer. answerIndex is 0-based.',
    `   - Each question's topic must be one of: ${day.topics.join(', ')}.`,
    '   - The explanation says why the answer is right and why the tempting wrong one is wrong.',
    `4. Set "day" to ${day.day} and "title" to the day's title.`,
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}
