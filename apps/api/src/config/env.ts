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
  LLM_DAILY_CALL_CAP: z.coerce.number().int().min(1).default(16),
  LLM_DAILY_TOKEN_CAP: z.coerce.number().int().min(1).default(1_000_000),
});

const EnvSchema = LlmEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGODB_URI: z
    .string({ error: 'is required' })
    .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
      message: 'must start with mongodb:// or mongodb+srv://',
    }),
});

export type Env = z.infer<typeof EnvSchema>;
export type LlmEnv = z.infer<typeof LlmEnvSchema>;

/**
 * Parse env vars or throw one readable error listing every problem.
 * Messages name the variable, never its value, so secrets cannot leak into logs.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return parseOrThrow(EnvSchema, source);
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
