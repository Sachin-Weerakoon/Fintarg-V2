import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

let connection: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState !== 1) {
    connection ??= mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }).catch(error => {
      connection = null;
      throw error;
    });
    await connection;
  }
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}