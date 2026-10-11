import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BankAccountModel } from '../models/BankAccount';
import { TransactionModel } from '../models/Transaction';
import {
  ensureCashWallet,
  recomputeBalance,
  postTransaction,
  reverseTransaction,
  backfillOpeningBalances,
} from './ledgerService';
import { createRecord, deleteRecord, getRecord } from './recordService';

describe('Ledger Service & Opening Balance Integrity (2.1)', () => {
  let mongoServer: MongoMemoryServer;
  const testUserId = new mongoose.Types.ObjectId().toString();

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await BankAccountModel.deleteMany({});
    await TransactionModel.deleteMany({});
  });

  it('adds openingBalanceCents and initializes balanceCents to opening balance on create', async () => {
    const account = await createRecord('bankAccounts', testUserId, {
      bankName: 'Sampath Bank',
      accountNumber: '100200300400',
      accountName: 'Savings Main',
      accountType: 'savings',
      openingBalance: 50000, // 50,000 LKR = 5,000,000 cents
    });

    assert.strictEqual(account.openingBalanceCents, 5000000);
    assert.strictEqual(account.balanceCents, 5000000);

    const fetched = await getRecord('bankAccounts', testUserId, account._id.toString());
    assert.strictEqual(fetched.openingBalanceCents, 5000000);
    assert.strictEqual(fetched.currentBalance, 50000);
  });

  it('ensures a built-in non-deletable cash wallet per user', async () => {
    const cashWallet = await ensureCashWallet(testUserId);
    assert.ok(cashWallet);
    assert.strictEqual(cashWallet.accountType, 'cash');
    assert.strictEqual(cashWallet.bankName, 'Cash');
    assert.strictEqual(cashWallet.accountName, 'Cash Wallet');

    // Idempotent: second call returns the same wallet
    const cashWallet2 = await ensureCashWallet(testUserId);
    assert.strictEqual(cashWallet2._id.toString(), cashWallet._id.toString());

    // Deleting the cash wallet must be blocked
    await assert.rejects(
      async () => {
        await deleteRecord('bankAccounts', testUserId, cashWallet._id.toString());
      },
      /Cannot delete.*cash wallet/i,
    );
  });

  it('recomputes balance accurately as openingBalanceCents + sum(signed transactions)', async () => {
    const account = await createRecord('bankAccounts', testUserId, {
      bankName: 'Commercial Bank',
      accountNumber: '88889999',
      accountName: 'Salary Account',
      openingBalance: 100000, // 10,000,000 cents
    });

    // Post an income transaction (+25,000 LKR = 2,500,000 cents)
    await postTransaction({
      userId: testUserId,
      bankAccountId: account._id,
      type: 'income',
      amountCents: 2500000,
      date: '2026-10-01',
      category: 'Salary',
      description: 'Monthly Salary',
      paymentMethod: 'bank_transfer',
      referenceId: 'ref-salary-1',
    });

    // Post an expense transaction (-10,000 LKR = 1,000,000 cents)
    await postTransaction({
      userId: testUserId,
      bankAccountId: account._id,
      type: 'expense',
      amountCents: 1000000,
      date: '2026-10-02',
      category: 'Rent',
      description: 'Apartment Rent',
      paymentMethod: 'bank_transfer',
      referenceId: 'ref-rent-1',
    });

    const recomputed = await recomputeBalance(testUserId, account._id.toString());
    // 10,000,000 + 2,500,000 - 1,000,000 = 11,500,000 cents
    assert.strictEqual(recomputed.computedBalanceCents, 11500000);
    assert.strictEqual(recomputed.driftCents, 0);

    const doc = await BankAccountModel.findById(account._id);
    assert.strictEqual(doc?.balanceCents, 11500000);
  });

  it('reverses a transaction and restores account balance', async () => {
    const account = await createRecord('bankAccounts', testUserId, {
      bankName: 'HNB',
      accountNumber: '77776666',
      openingBalance: 20000, // 2,000,000 cents
    });

    await postTransaction({
      userId: testUserId,
      bankAccountId: account._id,
      type: 'expense',
      amountCents: 500000,
      date: '2026-10-05',
      category: 'Utilities',
      referenceId: 'ref-expense-to-reverse',
    });

    const afterPost = await BankAccountModel.findById(account._id);
    assert.strictEqual(afterPost?.balanceCents, 1500000);

    await reverseTransaction(testUserId, 'ref-expense-to-reverse');

    const afterReverse = await BankAccountModel.findById(account._id);
    assert.strictEqual(afterReverse?.balanceCents, 2000000);

    const txExists = await TransactionModel.exists({ referenceId: 'ref-expense-to-reverse' });
    assert.strictEqual(txExists, null);
  });

  it('migrates openingBalance = current balance - sum(existing tx)', async () => {
    // Legacy account with balance 80,000 LKR (8,000,000 cents) and undefined openingBalanceCents
    const rawAccount = await BankAccountModel.create({
      userId: new mongoose.Types.ObjectId(testUserId),
      bankName: 'Seylan Bank',
      accountNumber: '99887766',
      accountName: 'Legacy Account',
      balanceCents: 8000000,
    });

    // An existing income tx of +30,000 LKR (3,000,000 cents)
    await TransactionModel.create({
      userId: new mongoose.Types.ObjectId(testUserId),
      bankAccountId: rawAccount._id,
      type: 'income',
      amountCents: 3000000,
      date: '2026-09-01',
    });

    // Dry-run should detect 1 account to update without mutating
    const dryRunRes = await backfillOpeningBalances({ dryRun: true });
    assert.strictEqual(dryRunRes.updatedCount, 1);
    const unchanged = await BankAccountModel.findById(rawAccount._id);
    assert.strictEqual(unchanged?.openingBalanceCents, 0); // default in schema is 0

    // Live fix: openingBalance = 8,000,000 - 3,000,000 = 5,000,000 cents
    const liveRes = await backfillOpeningBalances({ dryRun: false });
    assert.strictEqual(liveRes.updatedCount, 1);
    const updated = await BankAccountModel.findById(rawAccount._id);
    assert.strictEqual(updated?.openingBalanceCents, 5000000);
  });
});
