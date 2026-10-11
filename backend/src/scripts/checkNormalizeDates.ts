import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { isValidIsoDate, isValidIsoMonth } from '../validations/records';

interface DateFieldConfig {
  collection: string;
  field: string;
  isMonth?: boolean;
  isArray?: boolean;
}

const TARGET_FIELDS: DateFieldConfig[] = [
  { collection: 'incomes', field: 'date' },
  { collection: 'expenses', field: 'date' },
  { collection: 'transactions', field: 'date' },
  { collection: 'loans', field: 'startDate' },
  { collection: 'loans', field: 'dueDate' },
  { collection: 'pawneditems', field: 'nextDue' },
  { collection: 'pawneditems', field: 'redemptionDate' },
  { collection: 'savingsgoals', field: 'targetDate' },
  { collection: 'savingsgoals', field: 'endDate' },
  { collection: 'medicalexpenses', field: 'date' },
  { collection: 'reminders', field: 'dueDate' },
  { collection: 'companies', field: 'openingDate' },
  { collection: 'businessbranches', field: 'openingDate' },
  { collection: 'branchentries', field: 'date' },
  { collection: 'ownerdraws', field: 'date' },
  { collection: 'agreements', field: 'startDate' },
  { collection: 'agreements', field: 'endDate' },
  { collection: 'letters', field: 'date' },
  { collection: 'documents', field: 'uploadDate' },
  { collection: 'personalbudgets', field: 'month', isMonth: true },
  { collection: 'profiles', field: 'dateOfBirth' },
];

export function attemptNormalizeDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return ''; // Empty optional dates are permitted
  if (isValidIsoDate(trimmed)) return trimmed;

  // ISO timestamp (e.g. 2026-03-01T12:00:00.000Z)
  if (trimmed.length >= 10 && (trimmed.includes('T') || trimmed.includes(' '))) {
    const candidate = trimmed.slice(0, 10);
    if (isValidIsoDate(candidate)) return candidate;
  }

  // Slash formatted YYYY/MM/DD
  const slashMatch = trimmed.match(/^(\d{4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/);
  if (slashMatch) {
    const candidate = `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
    if (isValidIsoDate(candidate)) return candidate;
  }

  // DD-MM-YYYY format
  const dmyDashMatch = trimmed.match(/^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-(\d{4})$/);
  if (dmyDashMatch) {
    const candidate = `${dmyDashMatch[3]}-${dmyDashMatch[2]}-${dmyDashMatch[1]}`;
    if (isValidIsoDate(candidate)) return candidate;
  }

  // DD/MM/YYYY format
  const dmySlashMatch = trimmed.match(/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/);
  if (dmySlashMatch) {
    const candidate = `${dmySlashMatch[3]}-${dmySlashMatch[2]}-${dmySlashMatch[1]}`;
    if (isValidIsoDate(candidate)) return candidate;
  }

  return null;
}

export function attemptNormalizeMonth(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isValidIsoMonth(trimmed)) return trimmed;

  // Full date or timestamp to month
  if (trimmed.length >= 7) {
    const candidate = trimmed.slice(0, 7).replace('/', '-');
    if (isValidIsoMonth(candidate)) return candidate;
  }

  return null;
}

export async function checkNormalizeDates(options: { dryRun: boolean } = { dryRun: true }) {
  const isDryRun = options.dryRun;
  logger.info({ mode: isDryRun ? 'DRY-RUN (no changes will be written)' : 'LIVE-FIX (updating invalid records)' }, 'Starting date normalization audit...');

  const summary = {
    collectionsChecked: 0,
    documentsScanned: 0,
    validValues: 0,
    invalidValues: 0,
    fixableValues: 0,
    unfixableValues: 0,
    updatedValues: 0,
  };

  const collections = await mongoose.connection.db?.listCollections().toArray() || [];
  const existingCollectionNames = new Set(collections.map(c => c.name));

  for (const target of TARGET_FIELDS) {
    if (!existingCollectionNames.has(target.collection)) {
      continue;
    }
    summary.collectionsChecked++;
    const col = mongoose.connection.collection(target.collection);
    const cursor = col.find({ [target.field]: { $exists: true } });

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) break;
      summary.documentsScanned++;

      const val = doc[target.field];
      if (val === '' || val === null || val === undefined) {
        summary.validValues++;
        continue;
      }

      const isValid = target.isMonth ? isValidIsoMonth(String(val)) : isValidIsoDate(String(val));

      if (isValid) {
        summary.validValues++;
      } else {
        summary.invalidValues++;
        const normalized = target.isMonth
          ? attemptNormalizeMonth(val)
          : attemptNormalizeDate(val);

        if (normalized !== null) {
          summary.fixableValues++;
          logger.warn({
            collection: target.collection,
            docId: doc._id,
            field: target.field,
            currentValue: val,
            suggestedFix: normalized,
          }, `Invalid ${target.isMonth ? 'month' : 'date'} detected (fixable)`);

          if (!isDryRun) {
            await col.updateOne({ _id: doc._id }, { $set: { [target.field]: normalized } });
            summary.updatedValues++;
          }
        } else {
          summary.unfixableValues++;
          logger.error({
            collection: target.collection,
            docId: doc._id,
            field: target.field,
            currentValue: val,
          }, `Invalid ${target.isMonth ? 'month' : 'date'} detected (UNFIXABLE - requires manual check)`);
        }
      }
    }
  }

  logger.info(summary, 'Date normalization audit complete');
  return summary;
}

async function run() {
  const isDryRun = !process.argv.includes('--fix') && !process.argv.includes('--write');
  try {
    await connectDatabase();
    await checkNormalizeDates({ dryRun: isDryRun });
  } catch (error) {
    logger.error({ err: error }, 'Failed to run checkNormalizeDates script');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

if (process.argv[1] && process.argv[1].endsWith('checkNormalizeDates.ts')) {
  void run();
}
