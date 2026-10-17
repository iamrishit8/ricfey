import type { LlmEnv } from '../config/env';
import { GeminiProvider } from './gemini-provider';
import type { LlmUsageStore } from './types';

/** Build the real provider from env. The only place GeminiProvider is constructed. */
export function createGeminiProvider(env: LlmEnv, usage: LlmUsageStore, model = env.GEMINI_MODEL) {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set. Create one at https://aistudio.google.com/apikey and add it to .env. ' +
        'Or run with --provider fake.',
    );
  }
  return new GeminiProvider(
    {
      usage,
      caps: { maxCallsPerDay: env.LLM_DAILY_CALL_CAP, maxTokensPerDay: env.LLM_DAILY_TOKEN_CAP },
    },
    model,
    env.GEMINI_API_KEY,
  );
}
