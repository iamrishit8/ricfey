import type { CourseDepth, CourseOutline, OutlineDay, PlacementResult } from '@ricfey/shared';
import { DATA_RULE, delimit, requestBlock } from './request-block';

export type CourseRequest = {
  skill: string;
  depth: CourseDepth;
  weeks: number;
  daysPerWeek: number;
  /** Defaults to 30. Sizes each day. */
  minutesPerDay?: number;
  /** From the placement quiz; absent for intro courses and gen:sample. */
  placement?: Pick<PlacementResult, 'level' | 'strongTopics' | 'weakTopics'> | null;
};

const DEPTH_MEANING: Record<CourseDepth, string> = {
  basic:
    'BASIC: a curious beginner. Build intuition and core vocabulary. Assume no prior knowledge.',
  intermediate:
    'INTERMEDIATE: the learner should be able to use this independently for real, everyday tasks. ' +
    'Practical fluency over theory; theory only where it prevents common mistakes.',
  advanced:
    'ADVANCED: the learner wants expert-level understanding: underlying mechanisms, trade-offs, ' +
    'edge cases and how practitioners reason.',
};

const audience = (minutes = 30) =>
  `The learner is an adult in India studying alone, about ${minutes} minutes a day, on a phone or laptop. ` +
  'Use Indian context (rupees, Indian examples) only where it genuinely helps; do not force it.';

const LEVEL_MEANING = {
  foundation: 'a placement quiz showed they are near the start: build from the basics',
  intermediate: 'a placement quiz showed solid basics: move quickly past fundamentals',
  advanced: 'a placement quiz showed strong prior knowledge: skip basics, start at real depth',
} as const;

export function outlinePrompt(req: CourseRequest): string {
  const total = req.weeks * req.daysPerWeek;
  const p = req.placement;
  return [
    `You are an expert curriculum designer. Design a ${req.weeks}-week course on the skill in the request.`,
    '',
    DATA_RULE,
    '',
    `Target depth: ${DEPTH_MEANING[req.depth]}`,
    audience(req.minutesPerDay),
    ...(p
      ? [
          `Starting point: ${LEVEL_MEANING[p.level]}.`,
          '- Topics listed as strongTopics in the request: cover briefly or as review, not from scratch.',
          '- Topics listed as weakTopics: give them extra time early, and revisit them later.',
        ]
      : []),
    '',
    'Constraints:',
    `- Exactly ${req.weeks} weeks with exactly ${req.daysPerWeek} days each: ${total} days total.`,
    `- Number days 1 to ${total} continuously across weeks.`,
    `- Each day fits in about ${req.minutesPerDay ?? 30} minutes including a short task and a quiz.`,
    '- Each day is one focused, self-contained step that builds on earlier days. No filler days.',
    '- Every day must be teachable in text and testable with a written task and a multiple-choice quiz.',
    '- Order matters: prerequisites first; revisit hard ideas later in harder contexts.',
    '- Objectives are observable ("calculate...", "explain why...", "write..."), not "understand".',
    '- Topic tags: short kebab-case (e.g. "list-comprehensions"). Reuse a tag when a later day returns to it.',
    '- Copy "skill" and "depth" exactly from the request.',
    '',
    requestBlock({
      skill: req.skill,
      depth: req.depth,
      weeks: req.weeks,
      daysPerWeek: req.daysPerWeek,
      minutesPerDay: req.minutesPerDay ?? 30,
      ...(p ? { level: p.level, strongTopics: p.strongTopics, weakTopics: p.weakTopics } : {}),
    }),
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}

export type DayPromptOptions = {
  minutesPerDay?: number;
  /** Problems a reviewer found in a previous draft; the regeneration must fix them. */
  reviewerIssues?: string[];
};

export function dayPrompt(
  outline: CourseOutline,
  day: OutlineDay,
  opts: DayPromptOptions = {},
): string {
  const minutes = opts.minutesPerDay ?? 30;
  const words = `${Math.round(minutes * 20)} to ${Math.round(minutes * 30)}`;
  const outlineSummary = outline.weeks
    .map(
      (w) =>
        `Week ${w.week}: ${w.theme}\n` +
        w.days.map((d) => `  Day ${d.day}: ${d.title} [${d.topics.join(', ')}]`).join('\n'),
    )
    .join('\n');

  return [
    `You are an expert teacher writing day ${day.day} of the course outlined below.`,
    '',
    DATA_RULE,
    '',
    `Course depth: ${DEPTH_MEANING[outline.depth]}`,
    audience(minutes),
    '',
    'Full course outline (for context; write ONLY today):',
    delimit('course_outline', `${outline.title}\n${outlineSummary}`),
    '',
    `TODAY: Day ${day.day}: its title, objectives and topic tags are in the request block.`,
    '',
    'Write:',
    `1. lesson.markdown: a lesson of roughly ${words} words in Markdown.`,
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
    '   - Vary the position of the correct answer across questions. answerIndex is 0-based.',
    `   - Each question's topic must be one of: ${day.topics.join(', ')}.`,
    '   - The explanation says why the answer is right and why the tempting wrong one is wrong.',
    '4. Copy "day" and "title" from the request.',
    ...(opts.reviewerIssues?.length
      ? [
          '',
          'A reviewer rejected a previous draft of this day. Fix every one of these problems:',
          ...opts.reviewerIssues.map((i) => `- ${i}`),
        ]
      : []),
    '',
    requestBlock({
      day: day.day,
      title: day.title,
      objectives: day.objectives,
      topics: day.topics,
      minutesPerDay: minutes,
    }),
    '',
    'Return only JSON matching the schema.',
  ].join('\n');
}
