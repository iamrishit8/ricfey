import mongoose, { type ClientSession, type Types } from 'mongoose';
import { WELCOME_CREDITS, type CreditReason, type CreditsView } from '@ricfey/shared';
import { AppError } from '../lib/errors';
import { CreditAccountModel } from '../models/credit-account';
import { CreditEntryModel } from '../models/credit-entry';

export type LedgerEntry = {
  userId: Types.ObjectId;
  /** Positive adds credits, negative spends them. */
  delta: number;
  reason: CreditReason;
  idempotencyKey: string;
  note: string;
  courseId?: Types.ObjectId;
};

/**
 * Run `fn` in a MongoDB transaction for this learner's credits. The account row is created
 * first, outside the transaction, so concurrent transactions only ever update it: two writers
 * then conflict, and the transaction helper retries the loser, which sees the first's entry.
 */
export async function creditTransaction<T>(
  userId: Types.ObjectId,
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  try {
    await CreditAccountModel.updateOne(
      { userId },
      { $setOnInsert: { balance: 0 } },
      { upsert: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err; // created concurrently: fine
  }
  return mongoose.connection.transaction(fn);
}

/**
 * Apply one ledger entry inside a `creditTransaction` session. Idempotent: if an entry with the same key exists,
 * nothing changes and false is returned. A spend that would take the balance below zero
 * throws INSUFFICIENT_CREDITS (the caller's transaction then aborts).
 */
export async function applyEntry(entry: LedgerEntry, session: ClientSession): Promise<boolean> {
  await ensureWelcome(entry.userId, session);
  return writeEntry(entry, session);
}

async function writeEntry(entry: LedgerEntry, session: ClientSession): Promise<boolean> {
  const seen = await CreditEntryModel.exists({ idempotencyKey: entry.idempotencyKey }).session(
    session,
  );
  if (seen) return false;

  const account = await CreditAccountModel.findOneAndUpdate(
    { userId: entry.userId, ...(entry.delta < 0 ? { balance: { $gte: -entry.delta } } : {}) },
    { $inc: { balance: entry.delta } },
    { session, returnDocument: 'after' },
  );
  if (!account) {
    const current = await CreditAccountModel.findOne({ userId: entry.userId }).session(session);
    throw new AppError(
      'INSUFFICIENT_CREDITS',
      `This needs ${-entry.delta} credits and you have ${current?.balance ?? 0}. Buy more to continue.`,
      { needed: -entry.delta, balance: current?.balance ?? 0 },
    );
  }
  await CreditEntryModel.create(
    [
      {
        userId: entry.userId,
        delta: entry.delta,
        balanceAfter: account.balance,
        reason: entry.reason,
        idempotencyKey: entry.idempotencyKey,
        note: entry.note,
        courseId: entry.courseId,
      },
    ],
    { session },
  );
  return true;
}

/** The one-time welcome grant. Safe to call any number of times. */
async function ensureWelcome(userId: Types.ObjectId, session: ClientSession): Promise<void> {
  await writeEntry(
    {
      userId,
      delta: WELCOME_CREDITS,
      reason: 'welcome',
      idempotencyKey: `welcome:${userId.toString()}`,
      note: 'Welcome credits',
    },
    session,
  );
}

export async function creditsView(userId: Types.ObjectId): Promise<CreditsView> {
  await creditTransaction(userId, (session) => ensureWelcome(userId, session));
  const [account, entries] = await Promise.all([
    CreditAccountModel.findOne({ userId }).lean(),
    CreditEntryModel.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(50).lean(),
  ]);
  return {
    balance: account?.balance ?? 0,
    entries: entries.map((e) => ({
      id: e._id.toString(),
      delta: e.delta,
      balanceAfter: e.balanceAfter,
      reason: e.reason,
      note: e.note,
      createdAt: (e.createdAt as Date).toISOString(),
    })),
  };
}
