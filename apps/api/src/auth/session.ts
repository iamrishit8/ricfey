import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Types } from 'mongoose';
import { AppError } from '../lib/errors';
import { randomToken, sha256 } from '../lib/crypto';
import { SessionModel } from '../models/session';
import { UserModel, type UserDoc } from '../models/user';

export const SESSION_COOKIE = 'ricfey_session';

export type SessionConfig = { cookieSecure: boolean; sessionTtlDays: number };

/** Create a session row (token stored hashed) and set the httpOnly cookie. */
export async function startSession(
  reply: FastifyReply,
  userId: Types.ObjectId,
  cfg: SessionConfig,
  now: Date,
): Promise<void> {
  const token = randomToken();
  const maxAgeSeconds = cfg.sessionTtlDays * 24 * 60 * 60;
  await SessionModel.create({
    tokenHash: sha256(token),
    userId,
    expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000),
  });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

/** The logged-in user, or a 401. Use at the top of every route that needs a user. */
export async function requireUser(req: FastifyRequest, now: Date): Promise<UserDoc> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) throw new AppError('UNAUTHORIZED', 'Please sign in.');
  const session = await SessionModel.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: now },
  }).lean();
  if (!session)
    throw new AppError('UNAUTHORIZED', 'Your session has expired. Please sign in again.');
  const user = await UserModel.findById(session.userId);
  if (!user) throw new AppError('UNAUTHORIZED', 'Please sign in.');
  return user;
}

export async function endSession(req: FastifyRequest, reply: FastifyReply, cfg: SessionConfig) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await SessionModel.deleteOne({ tokenHash: sha256(token) });
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: 'lax',
  });
}
