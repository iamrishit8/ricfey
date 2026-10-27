/**
 * One-off: rename course depths intro/working/deep to basic/intermediate/advanced in an existing
 * database (courses, and the depth stored inside each outline version). Safe to run twice.
 *   bun run migrate:depth            (uses MONGODB_URI)
 */
import mongoose from 'mongoose';
import { loadEnv } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';

const RENAME: Record<string, string> = {
  intro: 'basic',
  working: 'intermediate',
  deep: 'advanced',
};

const env = loadEnv();
await connectDb(env.MONGODB_URI, { autoIndex: false });
try {
  const db = mongoose.connection.db!;
  for (const [from, to] of Object.entries(RENAME)) {
    const c = await db.collection('courses').updateMany({ depth: from }, { $set: { depth: to } });
    const o = await db
      .collection('courseOutlines')
      .updateMany({ 'outline.depth': from }, { $set: { 'outline.depth': to } });
    console.info(
      `${from} → ${to}: ${c.modifiedCount} courses, ${o.modifiedCount} outline versions`,
    );
  }
} finally {
  await disconnectDb();
}
