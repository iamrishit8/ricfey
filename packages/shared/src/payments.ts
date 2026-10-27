import { z } from 'zod';

// Credit packs. Prices in paise (₹1 = 100 paise), as Razorpay expects
// (https://razorpay.com/docs/api/orders/create/). Placeholder prices; see docs/pricing.md.
export const CREDIT_PACKS = [
  { id: 'spark', credits: 100, pricePaise: 9_900, label: 'Spark' },
  { id: 'starter', credits: 330, pricePaise: 29_900, label: 'Starter' },
  { id: 'regular', credits: 575, pricePaise: 49_900, label: 'Regular' },
  { id: 'big', credits: 1_200, pricePaise: 99_900, label: 'Big' },
  { id: 'mega', credits: 2_500, pricePaise: 199_900, label: 'Mega' },
] as const;
export type CreditPack = (typeof CREDIT_PACKS)[number];
export type CreditPackId = CreditPack['id'];

export const CreateOrderSchema = z.object({
  packId: z.enum(CREDIT_PACKS.map((p) => p.id) as [CreditPackId, ...CreditPackId[]]),
});

/** What Razorpay Checkout hands back to the page after a successful payment. */
export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid signature'),
});
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;

export type PaymentGatewayName = 'fake' | 'razorpay';

/** Everything the page needs to open Checkout for an order. */
export type CheckoutOrder = {
  orderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
  gateway: PaymentGatewayName;
  pack: CreditPack;
};

export type PaymentStatus = 'created' | 'paid' | 'failed';
export type PaymentResult = { status: PaymentStatus; credits: number; balance: number };
