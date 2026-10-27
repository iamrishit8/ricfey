import type { FastifyInstance } from 'fastify';
import { TopicCheckRequestSchema } from '@ricfey/shared';
import { requireUser } from '../auth/session';
import { checkTopic, type IntakeDeps } from '../intake/service';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';

export async function intakeRoutes(app: FastifyInstance, opts: IntakeDeps): Promise<void> {
  /**
   * The first step of the chat: is this a topic we can teach, and if it is a whole field, which
   * three narrower courses would the learner like? Costs one cheap model call; the learner pays
   * nothing here.
   */
  app.post('/intake/topic', async (req) => {
    const user = await requireUser(req, opts.now());
    const { text } = validate(TopicCheckRequestSchema, req.body);
    return ok({ topic: await checkTopic(user._id, text, opts) });
  });
}
