import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session';
import { loadOwnCourse } from '../courses/ownership';
import { listDays, loadDay, openDay, type DayDeps } from '../days/service';
import { dayProgress } from '../grading/service';
import { AppError } from '../lib/errors';
import { ok } from '../lib/response';

const DayParams = z.object({ id: z.string(), n: z.coerce.number().int().min(1).max(84) });

export function parseDayParams(params: unknown): { id: string; n: number } {
  const r = DayParams.safeParse(params);
  if (!r.success) throw new AppError('NOT_FOUND', 'Day not found');
  return r.data;
}

export async function dayRoutes(app: FastifyInstance, opts: DayDeps): Promise<void> {
  app.get('/courses/:id/days', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    return ok({ days: await listDays(course, opts.now()) });
  });

  /** Opens the day (generating it the first time). Poll until status is ready or flagged. */
  app.get('/courses/:id/days/:n', async (req) => {
    const user = await requireUser(req, opts.now());
    const { id, n } = parseDayParams(req.params);
    const course = await loadOwnCourse(user._id, id);
    const day = await openDay(course, n, opts);
    return ok({ day, progress: await dayProgress(course, await loadDay(course, n)) });
  });
}
