import type { FastifyInstance, FastifyRequest } from 'fastify';
import { CourseSettingsSchema } from '@ricfey/shared';
import { requireUser } from '../auth/session';
import { loadOwnCourse } from '../courses/ownership';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import { CourseModel, toPublicCourse } from '../models/course';
import {
  applyReplan,
  courseMastery,
  latestReplan,
  loadReplan,
  rejectReplan,
  replanPolicy,
  requestReplan,
  toReplanView,
  type ReplanDeps,
} from '../replan/service';

type Params = { id: string; rid?: string };

export async function replanRoutes(app: FastifyInstance, opts: ReplanDeps): Promise<void> {
  const course = async (req: FastifyRequest) => {
    const user = await requireUser(req, opts.now());
    return loadOwnCourse(user._id, (req.params as Params).id);
  };

  app.get('/courses/:id/mastery', async (req) =>
    ok({ mastery: await courseMastery(await course(req)) }),
  );

  /** Latest re-plan (any status) and what a new one would cover and cost. */
  app.get('/courses/:id/replan', async (req) => {
    const c = await course(req);
    const latest = await latestReplan(c);
    return ok({ replan: latest ? toReplanView(latest) : null, policy: await replanPolicy(c) });
  });

  /** Returns at once with status "generating"; poll GET /courses/:id/replan. */
  app.post('/courses/:id/replan', async (req, reply) => {
    const replan = await requestReplan(await course(req), 'learner', opts);
    return reply.code(202).send(ok({ replan: toReplanView(replan) }));
  });

  app.post('/courses/:id/replan/:rid/accept', async (req) => {
    const c = await course(req);
    const replan = await loadReplan(c, (req.params as Params).rid);
    await applyReplan(c, replan);
    return ok({ replan: toReplanView(await loadReplan(c, replan.id)) });
  });

  app.post('/courses/:id/replan/:rid/reject', async (req) => {
    const c = await course(req);
    const replan = await rejectReplan(await loadReplan(c, (req.params as Params).rid));
    return ok({ replan: toReplanView(replan) });
  });

  app.patch('/courses/:id/settings', async (req) => {
    const c = await course(req);
    const { replanMode } = validate(CourseSettingsSchema, req.body);
    await CourseModel.updateOne({ _id: c._id, userId: c.userId }, { $set: { replanMode } });
    c.replanMode = replanMode;
    return ok({ course: toPublicCourse(c) });
  });
}
