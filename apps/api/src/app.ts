import cookie from '@fastify/cookie';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { GoogleOAuthClient } from './auth/google';
import { ConsoleMailer, type Mailer } from './auth/mailer';
import { registerErrorHandler } from './plugins/error-handler';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';

export type AppConfig = {
  webUrl: string;
  cookieSecure: boolean;
  trustProxy: boolean;
  sessionTtlDays: number;
};

export type AppDeps = {
  mailer: Mailer;
  google: GoogleOAuthClient | null;
  now: () => Date;
};

const DEFAULT_CONFIG: AppConfig = {
  webUrl: 'http://localhost:5173',
  cookieSecure: true,
  trustProxy: false,
  sessionTtlDays: 30,
};

/** Builds the app without listening, so tests can use app.inject(). */
export function buildApp(
  opts: {
    logger?: FastifyServerOptions['logger'];
    config?: Partial<AppConfig>;
    deps?: Partial<AppDeps>;
  } = {},
) {
  const config = { ...DEFAULT_CONFIG, ...opts.config };
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: config.trustProxy });
  const deps: AppDeps = {
    mailer: opts.deps?.mailer ?? new ConsoleMailer(app.log),
    google: opts.deps?.google ?? null,
    now: opts.deps?.now ?? (() => new Date()),
  };

  registerErrorHandler(app);
  app.register(cookie);
  app.register(healthRoutes);
  app.register(authRoutes, { ...config, ...deps });

  return app;
}
