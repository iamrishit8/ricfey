import { Schema, model, type InferSchemaType } from 'mongoose';

const magicTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

magicTokenSchema.index({ tokenHash: 1 }, { unique: true });
// Keep used/expired tokens a day for debugging, then let MongoDB delete them.
magicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export type MagicToken = InferSchemaType<typeof magicTokenSchema>;
export const MagicTokenModel = model('MagicToken', magicTokenSchema, 'magicTokens');
