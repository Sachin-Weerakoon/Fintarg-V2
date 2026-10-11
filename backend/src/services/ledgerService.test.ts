import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BankAccountModel } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import { TransactionModel } from '../models/Transaction';
import {
  ensureCashWallet,
  recomputeBalance,
  postTransaction,
  reverseTransaction,
  backfillOpeningBalances,
} from './ledgerService';
import { createRecord, deleteRecord, getRecord, updateRecord } from './recordService';

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

describe('Expenses and Incomes Ledger Integration (2.2)', () => {
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
    await CardModel.deleteMany({});
    await TransactionModel.deleteMany({});
  });

  it('cash expense automatically routes to cash wallet and updates its balance', async () => {
    const cashWallet = await ensureCashWallet(testUserId);
    assert.strictEqual(cashWallet.balanceCents, 0);

    const expense = await createRecord('expenses', testUserId, {
      date: '2026-10-10',
      amount: 1200, // 120,000 cents
      category: 'Food',
      note: 'Lunch at cafe',
      paymentMethod: 'cash',
    });

    const updatedWallet = await BankAccountModel.findById(cashWallet._id);
    assert.strictEqual(updatedWallet?.balanceCents, -120000);

    const tx = await TransactionModel.findOne({ referenceId: expense._id.toString() });
    assert.ok(tx);
    assert.strictEqual(tx.type, 'expense');
    assert.strictEqual(tx.amountCents, 120000);
    assert.strictEqual(tx.bankAccountId?.toString(), cashWallet._id.toString());
  });

  it('updating an expense adjusts account balance and updates the transaction', async () => {
    const account = await createRecord('bankAccounts', testUserId, {
      bankName: 'Sampath Bank',
      accountNumber: '99001122',
      openingBalance: 50000, // 5,000,000 cents
    });

    const expense = await createRecord('expenses', testUserId, {
      date: '2026-10-10',
      amount: 5000, // 500,000 cents
      category: 'Utilities',
      paymentMethod: 'bank_transfer',
      bankAccountId: account._id.toString(),
    });

    const accAfterCreate = await BankAccountModel.findById(account._id);
    assert.strictEqual(accAfterCreate?.balanceCents, 4500000);

    // Now update expense amount from 5,000 to 8,000 (800,000 cents)
    await updateRecord('expenses', testUserId, expense._id.toString(), {
      amount: 8000,
    });

    const accAfterUpdate = await BankAccountModel.findById(account._id);
    // 5,000,000 - 800,000 = 4,200,000 cents
    assert.strictEqual(accAfterUpdate?.balanceCents, 4200000);

    const tx = await TransactionModel.findOne({ referenceId: expense._id.toString() });
    assert.ok(tx);
    assert.strictEqual(tx.amountCents, 800000);
  });

  it('credit card expense increases credit card outstanding balance', async () => {
    const card = await createRecord('cards', testUserId, {
      cardName: 'Gold Credit',
      cardType: 'credit',
      last4: '4321',
      creditLimit: 200000,
    });

    const expense = await createRecord('expenses', testUserId, {
      date: '2026-10-10',
      amount: 15000, // 1,500,000 cents
      category: 'Electronics',
      paymentMethod: 'credit_card',
      cardId: card._id.toString(),
    });

    const updatedCard = await CardModel.findById(card._id);
    assert.strictEqual(updatedCard?.balanceCents, 1500000);

    // Delete expense restores card balance
    await deleteRecord('expenses', testUserId, expense._id.toString());
    const afterDeleteCard = await CardModel.findById(card._id);
    assert.strictEqual(afterDeleteCard?.balanceCents, 0);
  });
});
