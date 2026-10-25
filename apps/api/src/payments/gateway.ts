import { createHmac } from 'node:crypto';
import { AppError } from '../lib/errors';
import { randomToken, safeEqual } from '../lib/crypto';

export type GatewayOrder = { id: string; amount: number; currency: string };

/**
 * A payment provider. Signatures follow Razorpay's documented scheme, which both
 * implementations share (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/):
 * - checkout: HMAC-SHA256(order_id + "|" + payment_id, key_secret), hex
 * - webhook:  HMAC-SHA256(raw request body, webhook_secret), hex, in X-Razorpay-Signature
 *   (https://razorpay.com/docs/webhooks/validate-test/)
 */
export interface PaymentGateway {
  readonly name: 'fake' | 'razorpay';
  readonly keyId: string;
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<GatewayOrder>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

export const hmacHex = (secret: string, message: string) =>
  createHmac('sha256', secret).update(message).digest('hex');

abstract class SignedGateway {
  constructor(
    protected readonly keySecret: string,
    protected readonly webhookSecret: string,
  ) {}
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    return safeEqual(hmacHex(this.keySecret, `${orderId}|${paymentId}`), signature);
  }
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return safeEqual(hmacHex(this.webhookSecret, rawBody), signature);
  }
}

/** Real Razorpay Orders API over HTTPS with Basic auth. Test-mode keys move no real money. */
export class RazorpayGateway extends SignedGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;
  constructor(
    readonly keyId: string,
    keySecret: string,
    webhookSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super(keySecret, webhookSecret);
  }

  async createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<GatewayOrder> {
    let res: Response;
    try {
      res = await this.fetchImpl('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: input.amountPaise,
          currency: 'INR',
          receipt: input.receipt,
          notes: input.notes,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Payments are unavailable. Try again.',
        undefined,
        err,
      );
    }
    if (!res.ok) {
      // The body may echo request details; log only the status.
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Payments are unavailable. Try again.',
        undefined,
        new Error(`Razorpay orders API returned ${res.status}`),
      );
    }
    const body = (await res.json()) as Partial<GatewayOrder>;
    if (typeof body.id !== 'string' || body.amount !== input.amountPaise)
      throw new AppError('SERVICE_UNAVAILABLE', 'Payments are unavailable. Try again.');
    return { id: body.id, amount: body.amount, currency: body.currency ?? 'INR' };
  }
}

/** Fixed secrets for the fake gateway. Not secret: they only sign fake payments. */
export const FAKE_KEY_SECRET = 'fake_key_secret';
export const FAKE_WEBHOOK_SECRET = 'fake_webhook_secret';

/**
 * Offline stand-in with the same signature scheme, so verification code is exercised for real.
 * `simulatePayment` plays the part of Checkout. No money exists anywhere in this path.
 */
export class FakeGateway extends SignedGateway implements PaymentGateway {
  readonly name = 'fake' as const;
  readonly keyId = 'fake_key_id';
  constructor() {
    super(FAKE_KEY_SECRET, FAKE_WEBHOOK_SECRET);
  }
  async createOrder(input: { amountPaise: number }): Promise<GatewayOrder> {
    return { id: `order_fake${randomToken(9)}`, amount: input.amountPaise, currency: 'INR' };
  }
  simulatePayment(orderId: string): { paymentId: string; signature: string } {
    const paymentId = `pay_fake${randomToken(9)}`;
    return { paymentId, signature: hmacHex(FAKE_KEY_SECRET, `${orderId}|${paymentId}`) };
  }
}
