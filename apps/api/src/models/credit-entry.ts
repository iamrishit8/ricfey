import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CREDIT_REASONS } from '@ricfey/shared';

/**
 * The ledger: every change to a balance, append-only. `idempotencyKey` is unique, so the same
 * charge or grant (e.g. "day:<course>:3", "payment:<order>") can never be written twice.
 */
const creditEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: CREDIT_REASONS, required: true },
    idempotencyKey: { type: String, required: true },
    note: { type: String, required: true, maxlength: 200 },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

creditEntrySchema.index({ idempotencyKey: 1 }, { unique: true });
creditEntrySchema.index({ userId: 1, createdAt: -1 });

export type CreditEntry = InferSchemaType<typeof creditEntrySchema>;
export type CreditEntryDoc = HydratedDocument<CreditEntry>;
export const CreditEntryModel = model('CreditEntry', creditEntrySchema, 'creditEntries');
