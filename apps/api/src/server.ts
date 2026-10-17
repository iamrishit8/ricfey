import { buildApp } from './app';
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
