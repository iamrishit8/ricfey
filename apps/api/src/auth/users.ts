import { UserModel, type UserDoc } from '../models/user';
import type { GoogleProfile } from './google';

/** Magic link proved the person controls this email: find or create, mark verified. */
export async function upsertUserByEmail(email: string, now: Date): Promise<UserDoc> {
  return UserModel.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, emailVerifiedAt: now }, $set: { lastLoginAt: now } },
    { upsert: true, returnDocument: 'after' },
  ).orFail();
}

/**
 * Google login. Match on googleId first; otherwise on verified email, linking the Google
 * account to an existing magic-link user; otherwise create.
 */
export async function upsertUserFromGoogle(p: GoogleProfile, now: Date): Promise<UserDoc> {
  const byGoogle = await UserModel.findOne({ googleId: p.sub });
  if (byGoogle) {
    byGoogle.lastLoginAt = now;
    return byGoogle.save();
  }
  return UserModel.findOneAndUpdate(
    { email: p.email },
    {
      $set: { googleId: p.sub, lastLoginAt: now },
      $setOnInsert: {
        email: p.email,
        emailVerifiedAt: now,
        name: p.name ?? undefined,
        avatarUrl: p.picture ?? undefined,
      },
    },
    { upsert: true, returnDocument: 'after' },
  ).orFail();
}
