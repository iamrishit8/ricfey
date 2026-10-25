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

function isObjectArray(node: Record<string, unknown>): boolean {
  const items = node.items as Record<string, unknown> | undefined;
  return node.type === 'array' && items?.type === 'object';
}

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== 'object') return node;
  const obj = node as Record<string, unknown>;
  // Gemini returns 400 INVALID_ARGUMENT when arrays of objects carry item-count bounds that
  // multiply into a large schema (found by bisection on 2026-10-18).
  // Drop them there; Zod enforces the counts on the response and the prompt states them.
  const dropBounds = isObjectArray(obj);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!ALLOWED.has(key)) continue;
    if (dropBounds && (key === 'minItems' || key === 'maxItems')) continue;
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
