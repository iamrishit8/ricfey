import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** One row per order created for a credit pack. Credited once, by checkout or by webhook. */
const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    packId: { type: String, required: true },
    credits: { type: Number, required: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    gateway: { type: String, enum: ['fake', 'razorpay'], required: true },
    orderId: { type: String, required: true },
    receipt: { type: String, required: true },
    status: { type: String, enum: ['created', 'paid', 'failed'], required: true },
    paymentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    paidVia: { type: String, enum: ['checkout', 'webhook', null], default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, createdAt: -1 });

export type Payment = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<Payment>;
export const PaymentModel = model('Payment', paymentSchema, 'payments');
