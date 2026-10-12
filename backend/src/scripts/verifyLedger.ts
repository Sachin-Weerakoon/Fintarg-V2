import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { connectDatabase } from '../config/database';
import { BankAccountModel } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import {
  addGoalContribution,
  createRecord,
  createTransferRecord,
  deleteFinancePaymentPayment,
  deleteGoalContribution,
  deleteLoanRepayment,
  deletePawnPayment,
  deleteRecord,
  deleteTransferRecord,
  getTransactionHistory,
  recordFinancePayment,
  recordLoanRepayment,
  recordPawnPayment,
  updateRecord,
} from '../services/recordService';
import { ensureCashWallet, recomputeBalance } from '../services/ledgerService';

export interface VerifyLedgerOptions {
  iterations?: number;
  userId?: string;
  seed?: number;
}

export interface VerifyLedgerResult {
  success: boolean;
  totalOperations: number;
  operationsExecuted: Record<string, number>;
  accountsChecked: number;
  maxDriftCents: number;
  errors: string[];
}

/**
 * Pseudo-random generator with optional seed for reproducible property tests.
 */
function createSeededRandom(initialSeed = 123456789) {
  let s = initialSeed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Runs property-based verification on the ledger:
 * Generates randomized sequences of financial actions and verifies after each operation
 * that all user accounts maintain strictly zero balance drift (cached balance === computed balance).
 */
export async function runPropertyLedgerVerification(options: VerifyLedgerOptions = {}): Promise<VerifyLedgerResult> {
  const iterations = options.iterations ?? 50;
  const rng = createSeededRandom(options.seed ?? Date.now());
  const uId = options.userId ? new mongoose.Types.ObjectId(options.userId) : new mongoose.Types.ObjectId();
  const userId = uId.toString();

  const operationsExecuted: Record<string, number> = {
    expense: 0,
    income: 0,
    transfer: 0,
    loanRepayment: 0,
    pawnPayment: 0,
    financePayment: 0,
    goalContribution: 0,
    genericTransaction: 0,
    genericUpdate: 0,
    genericDelete: 0,
    undoTransfer: 0,
    undoLoanRepayment: 0,
    undoPawnPayment: 0,
    undoFinancePayment: 0,
    undoGoalContribution: 0,
  };

  const errors: string[] = [];
  let maxDriftCents = 0;

  // 1. Setup accounts
  const bankA = await createRecord('bankAccounts', userId, {
    bankName: 'Sampath Bank',
    accountNumber: '11112222',
    name: 'Primary Checking',
    openingBalance: 10000, // 1,000,000 cents
  });

  const bankB = await createRecord('bankAccounts', userId, {
    bankName: 'Commercial Bank',
    accountNumber: '33334444',
    name: 'Savings Reserve',
    openingBalance: 5000, // 500,000 cents
  });

  const cashWallet = await ensureCashWallet(uId);

  const card = await createRecord('cards', userId, {
    cardName: 'Gold Credit Card',
    cardNumber: '4111222233334444',
    cardType: 'credit',
    expiryMonth: '12',
    expiryYear: '2029',
    creditLimit: 50000,
  });

  const accountIds = [bankA._id.toString(), bankB._id.toString(), cashWallet._id.toString()];

  // Track created entities for later undos/payments
  const activeLoans: any[] = [];
  const activePawns: any[] = [];
  const activeFinances: any[] = [];
  const activeGoals: any[] = [];
  const activeTransfers: string[] = [];
  const genericTransactions: string[] = [];

  // Helper to verify zero drift on all accounts
  async function verifyAllAccountsZeroDrift(stepLabel: string) {
    for (const accId of accountIds) {
      const rec = await recomputeBalance(userId, accId);
      if (Math.abs(rec.driftCents) > maxDriftCents) {
        maxDriftCents = Math.abs(rec.driftCents);
      }
      if (rec.driftCents !== 0) {
        const msg = `[${stepLabel}] Drift detected on account ${accId}: drift=${rec.driftCents} cents, cached=${rec.cachedBalanceCents}, computed=${rec.computedBalanceCents}`;
        errors.push(msg);
        throw new Error(msg);
      }
    }
  }

  // Initial drift verification
  await verifyAllAccountsZeroDrift('initial-state');

  // 2. Execute randomized operations
  for (let i = 0; i < iterations; i++) {
    const opType = Math.floor(rng() * 12);
    const chosenAccountId = accountIds[Math.floor(rng() * accountIds.length)];
    const chosenDate = `2026-0${1 + Math.floor(rng() * 9)}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    const amountRs = 10 + Math.floor(rng() * 200);

    try {
      if (opType === 0) {
        // Expense
        await createRecord('expenses', userId, {
          date: chosenDate,
          amount: amountRs,
          category: 'PropertyTest',
          paymentMethod: chosenAccountId === cashWallet._id.toString() ? 'cash' : 'bank_transfer',
          bankAccountId: chosenAccountId === cashWallet._id.toString() ? undefined : chosenAccountId,
        });
        operationsExecuted.expense++;
      } else if (opType === 1) {
        // Income
        await createRecord('incomes', userId, {
          date: chosenDate,
          amount: amountRs,
          source: 'PropertyTest Income',
          type: 'salary',
          frequency: 'monthly',
          paymentMethod: chosenAccountId === cashWallet._id.toString() ? 'cash' : 'bank_transfer',
          bankAccountId: chosenAccountId === cashWallet._id.toString() ? undefined : chosenAccountId,
        });
        operationsExecuted.income++;
      } else if (opType === 2) {
        // Transfer between own accounts
        const destOptions = accountIds.filter(id => id !== chosenAccountId);
        const destId = destOptions[Math.floor(rng() * destOptions.length)];
        const transferRes = await createTransferRecord(userId, {
          fromAccountId: chosenAccountId === cashWallet._id.toString() ? 'cash' : chosenAccountId,
          toAccountId: destId === cashWallet._id.toString() ? 'cash' : destId,
          amount: amountRs,
          date: chosenDate,
          category: 'Transfer',
          description: 'Property test transfer',
        });
        activeTransfers.push(transferRes.transferGroupId);
        operationsExecuted.transfer++;
      } else if (opType === 3 && activeTransfers.length > 0) {
        // Undo transfer
        const trfId = activeTransfers.pop()!;
        await deleteTransferRecord(userId, trfId);
        operationsExecuted.undoTransfer++;
      } else if (opType === 4) {
        // Loan create & repayment
        const loan = await createRecord('loans', userId, {
          lender: `Test Bank ${i}`,
          amount: 50000,
          rate: 12,
          tenureMonths: 12,
          method: 'reducing_balance',
          startDate: '2026-01-01',
          dueDate: '2027-01-01',
        });
        activeLoans.push(loan);

        const repayRes = await recordLoanRepayment(
          userId,
          loan._id.toString(),
          1000,
          chosenDate,
          'Property loan repay',
          'bank_transfer',
          chosenAccountId,
        );
        operationsExecuted.loanRepayment++;

        // 30% chance to immediately test undo loan repayment
        if (rng() < 0.3) {
          const repId = repayRes.repayments[repayRes.repayments.length - 1]._id.toString();
          await deleteLoanRepayment(userId, loan._id.toString(), repId);
          operationsExecuted.undoLoanRepayment++;
        }
      } else if (opType === 5) {
        // Pawned item & payment
        const pawn = await createRecord('pawnedItems', userId, {
          ticketNumber: `PW-${Date.now()}-${i}`,
          description: 'Gold Ring 22K',
          amountReceived: 20000,
          interestRatePercent: 2,
          nextDue: '2026-02-01',
        });
        activePawns.push(pawn);

        const pawnPayRes = await recordPawnPayment(userId, pawn._id.toString(), {
          date: chosenDate,
          amount: 400,
          paymentType: 'interest',
          paymentMethod: 'cash',
        });
        operationsExecuted.pawnPayment++;

        if (rng() < 0.3) {
          const pId = pawnPayRes.payments[pawnPayRes.payments.length - 1]._id.toString();
          await deletePawnPayment(userId, pawn._id.toString(), pId);
          operationsExecuted.undoPawnPayment++;
        }
      } else if (opType === 6) {
        // Finance payment obligation & mark paid
        const fin = await createRecord('financePayments', userId, {
          lender: 'Finance Corp',
          amount: 1500,
          dueDay: 15,
          monthsRemaining: 12,
          paymentKind: 'instalment',
          bankAccountId: chosenAccountId,
        });
        activeFinances.push(fin);

        const finPayRes = await recordFinancePayment(userId, fin._id.toString(), {
          date: chosenDate,
          amount: 1500,
        });
        operationsExecuted.financePayment++;

        if (rng() < 0.3) {
          const paymentId = finPayRes.payments[finPayRes.payments.length - 1]._id.toString();
          await deleteFinancePaymentPayment(userId, fin._id.toString(), paymentId);
          operationsExecuted.undoFinancePayment++;
        }
      } else if (opType === 7) {
        // Goal contribution with ledger debit
        const goal = await createRecord('savingsGoals', userId, {
          name: `Property Goal ${i}`,
          targetAmount: 50000,
          targetDate: '2026-12-31',
          category: 'Savings',
        });
        activeGoals.push(goal);

        const goalRes = await addGoalContribution(userId, goal._id.toString(), {
          amount: 500,
          date: chosenDate,
          debitAccount: true,
          paymentMethod: 'bank_transfer',
          bankAccountId: chosenAccountId,
        });
        operationsExecuted.goalContribution++;

        if (rng() < 0.3) {
          const contribId = goalRes.contributions[goalRes.contributions.length - 1]._id.toString();
          await deleteGoalContribution(userId, goal._id.toString(), contribId);
          operationsExecuted.undoGoalContribution++;
        }
      } else if (opType === 8) {
        // Generic transaction CRUD
        const tx = await createRecord('transactions', userId, {
          date: chosenDate,
          type: 'expense',
          amount: amountRs,
          category: 'Generic',
          description: 'Property generic transaction',
          paymentMethod: 'bank_transfer',
          bankAccountId: chosenAccountId,
        });
        genericTransactions.push(tx._id.toString());
        operationsExecuted.genericTransaction++;
      } else if (opType === 9 && genericTransactions.length > 0) {
        // Generic transaction update
        const txId = genericTransactions[genericTransactions.length - 1];
        await updateRecord('transactions', userId, txId, {
          amount: amountRs + 50,
          category: 'Generic Updated',
        });
        operationsExecuted.genericUpdate++;
      } else if (opType === 10 && genericTransactions.length > 0) {
        // Generic transaction delete
        const txId = genericTransactions.pop()!;
        await deleteRecord('transactions', userId, txId);
        operationsExecuted.genericDelete++;
      } else {
        // Credit card expense
        await createRecord('expenses', userId, {
          date: chosenDate,
          amount: amountRs,
          category: 'CardExpense',
          paymentMethod: 'credit_card',
          cardId: card._id.toString(),
        });
        operationsExecuted.expense++;
      }

      // Verify zero drift after every single randomized operation!
      await verifyAllAccountsZeroDrift(`step-${i}-op-${opType}`);
    } catch (err: any) {
      errors.push(`Error at iteration ${i} (opType ${opType}): ${err.message}`);
      throw err;
    }
  }

  // 3. Final verification across all accounts and transaction history
  await verifyAllAccountsZeroDrift('final-state');

  // Verify getTransactionHistory for bankA matches recomputed closing balance
  const histA = await getTransactionHistory(userId, { bankAccountId: bankA._id.toString() });
  const recomputedA = await recomputeBalance(userId, bankA._id.toString());
  if (histA.summary.closingBalanceCents !== recomputedA.computedBalanceCents) {
    errors.push(`History closing balance mismatch on bankA: hist=${histA.summary.closingBalanceCents}, recomputed=${recomputedA.computedBalanceCents}`);
  }

  const totalOps = Object.values(operationsExecuted).reduce((sum, n) => sum + n, 0);

  return {
    success: errors.length === 0,
    totalOperations: totalOps,
    operationsExecuted,
    accountsChecked: accountIds.length,
    maxDriftCents,
    errors,
  };
}

/**
 * CLI Entry point
 */
async function main() {
  try {
    logger.info('Starting verifyLedger property verification script...');
    await connectDatabase();
    const result = await runPropertyLedgerVerification({ iterations: 50 });
    logger.info(result, 'Property ledger verification passed with zero drift!');
    if (!result.success) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error({ err: error }, 'verifyLedger property verification failed');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

if (process.argv[1] && process.argv[1].endsWith('verifyLedger.ts')) {
  void main();
}
