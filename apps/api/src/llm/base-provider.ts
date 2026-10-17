import type { z } from 'zod';
import type { LlmPurpose } from '@ricfey/shared';
import { AppError } from '../lib/errors';
import { toGeminiJsonSchema } from './json-schema';
import { estimateCostUsd } from './pricing';
import type {
  LlmCallRecord,
  LlmCaps,
  LlmProvider,
  LlmUsageStore,
  ModelResponse,
  StructuredResult,
} from './types';

export type ProviderDeps = {
  usage: LlmUsageStore;
  caps: LlmCaps;
  now?: () => Date;
  /** Waits before retrying a transient provider error. Injected so tests don't sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** Delay before each transient retry; its length is the number of transient retries. */
  transientBackoffMs?: number[];
};

const MAX_ATTEMPTS = 2; // the first try plus one retry with the validation error fed back
const DEFAULT_BACKOFF_MS = [5_000, 20_000];
const TRANSIENT_STATUSES = new Set([429, 500, 503]);

/**
 * The single place that enforces the daily cap, logs every call, validates output and retries.
 * Concrete providers implement only `callModel`.
 */
export abstract class BaseLlmProvider implements LlmProvider {
  abstract readonly name: string;
  abstract readonly model: string;

  constructor(private readonly deps: ProviderDeps) {}

  /** One raw call to the model. Throw on transport/API errors. */
  protected abstract callModel(prompt: string, jsonSchema: unknown): Promise<ModelResponse>;

  async generateStructured<S extends z.ZodType>(
    schema: S,
    prompt: string,
    purpose: LlmPurpose,
  ): Promise<StructuredResult<z.infer<S>>> {
    const jsonSchema = toGeminiJsonSchema(schema);
    let currentPrompt = prompt;
    let lastProblem = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await this.assertUnderCap();

      const { response, started } = await this.callWithBackoff(
        currentPrompt,
        jsonSchema,
        purpose,
        attempt,
      );

      const problem = parseAndValidate(schema, response.text);
      await this.log({
        purpose,
        attempt,
        started,
        status: problem.ok ? 'ok' : 'invalid_output',
        response,
        error: problem.ok ? undefined : problem.message.slice(0, 500),
      });

      if (problem.ok) return { data: problem.data, attempts: attempt };

      lastProblem = problem.message;
      currentPrompt =
        `${prompt}\n\n---\nYour previous response was rejected for these reasons:\n` +
        `${problem.message}\nReturn ONLY a JSON object that matches the schema and fixes them.`;
    }

    throw new AppError(
      'LLM_INVALID_OUTPUT',
      'The AI returned an invalid response.',
      undefined,
      new Error(lastProblem.slice(0, 500)),
    );
  }

  /**
   * One model call. Transient errors (429/500/503) are retried after a backoff; every try is
   * cap-checked and logged. Other errors, or running out of retries, become LLM_UNAVAILABLE.
   */
  private async callWithBackoff(
    prompt: string,
    jsonSchema: unknown,
    purpose: LlmPurpose,
    attempt: number,
  ): Promise<{ response: ModelResponse; started: number }> {
    const backoff = this.deps.transientBackoffMs ?? DEFAULT_BACKOFF_MS;
    const sleep = this.deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    for (let retry = 0; ; retry++) {
      if (retry > 0) await this.assertUnderCap();
      const started = performance.now();
      try {
        return { response: await this.callModel(prompt, jsonSchema), started };
      } catch (err) {
        await this.log({ purpose, attempt, started, status: 'error', error: safeError(err) });
        const status = (err as { status?: unknown }).status;
        const delay = backoff[retry];
        // A daily quota ("...PerDay...") won't clear in seconds; retrying only wastes calls.
        const dailyQuota = status === 429 && /PerDay/i.test(String((err as Error).message));
        if (
          typeof status === 'number' &&
          TRANSIENT_STATUSES.has(status) &&
          !dailyQuota &&
          delay !== undefined
        ) {
          await sleep(delay);
          continue;
        }
        throw new AppError(
          'LLM_UNAVAILABLE',
          'The AI provider is unavailable. Try again later.',
          undefined,
          err,
        );
      }
    }
  }

  private async assertUnderCap(): Promise<void> {
    const now = this.deps.now?.() ?? new Date();
    const { calls, tokens } = await this.deps.usage.todayTotals(now);
    const { maxCallsPerDay, maxTokensPerDay } = this.deps.caps;
    if (calls >= maxCallsPerDay || tokens >= maxTokensPerDay) {
      // Usage numbers go in `cause` (logs/scripts), not `details` (client).
      throw new AppError(
        'LLM_CAP_REACHED',
        'Daily AI usage limit reached. Try again tomorrow.',
        undefined,
        new Error(`calls ${calls}/${maxCallsPerDay}, tokens ${tokens}/${maxTokensPerDay}`),
      );
    }
  }

  private async log(input: {
    purpose: LlmPurpose;
    attempt: number;
    started: number;
    status: LlmCallRecord['status'];
    response?: ModelResponse;
    error?: string;
  }): Promise<void> {
    const createdAt = this.deps.now?.() ?? new Date();
    const tokensIn = input.response?.tokensIn ?? 0;
    const tokensOut = input.response?.tokensOut ?? 0;
    await this.deps.usage.record({
      purpose: input.purpose,
      provider: this.name,
      model: this.model,
      status: input.status,
      attempt: input.attempt,
      tokensIn,
      tokensOut,
      tokensThinking: input.response?.tokensThinking ?? 0,
      latencyMs: Math.round(performance.now() - input.started),
      estimatedCostUsd: estimateCostUsd({ model: this.model, tokensIn, tokensOut, at: createdAt }),
      error: input.error,
      createdAt,
    });
  }
}

type Parsed<T> = { ok: true; data: T } | { ok: false; message: string };

function parseAndValidate<S extends z.ZodType>(schema: S, text: string): Parsed<z.infer<S>> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: '- The response was not valid JSON.' };
  }
  const result = schema.safeParse(json);
  if (result.success) return { ok: true, data: result.data };
  const lines = result.error.issues
    .slice(0, 20)
    .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`);
  return { ok: false, message: lines.join('\n') };
}

/** Error summary safe to store: class name, HTTP status if any, first line of message. */
function safeError(err: unknown): string {
  if (!(err instanceof Error)) return 'unknown error';
  const status = (err as { status?: unknown }).status;
  const firstLine = err.message.split('\n')[0]?.slice(0, 200) ?? '';
  return `${err.name}${typeof status === 'number' ? ` ${status}` : ''}: ${firstLine}`;
}
