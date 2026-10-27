import { buildApp } from './app';
import { HttpGoogleOAuthClient } from './auth/google';
import { ResendMailer } from './auth/mailer';
import { createLlmProviders } from './llm/factory';
import { FakeGateway, RazorpayGateway } from './payments/gateway';
import { MongoLlmUsageStore } from './llm/usage-store';
import { loadEnv } from './config/env';
import { connectDb, disconnectDb, redactCredentials } from './db/connect';

let env;
try {
  env = loadEnv();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

const app = buildApp({
  logger: {
    level: env.LOG_LEVEL,
    // Never log credentials, even by accident.
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    // Log paths without query strings: the OAuth callback carries a code and state.
    serializers: {
      req: (req: { method: string; url: string }) => ({
        method: req.method,
        url: req.url.split('?')[0],
      }),
    },
  },
  config: {
    webUrl: env.WEB_URL,
    cookieSecure: env.COOKIE_SECURE,
    trustProxy: env.TRUST_PROXY,
    sessionTtlDays: env.SESSION_TTL_DAYS,
  },
  deps: {
    // No Resend key: magic links are printed to the console (env rules forbid that in production).
    mailer:
      env.RESEND_API_KEY && env.EMAIL_FROM
        ? new ResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM)
        : undefined,
    // Every LLM call is capped and logged to llmCalls in MongoDB.
    llm: createLlmProviders(env, new MongoLlmUsageStore()),
    // Fake payments sign like Razorpay but move no money; env rules require razorpay in production.
    payments:
      env.PAYMENTS_PROVIDER === 'razorpay'
        ? new RazorpayGateway(
            env.RAZORPAY_KEY_ID!,
            env.RAZORPAY_KEY_SECRET!,
            env.RAZORPAY_WEBHOOK_SECRET!,
          )
        : new FakeGateway(),
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI
        ? new HttpGoogleOAuthClient({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUri: env.GOOGLE_REDIRECT_URI,
          })
        : null,
  },
});

try {
  await connectDb(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production' });
  app.log.info('Connected to MongoDB');
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  const e = err as Error;
  const cause = e.cause instanceof Error ? ` Cause: ${redactCredentials(e.cause.message)}` : '';
  app.log.fatal(e.message + cause);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    await disconnectDb();
    process.exit(0);
  });
}
