import type { FastifyInstance } from 'fastify';
import { dbState } from '../db/connect';
import { ok } from '../lib/response';

/** Liveness: the process is up. Reports DB state but does not fail on it. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () =>
    ok({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), db: dbState() }),
  );
}
