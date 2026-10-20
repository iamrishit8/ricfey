import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateCourseSchema,
  OutlineApproveSchema,
  OutlineEditSchema,
  PlacementAnswerSchema,
} from '@ricfey/shared';
import { requireUser } from '../auth/session';
import { loadOwnCourse } from '../courses/ownership';
import type { Background } from '../lib/background';
import { AppError } from '../lib/errors';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import type { LlmProviders } from '../llm/providers';
import { createDays } from '../days/service';
import { CourseModel, toPublicCourse } from '../models/course';
import {
  approveOutline,
  editOutline,
  getOutlineView,
  startOutline,
  type OutlineDeps,
} from '../outline/service';
import {
  answerPlacement,
  getPlacement,
  retryPlacement,
  startPlacement,
  toPlacementView,
  type PlacementDeps,
} from '../placement/service';

export type CourseRouteOptions = {
  llm: LlmProviders;
  background: Background;
  now: () => Date;
};

export async function courseRoutes(app: FastifyInstance, opts: CourseRouteOptions): Promise<void> {
  const outlineDeps: OutlineDeps = { llm: opts.llm, background: opts.background, now: opts.now };
  const placementDeps: PlacementDeps = {
    ...outlineDeps,
    // Finishing placement moves the course to 'outline'; start generating it right away.
    onComplete: async (course) => void (await startOutline(course, outlineDeps)),
  };
  const idOf = (req: { params: unknown }) => (req.params as { id: string }).id;

  app.post('/courses', async (req, reply) => {
    const user = await requireUser(req, opts.now());
    const input = validate(CreateCourseSchema, req.body);
    // Beginners (intro depth) skip placement and go straight to the outline.
    const skipPlacement = input.depth === 'intro';
    const course = await CourseModel.create({
      ...input,
      userId: user._id,
      status: skipPlacement ? 'outline' : 'placement',
    });
    if (skipPlacement) await startOutline(course, outlineDeps);
    else await startPlacement(course, placementDeps);
    return reply.code(201).send(ok({ course: toPublicCourse(course) }));
  });

  app.get('/courses', async (req) => {
    const user = await requireUser(req, opts.now());
    const courses = await CourseModel.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100);
    return ok({ courses: courses.map(toPublicCourse) });
  });

  app.get('/courses/:id', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    return ok({ course: toPublicCourse(course) });
  });

  app.get('/courses/:id/placement', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    return ok({ placement: toPlacementView(await getPlacement(course)) });
  });

  app.post('/courses/:id/placement/answer', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    if (course.status !== 'placement')
      throw new AppError('CONFLICT', 'Placement is already finished');
    const input = validate(PlacementAnswerSchema, req.body);
    const placement = await answerPlacement(course, input, placementDeps);
    return ok({ placement: toPlacementView(placement), course: toPublicCourse(course) });
  });

  app.post('/courses/:id/placement/retry', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    await retryPlacement(course, placementDeps);
    return ok({ placement: toPlacementView(await getPlacement(course)) });
  });

  app.get('/courses/:id/outline', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, idOf(req));
    const { version } = validate(
      z.object({ version: z.coerce.number().int().min(1).optional() }),
      req.query,
    );
    return ok({ outline: await getOutlineView(course, version) });
  });

  app.put('/courses/:id/outline', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, idOf(req));
    await editOutline(course, validate(OutlineEditSchema, req.body));
    return ok({ outline: await getOutlineView(course) });
  });

  app.post('/courses/:id/outline/approve', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, idOf(req));
    const { version } = validate(OutlineApproveSchema, req.body);
    const outline = await approveOutline(course, version, opts.now());
    await createDays(course, outline);
    return ok({ course: toPublicCourse(course), outline: await getOutlineView(course) });
  });

  app.post('/courses/:id/outline/retry', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, idOf(req));
    await startOutline(course, outlineDeps);
    return ok({ outline: await getOutlineView(course) });
  });
}
