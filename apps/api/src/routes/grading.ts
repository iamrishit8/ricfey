import type { FastifyInstance } from 'fastify';
import { QuizSubmitSchema, REPORTS_PER_DAY, ReportSchema, TaskSubmitSchema } from '@ricfey/shared';
import { loadDay } from '../days/service';
import { AppError } from '../lib/errors';
import { ReportModel } from '../models/report';
import { requireUser } from '../auth/session';
import { loadOwnCourse } from '../courses/ownership';
import { submitQuiz, submitTask, type GradingDeps } from '../grading/service';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import { courseProgress } from '../progress/service';
import { parseDayParams } from './days';

export async function gradingRoutes(app: FastifyInstance, opts: GradingDeps): Promise<void> {
  app.post('/courses/:id/days/:n/quiz', async (req) => {
    const user = await requireUser(req, opts.now());
    const { id, n } = parseDayParams(req.params);
    const course = await loadOwnCourse(user._id, id);
    const { answers } = validate(QuizSubmitSchema, req.body);
    return ok({ result: await submitQuiz(course, n, answers, opts) });
  });

  /** Returns at once with status "grading"; poll GET /courses/:id/days/:n for the grade. */
  app.post('/courses/:id/days/:n/task', async (req, reply) => {
    const user = await requireUser(req, opts.now());
    const { id, n } = parseDayParams(req.params);
    const course = await loadOwnCourse(user._id, id);
    const { answer } = validate(TaskSubmitSchema, req.body);
    return reply.code(202).send(ok({ attempt: await submitTask(course, n, answer, opts) }));
  });

  app.get('/courses/:id/progress', async (req) => {
    const user = await requireUser(req, opts.now());
    const course = await loadOwnCourse(user._id, (req.params as { id: string }).id);
    return ok({ progress: await courseProgress(course, opts.now()) });
  });

  /** "Flag a mistake" on any day the learner can see. */
  app.post('/courses/:id/days/:n/report', async (req, reply) => {
    const user = await requireUser(req, opts.now());
    const { id, n } = parseDayParams(req.params);
    const course = await loadOwnCourse(user._id, id);
    await loadDay(course, n);
    const input = validate(ReportSchema, req.body);
    const count = await ReportModel.countDocuments({
      courseId: course._id,
      userId: user._id,
      day: n,
    });
    if (count >= REPORTS_PER_DAY)
      throw new AppError('RATE_LIMITED', 'Thanks, we have plenty of reports for this day.');
    const report = await ReportModel.create({
      ...input,
      courseId: course._id,
      userId: user._id,
      day: n,
    });
    return reply.code(201).send(ok({ reportId: report.id as string }));
  });
}
