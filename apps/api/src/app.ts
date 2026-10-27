import cookie from '@fastify/cookie';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { GoogleOAuthClient } from './auth/google';
import { ConsoleMailer, type Mailer } from './auth/mailer';
import { InProcessBackground, type Background } from './lib/background';
import { devFakeResponder } from './llm/dev-fake';
import { FakeProvider } from './llm/fake-provider';
import type { LlmProviders } from './llm/providers';
import { InMemoryLlmUsageStore } from './llm/usage-store';
import { registerErrorHandler } from './plugins/error-handler';
import { authRoutes } from './routes/auth';
import { courseRoutes } from './routes/courses';
import { dayRoutes } from './routes/days';
import { gradingRoutes } from './routes/grading';
import { FakeGateway, type PaymentGateway } from './payments/gateway';
import { creditRoutes } from './routes/credits';
import { galleryRoutes } from './routes/gallery';
import { healthRoutes } from './routes/health';
import { intakeRoutes } from './routes/intake';
import { paymentRoutes } from './routes/payments';
import { replanRoutes } from './routes/replan';

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
  llm: LlmProviders;
  background: Background;
  payments: PaymentGateway;
};

/** Offline default: fake model for every purpose, usage kept in memory. */
function defaultLlm(): LlmProviders {
  const usage = new InMemoryLlmUsageStore();
  const caps = { maxCallsPerDay: 1e6, maxTokensPerDay: 1e12 };
  return {
    main: new FakeProvider({ usage, caps }, [], devFakeResponder),
    check: new FakeProvider({ usage, caps }, [], devFakeResponder),
  };
}

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
    llm: opts.deps?.llm ?? defaultLlm(),
    background: opts.deps?.background ?? new InProcessBackground(app.log),
    payments: opts.deps?.payments ?? new FakeGateway(),
  };

  registerErrorHandler(app);
  app.register(cookie);
  app.register(healthRoutes);
  app.register(authRoutes, { ...config, ...deps });
  app.register(courseRoutes, deps);
  app.register(dayRoutes, deps);
  app.register(gradingRoutes, deps);
  app.register(replanRoutes, deps);
  app.register(creditRoutes, deps);
  app.register(paymentRoutes, deps);
  app.register(intakeRoutes, deps);
  app.register(galleryRoutes, deps);

  return app;
}
