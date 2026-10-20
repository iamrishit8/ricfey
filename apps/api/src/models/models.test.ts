import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../db/connect';
import { CourseModel } from './course';
import { UserModel } from './user';

// Needs a real MongoDB replica set. Skipped (not failed) when MONGODB_URI_TEST is unset.
// See TESTING.md for a one-command local setup.
const uri = process.env.MONGODB_URI_TEST;
if (!uri) console.warn('[models.test] MONGODB_URI_TEST not set: skipping DB tests');

describe.skipIf(!uri)('models (needs MONGODB_URI_TEST)', () => {
  beforeAll(async () => {
    await connectDb(uri!, { autoIndex: true });
    await mongoose.connection.dropDatabase();
    await Promise.all([UserModel.syncIndexes(), CourseModel.syncIndexes()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  test('email is unique regardless of case and whitespace', async () => {
    await UserModel.create({ email: 'asha@example.com' });
    await expect(UserModel.create({ email: '  ASHA@example.com ' })).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('many users may have no googleId, but a googleId is unique', async () => {
    await UserModel.create({ email: 'a@example.com' });
    await UserModel.create({ email: 'b@example.com' });
    await UserModel.create({ email: 'c@example.com', googleId: 'g-1' });
    await expect(
      UserModel.create({ email: 'd@example.com', googleId: 'g-1' }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('course rejects an unknown depth and out-of-range weeks', async () => {
    const userId = new mongoose.Types.ObjectId();
    // Typed loosely on purpose: TypeScript would (rightly) reject 'guru' at compile time.
    const raw: Record<string, unknown> = { userId, skill: 'Python', depth: 'guru', weeks: 99 };
    const err = await new CourseModel(raw)
      .validate()
      .then(() => null)
      .catch((e: mongoose.Error.ValidationError) => e);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(Object.keys(err!.errors).sort()).toEqual(['depth', 'weeks']);
  });

  test('course requires a status and defaults minutes and days per week', async () => {
    const userId = new mongoose.Types.ObjectId();
    const missing = await new CourseModel({ userId, skill: 'Python', depth: 'working', weeks: 4 })
      .validate()
      .then(() => null)
      .catch((e: mongoose.Error.ValidationError) => e);
    expect(Object.keys(missing!.errors)).toEqual(['status']);
    const course = await CourseModel.create({
      userId,
      skill: 'Python',
      depth: 'working',
      weeks: 4,
      status: 'placement',
    });
    expect(course).toMatchObject({ minutesPerDay: 30, daysPerWeek: 5 });
  });
});
