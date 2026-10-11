import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { backfillOpeningBalances } from '../services/ledgerService';

async function run() {
  const isDryRun = !process.argv.includes('--fix') && !process.argv.includes('--write');
  try {
    logger.info({ mode: isDryRun ? 'DRY-RUN (default, no writes)' : 'LIVE-FIX (updating openingBalanceCents)' }, 'Starting opening balance backfill...');
    await connectDatabase();
    const result = await backfillOpeningBalances({ dryRun: isDryRun });
    logger.info(result, 'Opening balance backfill completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to run backfillOpeningBalances script');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

if (process.argv[1] && process.argv[1].endsWith('backfillOpeningBalances.ts')) {
  void run();
}
