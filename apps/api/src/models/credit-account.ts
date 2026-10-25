import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** One per learner. `balance` changes only together with a creditEntries row, in a transaction. */
const creditAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

creditAccountSchema.index({ userId: 1 }, { unique: true });

export type CreditAccount = InferSchemaType<typeof creditAccountSchema>;
export type CreditAccountDoc = HydratedDocument<CreditAccount>;
export const CreditAccountModel = model('CreditAccount', creditAccountSchema, 'creditAccounts');
