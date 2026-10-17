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
};

const MAX_ATTEMPTS = 2; // the first try plus one retry with the validation error fed back

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

      const started = performance.now();
      let response: ModelResponse;
      try {
        response = await this.callModel(currentPrompt, jsonSchema);
      } catch (err) {
        await this.log({ purpose, attempt, started, status: 'error', error: safeError(err) });
        throw new AppError(
          'LLM_UNAVAILABLE',
          'The AI provider is unavailable. Try again later.',
          undefined,
          err,
        );
      }

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
