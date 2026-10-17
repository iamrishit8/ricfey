import { z } from 'zod';

const EnvSchema = z.object({
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

/**
 * Parse env vars or throw one readable error listing every problem.
 * Messages name the variable, never its value, so secrets cannot leak into logs.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(
    `Invalid environment configuration:\n${lines.join('\n')}\nSee .env.example and README.md.`,
  );
}
