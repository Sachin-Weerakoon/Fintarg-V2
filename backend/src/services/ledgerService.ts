import mongoose from 'mongoose';
import { HttpError } from '../middleware/errors';
import { BankAccountModel, type IBankAccount } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import { TransactionModel, type ITransaction } from '../models/Transaction';
import { logger } from '../config/logger';

export interface PostTransactionParams {
  userId: string | mongoose.Types.ObjectId;
  type: 'income' | 'expense' | 'transfer';
  amountCents: number;
  date: string;
  category?: string;
  description?: string;
  paymentMethod?: 'cash' | 'card' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cheque' | 'standing_order' | 'online' | 'other';
  bankAccountId?: string | mongoose.Types.ObjectId | null;
  cardId?: string | mongoose.Types.ObjectId | null;
  referenceId?: string;
  transferGroupId?: string;
}

/**
 * Execute a unit of work inside a mongoose session/transaction if available,
 * or gracefully execute standalone if replica sets are not configured.
 */
export async function withLedgerSession<T>(
  fn: (session?: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  let session: mongoose.ClientSession | undefined;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err: unknown) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
    // If running against standalone MongoDB without replica sets (e.g. standard local mongod)
    if (message.includes('replica set') || message.includes('Transaction numbers are only allowed')) {
      return fn(undefined);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/**
 * Ensures that a built-in non-deletable 'cash' account exists for the user.
 */
export async function ensureCashWallet(userId: string | mongoose.Types.ObjectId): Promise<IBankAccount> {
  const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const existing = await BankAccountModel.findOne({ userId: uId, accountType: 'cash' });
  if (existing) {
    return existing;
  }

  const created = await BankAccountModel.create({
    userId: uId,
    bankName: 'Cash',
    accountName: 'Cash Wallet',
    accountNumber: 'CASH',
    accountType: 'cash',
    balanceCents: 0,
    openingBalanceCents: 0,
    currency: 'LKR',
    isDefault: false,
  });

  return created;
}

/**
 * Posts a transaction to the ledger and adjusts the cached balances on the account and/or card.
 */
export async function postTransaction(
  params: PostTransactionParams,
  session?: mongoose.ClientSession,
): Promise<ITransaction> {
  const uId = typeof params.userId === 'string' ? new mongoose.Types.ObjectId(params.userId) : params.userId;
  let bankAccountId = params.bankAccountId
    ? (typeof params.bankAccountId === 'string' ? new mongoose.Types.ObjectId(params.bankAccountId) : params.bankAccountId)
    : null;
  const cardId = params.cardId
    ? (typeof params.cardId === 'string' ? new mongoose.Types.ObjectId(params.cardId) : params.cardId)
    : null;

  // Rule: Cash movements default to the user's cash wallet if no bank account is provided
  if (params.paymentMethod === 'cash' && !bankAccountId && !cardId) {
    const cashWallet = await ensureCashWallet(uId);
    bankAccountId = cashWallet._id as mongoose.Types.ObjectId;
  }

  const amountCents = Math.round(Number(params.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new HttpError(400, 'Transaction amount must be a positive number');
  }

  // 1. Adjust bank account balance
  if (bankAccountId) {
    let delta = 0;
    if (params.type === 'income') delta = amountCents;
    else if (params.type === 'expense') delta = -amountCents;

    if (delta !== 0) {
      const updateQuery = BankAccountModel.updateOne(
        { _id: bankAccountId, userId: uId },
        { $inc: { balanceCents: delta } },
      );
      if (session) updateQuery.session(session);
      await updateQuery;
    }
  }

  // 2. Adjust credit card balance (outstanding increases on expense, decreases on payment/refund)
  if (cardId) {
    const card = await CardModel.findOne({ _id: cardId, userId: uId });
    if (card) {
      if (card.cardType === 'credit' || params.paymentMethod === 'credit_card') {
        let cardDelta = 0;
        if (params.type === 'expense') cardDelta = amountCents;
        else if (params.type === 'income') cardDelta = -amountCents;

        if (cardDelta !== 0) {
          const updateQuery = CardModel.updateOne(
            { _id: cardId, userId: uId },
            { $inc: { balanceCents: cardDelta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      } else if (card.cardType === 'debit' && !bankAccountId && card.bankAccountId) {
        bankAccountId = card.bankAccountId;
        let delta = 0;
        if (params.type === 'income') delta = amountCents;
        else if (params.type === 'expense') delta = -amountCents;
        if (delta !== 0) {
          const updateQuery = BankAccountModel.updateOne(
            { _id: bankAccountId, userId: uId },
            { $inc: { balanceCents: delta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      }
    }
  }

  // 3. Create the Transaction record
  const txData = {
    userId: uId,
    bankAccountId: bankAccountId || null,
    cardId: cardId || null,
    type: params.type,
    amountCents,
    date: params.date,
    category: params.category || 'General',
    description: params.description || '',
    paymentMethod: params.paymentMethod || 'cash',
    referenceId: params.referenceId || '',
    transferGroupId: params.transferGroupId || null,
  };

  const createdDocs = await TransactionModel.create([txData], session ? { session } : {});
  return createdDocs[0];
}

/**
 * Reverses all ledger transactions associated with a referenceId.
 */
export async function reverseTransaction(
  userId: string | mongoose.Types.ObjectId,
  referenceId: string,
  session?: mongoose.ClientSession,
): Promise<number> {
  const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const findQuery = TransactionModel.find({ userId: uId, referenceId });
  if (session) findQuery.session(session);
  const transactions = await findQuery;

  if (transactions.length === 0) {
    return 0;
  }

  for (const tx of transactions) {
    // Reverse bank account balance
    if (tx.bankAccountId) {
      let reverseDelta = 0;
      if (tx.type === 'income') reverseDelta = -tx.amountCents;
      else if (tx.type === 'expense') reverseDelta = tx.amountCents;

      if (reverseDelta !== 0) {
        const updateQuery = BankAccountModel.updateOne(
          { _id: tx.bankAccountId, userId: uId },
          { $inc: { balanceCents: reverseDelta } },
        );
        if (session) updateQuery.session(session);
        await updateQuery;
      }
    }

    // Reverse card balance
    if (tx.cardId) {
      const card = await CardModel.findOne({ _id: tx.cardId, userId: uId });
      if (card && (card.cardType === 'credit' || tx.paymentMethod === 'credit_card')) {
        let cardReverseDelta = 0;
        if (tx.type === 'expense') cardReverseDelta = -tx.amountCents;
        else if (tx.type === 'income') cardReverseDelta = tx.amountCents;

        if (cardReverseDelta !== 0) {
          const updateQuery = CardModel.updateOne(
            { _id: tx.cardId, userId: uId },
            { $inc: { balanceCents: cardReverseDelta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      }
    }

    const deleteQuery = TransactionModel.deleteOne({ _id: tx._id });
    if (session) deleteQuery.session(session);
    await deleteQuery;
  }

  return transactions.length;
}

/**
 * Replaces a transaction: reverses the existing entry and posts a new one.
 */
export async function replaceTransaction(
  userId: string | mongoose.Types.ObjectId,
  referenceId: string,
  newParams: PostTransactionParams,
): Promise<ITransaction> {
  return withLedgerSession(async (session) => {
    await reverseTransaction(userId, referenceId, session);
    return postTransaction({ ...newParams, referenceId }, session);
  });
}

/**
 * Recomputes the true balance for a bank account from openingBalanceCents + sum(signed transactions).
 * Resets cached balanceCents and reports any detected drift.
 */
export async function recomputeBalance(
  userId: string | mongoose.Types.ObjectId,
  accountId: string | mongoose.Types.ObjectId,
) {
  const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const accId = typeof accountId === 'string' ? new mongoose.Types.ObjectId(accountId) : accountId;

  const account = await BankAccountModel.findOne({ _id: accId, userId: uId });
  if (!account) throw new HttpError(404, 'Bank account not found');

  const openingBalanceCents = account.openingBalanceCents || 0;

  const txAggregation = await TransactionModel.aggregate([
    { $match: { userId: uId, bankAccountId: accId } },
    {
      $group: {
        _id: null,
        incomeSum: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amountCents', 0],
          },
        },
        expenseSum: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amountCents', 0],
          },
        },
      },
    },
  ]);

  const incomeSum = txAggregation[0]?.incomeSum || 0;
  const expenseSum = txAggregation[0]?.expenseSum || 0;
  const computedBalanceCents = openingBalanceCents + incomeSum - expenseSum;
  const cachedBalanceCents = account.balanceCents;
  const driftCents = cachedBalanceCents - computedBalanceCents;

  if (driftCents !== 0) {
    logger.warn({ accountId: accId, driftCents, cachedBalanceCents, computedBalanceCents }, 'Detected ledger balance drift; resyncing cached balance');
    await BankAccountModel.updateOne({ _id: accId, userId: uId }, { $set: { balanceCents: computedBalanceCents } });
  }

  return {
    accountId: accId.toString(),
    openingBalanceCents,
    computedBalanceCents,
    cachedBalanceCents,
    driftCents,
  };
}

/**
 * Migration helper: backfills openingBalanceCents for bank accounts.
 * Formula: openingBalance = current balance - sum(existing tx)
 */
export async function backfillOpeningBalances(options: { dryRun?: boolean } = { dryRun: true }) {
  const isDryRun = options.dryRun ?? true;
  const accounts = await BankAccountModel.find({}).lean();
  let updatedCount = 0;

  for (const account of accounts) {
    const txAggregation = await TransactionModel.aggregate([
      { $match: { bankAccountId: account._id } },
      {
        $group: {
          _id: null,
          incomeSum: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amountCents', 0],
            },
          },
          expenseSum: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, '$amountCents', 0],
            },
          },
        },
      },
    ]);

    const incomeSum = txAggregation[0]?.incomeSum || 0;
    const expenseSum = txAggregation[0]?.expenseSum || 0;
    const netTransactions = incomeSum - expenseSum;
    const computedOpeningBalanceCents = (account.balanceCents || 0) - netTransactions;

    if (account.openingBalanceCents === undefined || account.openingBalanceCents !== computedOpeningBalanceCents) {
      if (!isDryRun) {
        await BankAccountModel.updateOne(
          { _id: account._id },
          { $set: { openingBalanceCents: computedOpeningBalanceCents } },
        );
      }
      updatedCount++;
    }
  }

  return { totalAccounts: accounts.length, updatedCount, isDryRun };
}
