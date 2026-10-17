import { Schema, model, type InferSchemaType } from 'mongoose';
import { LLM_PURPOSES } from '@ricfey/shared';

const llmCallSchema = new Schema(
  {
    purpose: { type: String, enum: LLM_PURPOSES, required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    status: { type: String, enum: ['ok', 'invalid_output', 'error'], required: true },
    attempt: { type: Number, required: true },
    tokensIn: { type: Number, required: true },
    tokensOut: { type: Number, required: true },
    tokensThinking: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    estimatedCostUsd: { type: Number, default: null },
    error: { type: String },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// The daily cap sums calls since midnight; reports group by purpose and model.
llmCallSchema.index({ createdAt: -1 });
llmCallSchema.index({ purpose: 1, model: 1, createdAt: -1 });

export type LlmCall = InferSchemaType<typeof llmCallSchema>;
export const LlmCallModel = model('LlmCall', llmCallSchema, 'llmCalls');
