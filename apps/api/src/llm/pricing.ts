/**
 * Paid-tier prices per 1M tokens (USD), standard tier, text input.
 * Source: https://ai.google.dev/gemini-api/docs/pricing (read 2026-10-17).
 * The free tier is free of charge for these models; these prices are what the same usage
 * would cost on the paid tier, which is what real users will need.
 * Thinking tokens are billed as output.
 */
export const PRICING_SOURCE = 'https://ai.google.dev/gemini-api/docs/pricing';
export const PRICING_READ_ON = '2026-10-17';

type PricePeriod = {
  /** First day (UTC, inclusive) this price applies. null = already in effect. */
  from: string | null;
  inputPerM: number;
  outputPerM: number;
};

const PRICES: Record<string, PricePeriod[]> = {
  'gemini-3.8-flash': [
    { from: null, inputPerM: 0.75, outputPerM: 3.75 },
    { from: '2027-01-01', inputPerM: 1.5, outputPerM: 7.5 },
  ],
  'gemini-3.5-flash-lite': [{ from: null, inputPerM: 0.3, outputPerM: 2.5 }],
  fake: [{ from: null, inputPerM: 0, outputPerM: 0 }],
};

export const PRICED_MODELS = Object.keys(PRICES).filter((m) => m !== 'fake');

/** The date from which the newest known price change applies (for "future" estimates). */
export const FUTURE_PRICE_DATE = '2027-01-01';

/** Price in effect for `model` on `at`, or null if the model is not in the table. */
export function priceFor(model: string, at: Date): PricePeriod | null {
  const periods = PRICES[model];
  if (!periods) return null;
  const day = at.toISOString().slice(0, 10);
  let current: PricePeriod | null = null;
  for (const p of periods) {
    if (p.from === null || p.from <= day) current = p;
  }
  return current;
}

/** Estimated USD cost of one call. null when the model has no known price. */
export function estimateCostUsd(input: {
  model: string;
  tokensIn: number;
  tokensOut: number;
  at: Date;
}): number | null {
  const price = priceFor(input.model, input.at);
  if (!price) return null;
  return (input.tokensIn * price.inputPerM + input.tokensOut * price.outputPerM) / 1_000_000;
}
