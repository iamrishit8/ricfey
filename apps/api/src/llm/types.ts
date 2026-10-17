import type { z } from 'zod';
import type { LlmPurpose } from '@ricfey/shared';

/** What every provider returns from one raw model call. */
export type ModelResponse = {
  text: string;
  tokensIn: number;
  /** Visible output tokens plus thinking tokens (both are billed as output). */
  tokensOut: number;
  /** The thinking part of tokensOut, kept separately so its cost is visible. */
  tokensThinking: number;
};

export type StructuredResult<T> = {
  data: T;
  /** Model calls made, including the retry if there was one. */
  attempts: number;
};

/** The interface the rest of the app depends on. Never import a provider SDK elsewhere. */
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<S extends z.ZodType>(
    schema: S,
    prompt: string,
    purpose: LlmPurpose,
  ): Promise<StructuredResult<z.infer<S>>>;
}

export type LlmCallStatus = 'ok' | 'invalid_output' | 'error';

export type LlmCallRecord = {
  purpose: LlmPurpose;
  provider: string;
  model: string;
  status: LlmCallStatus;
  attempt: number;
  tokensIn: number;
  tokensOut: number;
  tokensThinking: number;
  latencyMs: number;
  estimatedCostUsd: number | null;
  /** Safe summary only. Never the prompt or the API key. */
  error?: string;
  createdAt: Date;
};

export type UsageTotals = { calls: number; tokens: number };

/** Where calls are recorded and today's usage is read back from. */
export interface LlmUsageStore {
  record(call: LlmCallRecord): Promise<void>;
  /** Calls and tokens (in + out) since 00:00 UTC on `now`'s date. */
  todayTotals(now: Date): Promise<UsageTotals>;
}

export type LlmCaps = { maxCallsPerDay: number; maxTokensPerDay: number };
