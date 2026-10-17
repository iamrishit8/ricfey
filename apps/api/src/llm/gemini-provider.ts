import { GoogleGenAI } from '@google/genai';
import { BaseLlmProvider, type ProviderDeps } from './base-provider';
import type { ModelResponse } from './types';

/**
 * Gemini via the official SDK (@google/genai), using generateContent with a JSON schema.
 * Docs: https://ai.google.dev/gemini-api/docs/structured-output
 * [UNVERIFIED against the live API until a key exists.]
 */
export class GeminiProvider extends BaseLlmProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    deps: ProviderDeps,
    readonly model: string,
    apiKey: string,
  ) {
    super(deps);
    // Pass the key explicitly so a stray GOOGLE_API_KEY in the shell can't take precedence.
    this.client = new GoogleGenAI({ apiKey });
  }

  protected async callModel(prompt: string, jsonSchema: unknown): Promise<ModelResponse> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseJsonSchema: jsonSchema },
    });
    const usage = res.usageMetadata;
    const thinking = usage?.thoughtsTokenCount ?? 0;
    return {
      text: res.text ?? '',
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: (usage?.candidatesTokenCount ?? 0) + thinking,
      tokensThinking: thinking,
    };
  }
}
