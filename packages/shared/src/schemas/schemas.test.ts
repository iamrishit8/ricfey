import { describe, expect, test } from 'bun:test';
import { CourseOutlineSchema } from './course-outline';
import { DayContentSchema } from './day-content';

const day = (n: number) => ({
  day: n,
  title: `Day ${n} title`,
  objectives: ['Write a loop'],
  topics: ['loops'],
});
const outline = (days: number[]) => ({
  title: 'Python basics',
  summary: 'A four week course on practical Python for everyday tasks.',
  skill: 'Python',
  depth: 'intermediate',
  weeks: [{ week: 1, theme: 'Foundations', days: days.map(day) }],
});

const question = {
  question: 'What does len([1, 2, 3]) return?',
  options: ['2', '3', '4', 'Error'],
  answerIndex: 1,
  explanation: 'len counts elements; there are three.',
  topic: 'lists',
};
const dayContent = {
  day: 1,
  title: 'Lists',
  lesson: { markdown: 'x'.repeat(400), estimatedMinutes: 20 },
  task: {
    prompt: 'Write a function that returns the largest number in a list without max().',
    rubric: [
      {
        criterion: 'Correctness',
        description: 'Returns the right value for all inputs.',
        points: 3,
      },
      { criterion: 'Edge cases', description: 'Handles an empty list sensibly.', points: 2 },
    ],
  },
  quiz: { questions: [question, question, question] },
};

describe('CourseOutlineSchema', () => {
  test('accepts days numbered 1..N', () => {
    expect(CourseOutlineSchema.safeParse(outline([1, 2, 3])).success).toBe(true);
  });

  test('rejects gaps or repeats in day numbering', () => {
    expect(CourseOutlineSchema.safeParse(outline([1, 3, 4])).success).toBe(false);
    expect(CourseOutlineSchema.safeParse(outline([1, 1, 2])).success).toBe(false);
  });

  test('rejects an unknown depth', () => {
    expect(CourseOutlineSchema.safeParse({ ...outline([1]), depth: 'guru' }).success).toBe(false);
  });
});

describe('DayContentSchema', () => {
  test('accepts a complete day', () => {
    expect(DayContentSchema.safeParse(dayContent).success).toBe(true);
  });

  test('rejects an answerIndex outside the options', () => {
    const bad = {
      ...dayContent,
      quiz: { questions: [question, question, { ...question, answerIndex: 4 }] },
    };
    const result = DayContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['quiz', 'questions', 2, 'answerIndex']);
  });

  test('rejects a task without a rubric and a too-short lesson', () => {
    const bad = {
      ...dayContent,
      lesson: { markdown: 'short', estimatedMinutes: 20 },
      task: { ...dayContent.task, rubric: [] },
    };
    const paths = DayContentSchema.safeParse(bad).error?.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(['lesson.markdown', 'task.rubric']);
  });
});
