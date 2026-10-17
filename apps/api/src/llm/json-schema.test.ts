import { describe, expect, test } from 'bun:test';
import { DayContentSchema } from '@ricfey/shared';
import { toGeminiJsonSchema } from './json-schema';

function keys(node: unknown, out = new Set<string>(), parentKey = ''): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => keys(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      // Children of "properties" are field names, not keywords.
      if (parentKey !== 'properties') out.add(k);
      keys(v, out, k);
    }
  }
  return out;
}

describe('toGeminiJsonSchema', () => {
  const schema = toGeminiJsonSchema(DayContentSchema) as Record<string, unknown>;

  test('drops keywords Gemini does not support', () => {
    const used = keys(schema);
    for (const k of ['$schema', 'minLength', 'maxLength', 'pattern'])
      expect(used.has(k)).toBe(false);
  });

  test('drops item-count bounds on arrays of objects only', () => {
    const quiz = (schema.properties as Record<string, Record<string, Record<string, unknown>>>)
      .quiz!;
    const questions = (quiz.properties as Record<string, Record<string, unknown>>).questions!;
    expect(questions.minItems).toBeUndefined();
    expect(questions.maxItems).toBeUndefined();
    const options = (
      (questions.items as Record<string, unknown>).properties as Record<
        string,
        Record<string, unknown>
      >
    ).options!;
    expect(options).toMatchObject({ minItems: 3, maxItems: 5 });
  });

  test('keeps structure, required fields, array bounds and descriptions', () => {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(Object.keys(props).sort()).toEqual(['day', 'lesson', 'quiz', 'task', 'title']);
    expect(schema.required).toEqual(['day', 'title', 'lesson', 'task', 'quiz']);
    const used = keys(schema);
    for (const k of ['minItems', 'maxItems', 'description', 'minimum'])
      expect(used.has(k)).toBe(true);
  });
});
