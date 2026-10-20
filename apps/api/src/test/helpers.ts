import { afterAll, beforeAll } from 'bun:test';
import mongoose from 'mongoose';
import { SESSION_COOKIE } from '../auth/session';
import { connectDb, disconnectDb } from '../db/connect';
import { randomToken, sha256 } from '../lib/crypto';
import { SessionModel } from '../models/session';
import { UserModel } from '../models/user';

export const TEST_DB_URI = process.env.MONGODB_URI_TEST;

/** Connect once per test file and leave an empty database behind. */
export function useTestDb(): void {
  beforeAll(async () => {
    await connectDb(TEST_DB_URI!, { autoIndex: true });
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });
}

/** A user with a live session; returns the cookie to pass to app.inject(). */
export async function signedInUser(email: string) {
  const user = await UserModel.create({ email, emailVerifiedAt: new Date() });
  const token = randomToken();
  await SessionModel.create({
    tokenHash: sha256(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return { user, cookies: { [SESSION_COOKIE]: token } };
}
