import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

export async function dropProfileTtlIndex(): Promise<{ dropped: boolean; indexName?: string }> {
  try {
    const collection = mongoose.connection.collection('profiles');
    const indexes = await collection.indexes();
    logger.info({ indexes: indexes.map(idx => idx.name) }, 'Current indexes on profiles collection');

    const ttlIndex = indexes.find(idx => idx.name === 'deletionRequestedAt_1' || (idx.key && (idx.key as Record<string, unknown>).deletionRequestedAt));
    if (ttlIndex && ttlIndex.name) {
      logger.info({ indexName: ttlIndex.name }, 'Dropping TTL index on deletionRequestedAt...');
      await collection.dropIndex(ttlIndex.name);
      logger.info('Successfully dropped TTL index on deletionRequestedAt');
      return { dropped: true, indexName: ttlIndex.name };
    }
    logger.info('No TTL index on deletionRequestedAt found; nothing to drop.');
    return { dropped: false };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && ('code' in error) && (error as { code: unknown }).code === 26) {
      logger.info('Profiles collection does not exist yet; nothing to drop.');
      return { dropped: false };
    }
    throw error;
  }
}

async function run() {
  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    await dropProfileTtlIndex();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to drop TTL index on profiles');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  void run();
}
