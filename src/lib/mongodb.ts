import mongoose, { type Connection } from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: { conn: Connection | null; promise: Promise<Connection> | null } | undefined;
}

const cached = global.mongooseConnection ?? (global.mongooseConnection = { conn: null, promise: null });

export async function getMongoConnection(uri: string, dbName?: string): Promise<Connection> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 8000, ...(dbName ? { dbName } : {}) };
    cached.promise = mongoose.connect(uri, opts).then(m => m.connection).catch(error => {
      cached.promise = null;
      throw error;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function connectToDatabase(): Promise<Connection> {
  const { MONGODB_URI, MONGODB_DB } = process.env;
  if (!MONGODB_URI || !MONGODB_DB) {
    throw new Error('MONGODB_URI and MONGODB_DB must be configured');
  }
  return getMongoConnection(MONGODB_URI, MONGODB_DB);
}
