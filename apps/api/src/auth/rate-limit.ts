import { AppError } from '../lib/errors';
import { RateLimitModel } from '../models/rate-limit';

/**
 * Fixed-window counter in MongoDB. The upsert + $inc is atomic, so concurrent requests can't
 * both slip under the limit, and it works across several API processes.
 */
export async function hitRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now: Date;
}): Promise<void> {
  const windowStart = new Date(Math.floor(input.now.getTime() / input.windowMs) * input.windowMs);
  const doc = await RateLimitModel.findOneAndUpdate(
    { key: input.key, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(windowStart.getTime() + input.windowMs) },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (doc.count > input.limit) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many requests. Please wait a few minutes and try again.',
    );
  }
}
