import type { FastifyInstance } from 'fastify';
import { requireUser } from '../auth/session';
import { creditsView } from '../credits/service';
import { ok } from '../lib/response';

export async function creditRoutes(app: FastifyInstance, opts: { now: () => Date }): Promise<void> {
  /** Balance and the latest 50 ledger entries. Grants the welcome credits on first call. */
  app.get('/credits', async (req) => {
    const user = await requireUser(req, opts.now());
    return ok({ credits: await creditsView(user._id) });
  });
}
