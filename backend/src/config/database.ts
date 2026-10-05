import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';
import { logger } from './logger';

let connection: Promise<typeof mongoose> | null = null;
let memoryServer: MongoMemoryServer | null = null;

async function connectWithFallback(): Promise<typeof mongoose> {
  try {
    return await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
  } catch (error) {
    if (env.NODE_ENV === 'production') {
      logger.error({ err: error }, 'Failed to connect to MongoDB Atlas in production');
      throw error;
    }

    const shouldFallback = /ECONNREFUSED|ENOTFOUND|querySrv|MongoNetworkError/i.test(String((error as Error)?.message ?? error));
    if (!shouldFallback) throw error;

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
    }

    return await mongoose.connect(memoryServer.getUri(), {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    });
  }
}

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState !== 1) {
    connection ??= connectWithFallback().catch(error => {
      connection = null;
      throw error;
    });
    await connection;
  }
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}
