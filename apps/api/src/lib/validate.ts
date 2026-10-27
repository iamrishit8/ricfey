import type { z } from 'zod';
import { AppError } from './errors';

/**
 * Parse untrusted input (body, query, params) with a Zod schema.
 * Returns typed data or throws a 400 VALIDATION_ERROR listing each bad field.
 */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issues = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  throw new AppError('VALIDATION_ERROR', 'Request validation failed', { issues });
}
