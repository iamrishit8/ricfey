import type { LlmPurpose } from '@ricfey/shared';
import { BaseLlmProvider, type ProviderDeps } from './base-provider';
import type { ModelResponse } from './types';

/** Returns a response for a prompt. A string is returned as-is; throw to simulate an API error. */
export type FakeResponder = (prompt: string, purpose: LlmPurpose) => string;

/**
 * Deterministic provider for tests and offline runs. Replies are consumed in order; once
 * they run out, `fallback` answers. Token counts are estimated as characters / 4.
 */
export class FakeProvider extends BaseLlmProvider {
  readonly name = 'fake';
  readonly model = 'fake';
  readonly prompts: string[] = [];
  readonly purposes: LlmPurpose[] = [];
  private readonly replies: Array<string | FakeResponder>;

  constructor(
    deps: ProviderDeps,
    replies: Array<string | FakeResponder> = [],
    private readonly fallback?: FakeResponder,
  ) {
    super(deps);
    this.replies = [...replies];
  }

  /** Queue more replies (tests). */
  push(...replies: Array<string | FakeResponder>): void {
    this.replies.push(...replies);
  }

  protected async callModel(
    prompt: string,
    _schema: unknown,
    purpose: LlmPurpose,
  ): Promise<ModelResponse> {
    this.prompts.push(prompt);
    this.purposes.push(purpose);
    const next = this.replies.shift() ?? this.fallback;
    if (next === undefined) throw new Error('FakeProvider has no reply left');
    const text = typeof next === 'string' ? next : next(prompt, purpose);
    return {
      text,
      tokensIn: Math.ceil(prompt.length / 4),
      tokensOut: Math.ceil(text.length / 4),
      tokensThinking: 0,
    };
  }
}
