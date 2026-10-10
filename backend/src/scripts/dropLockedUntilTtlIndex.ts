import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

async function run() {
  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    const collection = mongoose.connection.collection('users');
    const indexes = await collection.indexes();
    logger.info({ indexes: indexes.map(idx => idx.name) }, 'Current indexes on users collection');

    const ttlIndex = indexes.find(idx => idx.name === 'lockedUntil_1' || (idx.key && (idx.key as Record<string, unknown>).lockedUntil));
    if (ttlIndex && ttlIndex.name) {
      logger.info({ indexName: ttlIndex.name }, 'Dropping TTL index on lockedUntil...');
      await collection.dropIndex(ttlIndex.name);
      logger.info('Successfully dropped TTL index on lockedUntil');
    } else {
      logger.info('No TTL index on lockedUntil found; nothing to drop.');
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && ('code' in error) && (error as { code: unknown }).code === 26) {
      logger.info('Users collection does not exist yet; nothing to drop.');
    } else {
      logger.error({ err: error }, 'Failed to drop TTL index');
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

void run();
