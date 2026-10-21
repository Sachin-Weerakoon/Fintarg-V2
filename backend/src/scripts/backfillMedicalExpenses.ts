import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { MedicalExpenseModel } from '../models/MedicalExpense';
import { createRecord } from '../services/recordService';

// Medical records saved before the ledger link existed have no expenseId and never
// reached the financial ledger. Create the missing ledger expense for each of them.
export async function backfillMedicalExpenses(): Promise<{ linked: number }> {
  const orphans = await MedicalExpenseModel.find({ $or: [{ expenseId: null }, { expenseId: { $exists: false } }] });
  let linked = 0;
  for (const medical of orphans) {
    const expense: any = await createRecord('expenses', medical.userId.toString(), {
      date: medical.date,
      amount: medical.amountCents / 100,
      category: 'Medical',
      note: medical.note ? `Medical: ${medical.type} · ${medical.note}` : `Medical: ${medical.type}`,
      recurring: false,
      sourceType: 'medical',
    });
    medical.set('expenseId', expense._id);
    await medical.save();
    linked += 1;
  }
  logger.info({ linked }, 'Linked medical expenses to the financial ledger');
  return { linked };
}

async function run() {
  try {
    await connectDatabase();
    await backfillMedicalExpenses();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to backfill medical expenses');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  void run();
}
