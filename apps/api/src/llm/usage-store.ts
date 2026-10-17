import { LlmCallModel } from '../models/llm-call';
import type { LlmCallRecord, LlmUsageStore, UsageTotals } from './types';

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Production store: the llmCalls collection. */
export class MongoLlmUsageStore implements LlmUsageStore {
  async record(call: LlmCallRecord): Promise<void> {
    await LlmCallModel.create(call);
  }

  async todayTotals(now: Date): Promise<UsageTotals> {
    const [row] = await LlmCallModel.aggregate<UsageTotals>([
      { $match: { createdAt: { $gte: startOfUtcDay(now) } } },
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          tokens: { $sum: { $add: ['$tokensIn', '$tokensOut'] } },
        },
      },
      { $project: { _id: 0, calls: 1, tokens: 1 } },
    ]);
    return row ?? { calls: 0, tokens: 0 };
  }
}

/** For tests and offline fake runs. */
export class InMemoryLlmUsageStore implements LlmUsageStore {
  readonly calls: LlmCallRecord[] = [];

  async record(call: LlmCallRecord): Promise<void> {
    this.calls.push(call);
  }

  async todayTotals(now: Date): Promise<UsageTotals> {
    const since = startOfUtcDay(now).getTime();
    const today = this.calls.filter((c) => c.createdAt.getTime() >= since);
    return {
      calls: today.length,
      tokens: today.reduce((sum, c) => sum + c.tokensIn + c.tokensOut, 0),
    };
  }
}
