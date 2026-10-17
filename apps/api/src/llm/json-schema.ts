import { z } from 'zod';

// Keywords Gemini's responseJsonSchema accepts (from the @google/genai 2.30 type docs).
// Anything else (minLength, $schema, ...) is stripped; Zod still enforces it on the response.
const ALLOWED = new Set([
  '$id',
  '$defs',
  '$ref',
  '$anchor',
  'type',
  'format',
  'title',
  'description',
  'enum',
  'items',
  'prefixItems',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'anyOf',
  'oneOf',
  'properties',
  'additionalProperties',
  'required',
  'propertyOrdering',
]);

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!ALLOWED.has(key)) continue;
    // Under these keys, child keys are names (property names / defs), not keywords.
    if ((key === 'properties' || key === '$defs') && value && typeof value === 'object') {
      out[key] = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, strip(v)]));
    } else {
      out[key] = strip(value);
    }
  }
  return out;
}

/** Convert a Zod schema into the JSON Schema subset Gemini accepts. */
export function toGeminiJsonSchema(schema: z.ZodType): unknown {
  return strip(z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'output' }));
}
