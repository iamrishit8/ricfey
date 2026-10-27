import { z } from 'zod';
import { AppError } from './errors';

const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

/** A malformed id is reported as not found, the same as someone else's id. */
export function parseId(value: unknown, what = 'Course'): string {
  const r = ObjectIdSchema.safeParse(value);
  if (!r.success) throw new AppError('NOT_FOUND', `${what} not found`);
  return r.data;
}
