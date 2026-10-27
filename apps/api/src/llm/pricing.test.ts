import { describe, expect, test } from 'bun:test';
import { estimateCostUsd, priceFor } from './pricing';

const before = new Date('2026-12-31T23:59:59Z');
const after = new Date('2027-01-01T00:00:00Z');

describe('pricing', () => {
  test('gemini-3.8-flash doubles on 2027-01-01', () => {
    expect(priceFor('gemini-3.8-flash', before)).toMatchObject({
      inputPerM: 0.75,
      outputPerM: 3.75,
    });
    expect(priceFor('gemini-3.8-flash', after)).toMatchObject({ inputPerM: 1.5, outputPerM: 7.5 });
  });

  test('gemini-3.5-flash-lite has one price', () => {
    expect(priceFor('gemini-3.5-flash-lite', after)).toMatchObject({
      inputPerM: 0.3,
      outputPerM: 2.5,
    });
  });

  test('cost = in × input price + out × output price, per million', () => {
    const args = { model: 'gemini-3.8-flash', tokensIn: 2_000, tokensOut: 4_000 };
    expect(estimateCostUsd({ ...args, at: before })).toBeCloseTo(
      (2000 * 0.75 + 4000 * 3.75) / 1e6,
      10,
    );
    expect(estimateCostUsd({ ...args, at: after })).toBeCloseTo(
      (2000 * 1.5 + 4000 * 7.5) / 1e6,
      10,
    );
  });

  test('unknown model has no price rather than a silent zero', () => {
    expect(estimateCostUsd({ model: 'gemini-9', tokensIn: 1, tokensOut: 1, at: after })).toBeNull();
  });
});
