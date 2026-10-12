import mongoose from 'mongoose';
import { HttpError } from '../middleware/errors';
import { BankAccountModel, type IBankAccount } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import { TransactionModel, type ITransaction } from '../models/Transaction';
import { logger } from '../config/logger';

export interface PostTransactionParams {
  userId: string | mongoose.Types.ObjectId;
  type: 'income' | 'expense' | 'transfer';
  transferDirection?: 'incoming' | 'outgoing' | null;
  amountCents: number;
  date: string;
  category?: string;
  description?: string;
  paymentMethod?: 'cash' | 'card' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cheque' | 'standing_order' | 'online' | 'other';
  bankAccountId?: string | mongoose.Types.ObjectId | null;
  cardId?: string | mongoose.Types.ObjectId | null;
  referenceId?: string | null;
  transferGroupId?: string | null;
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
    else if (params.type === 'transfer') {
      if (params.transferDirection === 'incoming') delta = amountCents;
      else if (params.transferDirection === 'outgoing') delta = -amountCents;
    }

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
        else if (params.type === 'transfer') {
          if (params.transferDirection === 'incoming') cardDelta = -amountCents;
          else if (params.transferDirection === 'outgoing') cardDelta = amountCents;
        }

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
        else if (params.type === 'transfer') {
          if (params.transferDirection === 'incoming') delta = amountCents;
          else if (params.transferDirection === 'outgoing') delta = -amountCents;
        }
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
    transferDirection: params.transferDirection || null,
    transferGroupId: params.transferGroupId || null,
    amountCents,
    date: params.date,
    category: params.category || 'General',
    description: params.description || '',
    paymentMethod: params.paymentMethod || 'cash',
    referenceId: params.referenceId || '',
  };

  const createdDocs = await TransactionModel.create([txData], session ? { session } : {});
  return createdDocs[0];
}

/**
 * Reverses all ledger transactions associated with a referenceId or transferGroupId.
 */
export async function reverseTransaction(
  userId: string | mongoose.Types.ObjectId,
  referenceId: string,
  session?: mongoose.ClientSession,
): Promise<number> {
  const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const findQuery = TransactionModel.find({
    userId: uId,
    $or: [{ referenceId }, { transferGroupId: referenceId }],
  });
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
      else if (tx.type === 'transfer') {
        if (tx.transferDirection === 'incoming') reverseDelta = -tx.amountCents;
        else if (tx.transferDirection === 'outgoing') reverseDelta = tx.amountCents;
      }

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
        else if (tx.type === 'transfer') {
          if (tx.transferDirection === 'incoming') cardReverseDelta = tx.amountCents;
          else if (tx.transferDirection === 'outgoing') cardReverseDelta = -tx.amountCents;
        }

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
 * Reverses a single transaction by ID and removes it.
 */
export async function reverseTransactionById(
  userId: string | mongoose.Types.ObjectId,
  transactionId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<boolean> {
  const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const txId = typeof transactionId === 'string' ? new mongoose.Types.ObjectId(transactionId) : transactionId;

  const findQuery = TransactionModel.findOne({ _id: txId, userId: uId });
  if (session) findQuery.session(session);
  const tx = await findQuery;
  if (!tx) return false;

  // Reverse bank account balance
  if (tx.bankAccountId) {
    let reverseDelta = 0;
    if (tx.type === 'income') reverseDelta = -tx.amountCents;
    else if (tx.type === 'expense') reverseDelta = tx.amountCents;
    else if (tx.type === 'transfer') {
      if (tx.transferDirection === 'incoming') reverseDelta = -tx.amountCents;
      else if (tx.transferDirection === 'outgoing') reverseDelta = tx.amountCents;
    }

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
      else if (tx.type === 'transfer') {
        if (tx.transferDirection === 'incoming') cardReverseDelta = tx.amountCents;
        else if (tx.transferDirection === 'outgoing') cardReverseDelta = -tx.amountCents;
      }

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

  return true;
}

/**
 * Updates a generic transaction by reversing old balances, applying new balances, and updating the transaction document.
 */
export async function updateTransactionById(
  userId: string | mongoose.Types.ObjectId,
  transactionId: string | mongoose.Types.ObjectId,
  newParams: PostTransactionParams,
): Promise<ITransaction> {
  return withLedgerSession(async (session) => {
    const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const txId = typeof transactionId === 'string' ? new mongoose.Types.ObjectId(transactionId) : transactionId;

    const findQuery = TransactionModel.findOne({ _id: txId, userId: uId });
    if (session) findQuery.session(session);
    const existing = await findQuery;
    if (!existing) throw new HttpError(404, 'Transaction not found');

    // 1. Reverse existing balance impact
    if (existing.bankAccountId) {
      let reverseDelta = 0;
      if (existing.type === 'income') reverseDelta = -existing.amountCents;
      else if (existing.type === 'expense') reverseDelta = existing.amountCents;
      else if (existing.type === 'transfer') {
        if (existing.transferDirection === 'incoming') reverseDelta = -existing.amountCents;
        else if (existing.transferDirection === 'outgoing') reverseDelta = existing.amountCents;
      }

      if (reverseDelta !== 0) {
        const updateQuery = BankAccountModel.updateOne(
          { _id: existing.bankAccountId, userId: uId },
          { $inc: { balanceCents: reverseDelta } },
        );
        if (session) updateQuery.session(session);
        await updateQuery;
      }
    }

    if (existing.cardId) {
      const card = await CardModel.findOne({ _id: existing.cardId, userId: uId });
      if (card && (card.cardType === 'credit' || existing.paymentMethod === 'credit_card')) {
        let cardReverseDelta = 0;
        if (existing.type === 'expense') cardReverseDelta = -existing.amountCents;
        else if (existing.type === 'income') cardReverseDelta = existing.amountCents;
        else if (existing.type === 'transfer') {
          if (existing.transferDirection === 'incoming') cardReverseDelta = existing.amountCents;
          else if (existing.transferDirection === 'outgoing') cardReverseDelta = -existing.amountCents;
        }

        if (cardReverseDelta !== 0) {
          const updateQuery = CardModel.updateOne(
            { _id: existing.cardId, userId: uId },
            { $inc: { balanceCents: cardReverseDelta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      }
    }

    // 2. Post new balance impact
    let newBankAccountId = newParams.bankAccountId
      ? (typeof newParams.bankAccountId === 'string' ? new mongoose.Types.ObjectId(newParams.bankAccountId) : newParams.bankAccountId)
      : null;
    const newCardId = newParams.cardId
      ? (typeof newParams.cardId === 'string' ? new mongoose.Types.ObjectId(newParams.cardId) : newParams.cardId)
      : null;

    if (newParams.paymentMethod === 'cash' && !newBankAccountId && !newCardId) {
      const cashWallet = await ensureCashWallet(uId);
      newBankAccountId = cashWallet._id as mongoose.Types.ObjectId;
    }

    const newAmountCents = Math.round(Number(newParams.amountCents));
    if (!Number.isFinite(newAmountCents) || newAmountCents <= 0) {
      throw new HttpError(400, 'Transaction amount must be a positive number');
    }

    if (newBankAccountId) {
      let delta = 0;
      if (newParams.type === 'income') delta = newAmountCents;
      else if (newParams.type === 'expense') delta = -newAmountCents;
      else if (newParams.type === 'transfer') {
        if (newParams.transferDirection === 'incoming') delta = newAmountCents;
        else if (newParams.transferDirection === 'outgoing') delta = -newAmountCents;
      }

      if (delta !== 0) {
        const updateQuery = BankAccountModel.updateOne(
          { _id: newBankAccountId, userId: uId },
          { $inc: { balanceCents: delta } },
        );
        if (session) updateQuery.session(session);
        await updateQuery;
      }
    }

    if (newCardId) {
      const card = await CardModel.findOne({ _id: newCardId, userId: uId });
      if (card && (card.cardType === 'credit' || newParams.paymentMethod === 'credit_card')) {
        let cardDelta = 0;
        if (newParams.type === 'expense') cardDelta = newAmountCents;
        else if (newParams.type === 'income') cardDelta = -newAmountCents;
        else if (newParams.type === 'transfer') {
          if (newParams.transferDirection === 'incoming') cardDelta = -newAmountCents;
          else if (newParams.transferDirection === 'outgoing') cardDelta = newAmountCents;
        }

        if (cardDelta !== 0) {
          const updateQuery = CardModel.updateOne(
            { _id: newCardId, userId: uId },
            { $inc: { balanceCents: cardDelta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      }
    }

    // 3. Update the transaction document
    const updateData: Record<string, any> = {
      type: newParams.type,
      amountCents: newAmountCents,
      date: newParams.date,
      category: newParams.category || 'General',
      description: newParams.description || '',
      paymentMethod: newParams.paymentMethod || 'cash',
      bankAccountId: newBankAccountId || null,
      cardId: newCardId || null,
      transferDirection: newParams.transferDirection || null,
    };

    const updateDocQuery = TransactionModel.findOneAndUpdate(
      { _id: txId, userId: uId },
      { $set: updateData },
      { new: true, runValidators: true },
    );
    if (session) updateDocQuery.session(session);
    const updated = await updateDocQuery.exec();
    if (!updated) throw new HttpError(404, 'Transaction not found');
    return updated;
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
            $cond: [
              {
                $or: [
                  { $eq: ['$type', 'income'] },
                  { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'incoming'] }] },
                ],
              },
              '$amountCents',
              0,
            ],
          },
        },
        expenseSum: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$type', 'expense'] },
                  { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'outgoing'] }] },
                ],
              },
              '$amountCents',
              0,
            ],
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
              $cond: [
                {
                  $or: [
                    { $eq: ['$type', 'income'] },
                    { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'incoming'] }] },
                  ],
                },
                '$amountCents',
                0,
              ],
            },
          },
          expenseSum: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$type', 'expense'] },
                    { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'outgoing'] }] },
                  ],
                },
                '$amountCents',
                0,
              ],
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

export interface TransferFundsParams {
  fromAccountId?: string | mongoose.Types.ObjectId | null;
  fromCardId?: string | mongoose.Types.ObjectId | null;
  toAccountId?: string | mongoose.Types.ObjectId | null;
  toCardId?: string | mongoose.Types.ObjectId | null;
  amountCents: number;
  date: string;
  description?: string;
  category?: string;
}

/**
 * Transfers funds between own accounts, cash, or cards atomically.
 * Creates two linked ledger transactions sharing a unique transferGroupId.
 */
export async function transferFunds(
  userId: string | mongoose.Types.ObjectId,
  params: TransferFundsParams,
): Promise<{ transferGroupId: string; outgoingTx: ITransaction; incomingTx: ITransaction }> {
  return withLedgerSession(async (session) => {
    const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const amountCents = Math.round(Number(params.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new HttpError(400, 'Transfer amount must be a positive number');
    }

    let fromAcc: IBankAccount | null = null;
    let fromCard: any = null;
    let fromAccId: mongoose.Types.ObjectId | null = null;
    let fromCardId: mongoose.Types.ObjectId | null = null;

    if (params.fromAccountId === 'cash') {
      fromAcc = await ensureCashWallet(uId);
      fromAccId = fromAcc._id as mongoose.Types.ObjectId;
    } else if (params.fromAccountId) {
      if (!mongoose.isValidObjectId(params.fromAccountId)) throw new HttpError(400, 'Invalid source bank account ID');
      fromAcc = await BankAccountModel.findOne({ _id: params.fromAccountId, userId: uId });
      if (!fromAcc) throw new HttpError(404, 'Source bank account not found');
      fromAccId = fromAcc._id as mongoose.Types.ObjectId;
    } else if (params.fromCardId) {
      if (!mongoose.isValidObjectId(params.fromCardId)) throw new HttpError(400, 'Invalid source card ID');
      fromCard = await CardModel.findOne({ _id: params.fromCardId, userId: uId });
      if (!fromCard) throw new HttpError(404, 'Source card not found');
      fromCardId = fromCard._id as mongoose.Types.ObjectId;
    } else {
      throw new HttpError(400, 'Source bank account, card, or cash wallet must be specified');
    }

    let toAcc: IBankAccount | null = null;
    let toCard: any = null;
    let toAccId: mongoose.Types.ObjectId | null = null;
    let toCardId: mongoose.Types.ObjectId | null = null;

    if (params.toAccountId === 'cash') {
      toAcc = await ensureCashWallet(uId);
      toAccId = toAcc._id as mongoose.Types.ObjectId;
    } else if (params.toAccountId) {
      if (!mongoose.isValidObjectId(params.toAccountId)) throw new HttpError(400, 'Invalid destination bank account ID');
      toAcc = await BankAccountModel.findOne({ _id: params.toAccountId, userId: uId });
      if (!toAcc) throw new HttpError(404, 'Destination bank account not found');
      toAccId = toAcc._id as mongoose.Types.ObjectId;
    } else if (params.toCardId) {
      if (!mongoose.isValidObjectId(params.toCardId)) throw new HttpError(400, 'Invalid destination card ID');
      toCard = await CardModel.findOne({ _id: params.toCardId, userId: uId });
      if (!toCard) throw new HttpError(404, 'Destination card not found');
      toCardId = toCard._id as mongoose.Types.ObjectId;
    } else {
      throw new HttpError(400, 'Destination bank account, card, or cash wallet must be specified');
    }

    if (fromAccId && toAccId && fromAccId.toString() === toAccId.toString()) {
      throw new HttpError(400, 'Source and destination accounts must be different');
    }
    if (fromCardId && toCardId && fromCardId.toString() === toCardId.toString()) {
      throw new HttpError(400, 'Source and destination cards must be different');
    }

    const transferGroupId = 'trf_' + new mongoose.Types.ObjectId().toString();

    const srcName = fromAcc
      ? `${fromAcc.bankName} (${fromAcc.accountName})`
      : fromCard
      ? `${fromCard.name} (•••• ${fromCard.last4})`
      : 'Source';
    const destName = toAcc
      ? `${toAcc.bankName} (${toAcc.accountName})`
      : toCard
      ? `${toCard.name} (•••• ${toCard.last4})`
      : 'Destination';

    const baseDesc = params.description?.trim();
    const outDesc = baseDesc ? `${baseDesc} (To ${destName})` : `Transfer to ${destName}`;
    const inDesc = baseDesc ? `${baseDesc} (From ${srcName})` : `Transfer from ${srcName}`;

    const fromMethod = fromCard
      ? (fromCard.cardType === 'credit' ? 'credit_card' : 'card')
      : (fromAcc?.accountType === 'cash' ? 'cash' : 'bank_transfer');
    const toMethod = toCard
      ? (toCard.cardType === 'credit' ? 'credit_card' : 'card')
      : (toAcc?.accountType === 'cash' ? 'cash' : 'bank_transfer');

    const outgoingTx = await postTransaction({
      userId: uId,
      type: 'transfer',
      transferDirection: 'outgoing',
      amountCents,
      date: params.date,
      category: params.category || 'Transfer',
      description: outDesc,
      paymentMethod: fromMethod,
      bankAccountId: fromAccId,
      cardId: fromCardId,
      referenceId: transferGroupId,
      transferGroupId,
    }, session);

    const incomingTx = await postTransaction({
      userId: uId,
      type: 'transfer',
      transferDirection: 'incoming',
      amountCents,
      date: params.date,
      category: params.category || 'Transfer',
      description: inDesc,
      paymentMethod: toMethod,
      bankAccountId: toAccId,
      cardId: toCardId,
      referenceId: transferGroupId,
      transferGroupId,
    }, session);

    return { transferGroupId, outgoingTx, incomingTx };
  });
}

/**
 * Deletes both legs of a transfer atomically and restores account and card balances.
 */
export async function deleteTransfer(
  userId: string | mongoose.Types.ObjectId,
  transferGroupId: string,
): Promise<{ count: number }> {
  return withLedgerSession(async (session) => {
    const uId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const findQuery = TransactionModel.find({
      userId: uId,
      $or: [{ transferGroupId }, { referenceId: transferGroupId }],
    });
    if (session) findQuery.session(session);
    const transactions = await findQuery;

    if (transactions.length === 0) {
      throw new HttpError(404, 'Transfer not found');
    }

    for (const tx of transactions) {
      if (tx.bankAccountId) {
        let reverseDelta = 0;
        if (tx.type === 'income') reverseDelta = -tx.amountCents;
        else if (tx.type === 'expense') reverseDelta = tx.amountCents;
        else if (tx.type === 'transfer') {
          if (tx.transferDirection === 'incoming') reverseDelta = -tx.amountCents;
          else if (tx.transferDirection === 'outgoing') reverseDelta = tx.amountCents;
        }

        if (reverseDelta !== 0) {
          const updateQuery = BankAccountModel.updateOne(
            { _id: tx.bankAccountId, userId: uId },
            { $inc: { balanceCents: reverseDelta } },
          );
          if (session) updateQuery.session(session);
          await updateQuery;
        }
      }

      if (tx.cardId) {
        const card = await CardModel.findOne({ _id: tx.cardId, userId: uId });
        if (card && (card.cardType === 'credit' || tx.paymentMethod === 'credit_card')) {
          let cardReverseDelta = 0;
          if (tx.type === 'expense') cardReverseDelta = -tx.amountCents;
          else if (tx.type === 'income') cardReverseDelta = tx.amountCents;
          else if (tx.type === 'transfer') {
            if (tx.transferDirection === 'incoming') cardReverseDelta = tx.amountCents;
            else if (tx.transferDirection === 'outgoing') cardReverseDelta = -tx.amountCents;
          }

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

    return { count: transactions.length };
  });
}
