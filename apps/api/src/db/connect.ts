import mongoose from 'mongoose';

const STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export function dbState(): string {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

/**
 * Connect to MongoDB and check it is a replica set (credits will need transactions).
 * Errors never include the URI, which contains the password.
 */
export async function connectDb(uri: string, opts: { autoIndex: boolean }): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, autoIndex: opts.autoIndex });
  } catch (err) {
    const reason = err instanceof Error ? err.name : 'unknown error';
    throw new Error(
      `Could not connect to MongoDB (${reason}). Check MONGODB_URI, the database user, and the Atlas IP access list.`,
      { cause: err },
    );
  }

  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  if (!hello?.setName) {
    await mongoose.disconnect();
    throw new Error('MongoDB must be a replica set (transactions are required). Atlas always is.');
  }
}

/** Strip `user:password@` from anything that might contain a connection string. */
export function redactCredentials(text: string): string {
  return text.replace(/\/\/[^/@\s]+@/g, '//<redacted>@');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
