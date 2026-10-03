import mongoose, { type Connection } from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: { conn: Connection | null; promise: Promise<Connection> | null } | undefined;
}

let cached = global.mongooseConnection;

export async function getMongoConnection(uri: string): Promise<Connection> {
  if (!cached) {
    cached = { conn: null, promise: null };
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 5000 };
    cached.promise = mongoose.connect(uri, opts).then(m => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
