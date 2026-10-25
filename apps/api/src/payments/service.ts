import type { Types } from 'mongoose';
import { z } from 'zod';
import {
  CREDIT_PACKS,
  type CheckoutOrder,
  type CreditPackId,
  type PaymentResult,
  type VerifyPaymentInput,
} from '@ricfey/shared';
import { hitRateLimit } from '../auth/rate-limit';
import { applyEntry, creditTransaction } from '../credits/service';
import { randomToken } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { CreditAccountModel } from '../models/credit-account';
import { PaymentModel, type PaymentDoc } from '../models/payment';
import { WebhookEventModel } from '../models/webhook-event';
import type { PaymentGateway } from './gateway';

export type PaymentDeps = { payments: PaymentGateway; now: () => Date };

const ORDERS_PER_HOUR = 10;

export async function createOrder(
  userId: Types.ObjectId,
  packId: CreditPackId,
  deps: PaymentDeps,
): Promise<CheckoutOrder> {
  await hitRateLimit({
    key: `orders:${userId.toString()}`,
    limit: ORDERS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
    now: deps.now(),
  });
  const pack = CREDIT_PACKS.find((p) => p.id === packId)!;
  // Razorpay: receipt is at most 40 characters and unique.
  const receipt = `rf_${randomToken(18)}`.slice(0, 40);
  const order = await deps.payments.createOrder({
    amountPaise: pack.pricePaise,
    receipt,
    notes: { packId: pack.id, credits: String(pack.credits) },
  });
  await PaymentModel.create({
    userId,
    packId: pack.id,
    credits: pack.credits,
    amountPaise: pack.pricePaise,
    gateway: deps.payments.name,
    orderId: order.id,
    receipt,
    status: 'created',
  });
  return {
    orderId: order.id,
    amountPaise: pack.pricePaise,
    currency: 'INR',
    keyId: deps.payments.keyId,
    gateway: deps.payments.name,
    pack,
  };
}

/**
 * Mark the order paid and add its credits, in one transaction. Idempotent: checkout and the
 * webhook may both arrive (in either order, more than once); only the first one credits.
 */
export async function fulfil(
  payment: PaymentDoc,
  paymentId: string,
  via: 'checkout' | 'webhook',
  now: Date,
): Promise<void> {
  await creditTransaction(payment.userId, async (session) => {
    await PaymentModel.updateOne(
      { _id: payment._id, status: { $ne: 'paid' } },
      { $set: { status: 'paid', paymentId, paidAt: now, paidVia: via } },
      { session },
    );
    await applyEntry(
      {
        userId: payment.userId,
        delta: payment.credits,
        reason: 'purchase',
        idempotencyKey: `payment:${payment.orderId}`,
        note: `Bought ${payment.credits} credits (₹${payment.amountPaise / 100})`,
      },
      session,
    );
  });
}

async function result(payment: PaymentDoc): Promise<PaymentResult> {
  const [fresh, account] = await Promise.all([
    PaymentModel.findById(payment._id).lean(),
    CreditAccountModel.findOne({ userId: payment.userId }).lean(),
  ]);
  return { status: fresh!.status, credits: payment.credits, balance: account?.balance ?? 0 };
}

/** The page's proof of payment. The order id is looked up for this learner, never trusted. */
export async function verifyCheckout(
  userId: Types.ObjectId,
  input: VerifyPaymentInput,
  deps: PaymentDeps,
): Promise<PaymentResult> {
  const payment = await PaymentModel.findOne({ orderId: input.orderId, userId });
  if (!payment) throw new AppError('NOT_FOUND', 'Order not found');
  if (!deps.payments.verifyPaymentSignature(payment.orderId, input.paymentId, input.signature)) {
    throw new AppError(
      'BAD_REQUEST',
      'This payment could not be verified. You were not charged credits.',
    );
  }
  await fulfil(payment, input.paymentId, 'checkout', deps.now());
  return result(payment);
}

// Razorpay webhook payloads. Only the fields we use; the exact paths are [UNVERIFIED] against
// a live event, so both the payment and the order entity are accepted.
const WebhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              id: z.string(),
              order_id: z.string().nullish(),
              amount: z.number().optional(),
            })
            .loose(),
        })
        .optional(),
      order: z
        .object({ entity: z.object({ id: z.string(), amount: z.number().optional() }).loose() })
        .optional(),
    })
    .loose(),
});

const PAID_EVENTS = new Set(['order.paid', 'payment.captured']);

/**
 * Handle a webhook whose signature is already verified. Returns what happened, for the log.
 * Redeliveries (same event id) and unknown orders are acknowledged and ignored.
 */
export async function handleWebhook(
  rawBody: string,
  eventId: string | undefined,
  deps: PaymentDeps,
): Promise<'duplicate' | 'ignored' | 'credited' | 'amount_mismatch'> {
  const parsed = WebhookSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) return 'ignored';
  const { event, payload } = parsed.data;
  if (eventId) {
    try {
      await WebhookEventModel.create({ provider: deps.payments.name, eventId, event });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) return 'duplicate';
      throw err;
    }
  }
  if (!PAID_EVENTS.has(event)) return 'ignored';
  const orderId = payload.payment?.entity.order_id ?? payload.order?.entity.id;
  const paymentId = payload.payment?.entity.id;
  if (!orderId || !paymentId) return 'ignored';
  const payment = await PaymentModel.findOne({ orderId });
  if (!payment) return 'ignored';
  const amount = payload.payment?.entity.amount ?? payload.order?.entity.amount;
  if (amount !== undefined && amount !== payment.amountPaise) return 'amount_mismatch';
  await fulfil(payment, paymentId, 'webhook', deps.now());
  return 'credited';
}
