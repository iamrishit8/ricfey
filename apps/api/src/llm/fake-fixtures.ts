import type { CourseOutline, DayContent } from '@ricfey/shared';
import type { CourseRequest } from './prompts';

/** A schema-valid outline for any request. Content is placeholder text, not teaching. */
export function fixtureOutline(req: CourseRequest): CourseOutline {
  let day = 0;
  return {
    title: `[FAKE] ${req.skill} in ${req.weeks} weeks`,
    summary: `[FAKE] Placeholder outline for ${req.skill} at ${req.depth} depth. Not real content.`,
    skill: req.skill,
    depth: req.depth,
    weeks: Array.from({ length: req.weeks }, (_, w) => ({
      week: w + 1,
      theme: `[FAKE] Week ${w + 1} theme`,
      days: Array.from({ length: req.daysPerWeek }, () => {
        day += 1;
        return {
          day,
          title: `[FAKE] Day ${day} title`,
          objectives: [`Do placeholder thing ${day}`],
          topics: [`topic-${day}`],
        };
      }),
    })),
  };
}

/** A schema-valid day matching `fixtureOutline`'s topics. */
export function fixtureDay(outline: CourseOutline, dayNumber: number): DayContent {
  const day = outline.weeks.flatMap((w) => w.days).find((d) => d.day === dayNumber);
  const topic = day?.topics[0] ?? `topic-${dayNumber}`;
  const paragraph =
    'This is placeholder lesson text produced by the FakeProvider so the pipeline can run ' +
    'without calling a real model. It has no teaching value. ';
  return {
    day: dayNumber,
    title: day?.title ?? `[FAKE] Day ${dayNumber}`,
    lesson: {
      markdown: `# [FAKE] Day ${dayNumber}\n\n${paragraph.repeat(5)}`,
      estimatedMinutes: 20,
    },
    task: {
      prompt: '[FAKE] Write a short paragraph applying the placeholder idea to your own life.',
      rubric: [
        { criterion: 'Relevance', description: 'Applies the idea to a real case.', points: 3 },
        { criterion: 'Clarity', description: 'Is easy to follow and specific.', points: 2 },
      ],
    },
    quiz: {
      questions: [0, 1, 2, 3, 0].map((answerIndex, i) => ({
        question: `[FAKE] Placeholder question ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answerIndex,
        explanation: 'Placeholder explanation for the fake answer.',
        topic,
      })),
    },
  };
}
