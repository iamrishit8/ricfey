import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    // Always stored lowercased and trimmed so lookups are exact matches.
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    avatarUrl: { type: String },
    googleId: { type: String },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
// Unique only among users that have a googleId; magic-link-only users have none.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
