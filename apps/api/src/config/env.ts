import { z } from 'zod';

// `KEY=` in .env arrives as "". Treat that as unset, not as an invalid value.
const optionalString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);

/** LLM settings. Split out so offline scripts can load them without a database. */
export const LlmEnvSchema = z.object({
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  // Cheaper model for the lesson self-check (Phase 2).
  GEMINI_CHECK_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  // fake = offline placeholder content for every LLM call; gemini = real calls (uses quota).
  LLM_PROVIDER: z.enum(['fake', 'gemini']).default('fake'),
  LLM_DAILY_CALL_CAP: z.coerce.number().int().min(1).default(16),
  LLM_DAILY_TOKEN_CAP: z.coerce.number().int().min(1).default(1_000_000),
});

const EnvSchema = LlmEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WEB_URL: z.url().default('http://localhost:5173'),
  // Chrome and Firefox accept Secure cookies on http://localhost; Safari does not.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  // fake = offline payments with the same signature checks (no money); razorpay = real API.
  PAYMENTS_PROVIDER: z.enum(['fake', 'razorpay']).default('fake'),
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  MONGODB_URI: z
    .string({ error: 'is required' })
    .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
      message: 'must start with mongodb:// or mongodb+srv://',
    }),
});

const EnvWithRules = EnvSchema.superRefine((env, ctx) => {
  const google = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI];
  if (google.some(Boolean) && !google.every(Boolean)) {
    ctx.addIssue({
      code: 'custom',
      path: ['GOOGLE_CLIENT_ID'],
      message: 'set all of GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, or none',
    });
  }
  if (env.LLM_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['GEMINI_API_KEY'],
      message: 'is required when LLM_PROVIDER=gemini',
    });
  }
  if (
    env.PAYMENTS_PROVIDER === 'razorpay' &&
    !(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['RAZORPAY_KEY_ID'],
      message:
        'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required when PAYMENTS_PROVIDER=razorpay',
    });
  }
  if (env.NODE_ENV === 'production') {
    if (env.PAYMENTS_PROVIDER !== 'razorpay') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENTS_PROVIDER'],
        message: 'must be razorpay in production',
      });
    }
    if (env.LLM_PROVIDER !== 'gemini') {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_PROVIDER'],
        message: 'must be gemini in production',
      });
    }
    if (!env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'is required in production',
      });
    }
    if (!env.EMAIL_FROM) {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_FROM'], message: 'is required in production' });
    }
    if (!env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'must be true in production',
      });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;
export type LlmEnv = z.infer<typeof LlmEnvSchema>;

/**
 * Parse env vars or throw one readable error listing every problem.
 * Messages name the variable, never its value, so secrets cannot leak into logs.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return parseOrThrow(EnvWithRules, source);
}

export function loadLlmEnv(source: Record<string, string | undefined> = process.env): LlmEnv {
  return parseOrThrow(LlmEnvSchema, source);
}

function parseOrThrow<S extends z.ZodType>(schema: S, source: unknown): z.infer<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(
    `Invalid environment configuration:\n${lines.join('\n')}\nSee .env.example and README.md.`,
  );
}
