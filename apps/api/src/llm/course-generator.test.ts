import { describe, expect, test } from 'bun:test';
import { generateDay, generateOutline } from './course-generator';
import { fixtureDay, fixtureOutline } from './fake-fixtures';
import { FakeProvider } from './fake-provider';
import type { CourseRequest } from './prompts';
import { InMemoryLlmUsageStore } from './usage-store';

const req: CourseRequest = { skill: 'Music theory', depth: 'intro', weeks: 2, daysPerWeek: 3 };
const deps = () => ({
  usage: new InMemoryLlmUsageStore(),
  caps: { maxCallsPerDay: 10, maxTokensPerDay: 1e9 },
});

describe('generateOutline', () => {
  test('prompt states the exact shape asked for', async () => {
    const llm = new FakeProvider(deps(), [JSON.stringify(fixtureOutline(req))]);
    await generateOutline(llm, req);
    expect(llm.prompts[0]).toContain('Exactly 2 weeks with exactly 3 days each: 6 days total.');
    expect(llm.prompts[0]).toContain('"Music theory"');
  });

  test('wrong number of days per week triggers the retry', async () => {
    const wrong = fixtureOutline({ ...req, daysPerWeek: 2 });
    const llm = new FakeProvider(deps(), [
      JSON.stringify(wrong),
      JSON.stringify(fixtureOutline(req)),
    ]);
    const res = await generateOutline(llm, req);
    expect(res.attempts).toBe(2);
    expect(llm.prompts[1]).toContain('every week must have exactly 3 days');
  });
});

describe('generateDay', () => {
  const outline = fixtureOutline(req);

  test("quiz topics outside the day's tags trigger the retry", async () => {
    const bad = fixtureDay(outline, 2);
    bad.quiz.questions[0]!.topic = 'something-else';
    const llm = new FakeProvider(deps(), [
      JSON.stringify(bad),
      JSON.stringify(fixtureDay(outline, 2)),
    ]);
    const res = await generateDay(llm, outline, 2);
    expect(res.attempts).toBe(2);
    expect(llm.prompts[1]).toContain("every quiz question's topic must be one of: topic-2");
  });

  test('prompt includes the outline and only asks for today', async () => {
    const llm = new FakeProvider(deps(), [JSON.stringify(fixtureDay(outline, 1))]);
    await generateDay(llm, outline, 1);
    expect(llm.prompts[0]).toContain('TODAY: Day 1:');
    expect(llm.prompts[0]).toContain('Day 6:');
  });

  test('a day outside the outline is NOT_FOUND without calling the model', () => {
    const llm = new FakeProvider(deps(), []);
    expect(() => generateDay(llm, outline, 99)).toThrow('Day 99 is not in the outline');
    expect(llm.prompts).toHaveLength(0);
  });
});
