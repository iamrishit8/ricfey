import Fastify, { type FastifyServerOptions } from 'fastify';
import { registerErrorHandler } from './plugins/error-handler';
import { healthRoutes } from './routes/health';

/** Builds the app without listening, so tests can use app.inject(). */
export function buildApp(opts: { logger?: FastifyServerOptions['logger'] } = {}) {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  registerErrorHandler(app);
  app.register(healthRoutes);

  return app;
}
