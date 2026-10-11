import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createRecord, updateRecord, getRecord, listRecords } from './recordService';

describe('recordService CRUD & Update partial isolation (1.1)', () => {
  let memoryServer: any = null;
  const userId = new mongoose.Types.ObjectId().toString();

  before(async () => {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
    await mongoose.connect(memoryServer.getUri(), { dbName: 'fintarg-records-test' });
  });

  after(async () => {
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
  });

  it('bankAccounts: update without name preserves existing accountName and does not default to Main Account', async () => {
    const created = await createRecord('bankAccounts', userId, {
      bankName: 'Sampath Bank',
      accountNumber: '12345678',
      name: 'Salary Account',
      branch: 'Colombo 03',
      balance: 50000,
    });
    assert.strictEqual((created as any).accountName, 'Salary Account');

    // Partial update touching only branch
    const updated = await updateRecord('bankAccounts', userId, String(created._id), {
      branch: 'Colombo 07',
    });
    assert.strictEqual((updated as any).accountName, 'Salary Account');
    assert.strictEqual((updated as any).branch, 'Colombo 07');
  });

  it('bankAccounts: update does not overwrite existing balanceCents even if balance/currentBalance is passed (1.4)', async () => {
    const created = await createRecord('bankAccounts', userId, {
      bankName: 'Commercial Bank',
      accountNumber: '88776655',
      name: 'Business Checking',
      balance: 100000, // 100,000 balance (10,000,000 cents)
    });
    assert.strictEqual((created as any).balanceCents, 10000000);

    // Update account with branch change and a stale balance/currentBalance payload
    const updated = await updateRecord('bankAccounts', userId, String(created._id), {
      branch: 'Kandy City',
      balance: 500, // Should be ignored by updateRecord to protect ledger
      currentBalance: 500,
    });

    assert.strictEqual((updated as any).branch, 'Kandy City');
    assert.strictEqual((updated as any).balanceCents, 10000000, 'Existing ledger balance must remain untouched');
  });

  it('cards: update does not overwrite cardName with Payment Card or last4 with 0000', async () => {
    const created = await createRecord('cards', userId, {
      cardName: 'Commercial Platinum',
      last4: '4567',
      creditLimit: 250000,
      billingDay: 10,
    });
    assert.strictEqual((created as any).cardName, 'Commercial Platinum');
    assert.strictEqual((created as any).last4, '4567');

    const updated = await updateRecord('cards', userId, String(created._id), {
      dueDay: 25,
    });
    assert.strictEqual((updated as any).cardName, 'Commercial Platinum');
    assert.strictEqual((updated as any).last4, '4567');
    assert.strictEqual((updated as any).dueDay, 25);
  });

  it('cards: never stores full cardNumber or cvv in database or API responses', async () => {
    const created = await createRecord('cards', userId, {
      cardName: 'Web Debit Card',
      cardNumber: '4111222233339876',
      cvv: '999',
      last4: '9876',
      creditLimit: 0,
    });

    const doc = await getRecord('cards', userId, String(created._id));
    assert.strictEqual((doc as any).cardNumber, undefined);
    assert.strictEqual((doc as any).cvv, undefined);
    assert.strictEqual((doc as any).last4, '9876');

    const list = await listRecords('cards', userId);
    const listed = list.find((c: any) => String(c._id) === String(created._id));
    assert.strictEqual((listed as any).cardNumber, undefined);
    assert.strictEqual((listed as any).cvv, undefined);
    assert.strictEqual((listed as any).last4, '9876');
  });

  it('loans: update lender preserves monthlyPayment, totalInterest, and repayments', async () => {
    const created = await createRecord('loans', userId, {
      lender: 'Seylan Bank',
      amount: 100000,
      rate: 12,
      tenureMonths: 12,
      method: 'reducing_balance',
      interestBasis: 'annual',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
    });

    const origEMI = (created as any).monthlyPaymentCents;
    const origInterest = (created as any).totalInterestCents;
    assert.ok(origEMI > 0, 'Original EMI must be > 0');
    assert.ok(origInterest > 0, 'Original interest must be > 0');

    // Update only lender
    const updated = await updateRecord('loans', userId, String(created._id), {
      lender: 'Seylan Bank PLC Updated',
    });

    assert.strictEqual((updated as any).lender, 'Seylan Bank PLC Updated');
    assert.strictEqual((updated as any).monthlyPaymentCents, origEMI, 'EMI must not be zeroed when editing lender');
    assert.strictEqual((updated as any).totalInterestCents, origInterest, 'Total interest must not be zeroed when editing lender');
  });

  it('loans: update principal recalculates EMI and adjusts balance preserving total repaid', async () => {
    const created = await createRecord('loans', userId, {
      lender: 'HNB Bank',
      amount: 100000,
      rate: 12,
      tenureMonths: 12,
      method: 'simple',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
    });

    // Simulate 20,000 already repaid
    await updateRecord('loans', userId, String(created._id), {
      balanceCents: 8000000, // 80,000 remaining
      repayments: [{ date: '2026-02-01', amountCents: 2000000, note: 'Part payment' }],
    });

    // Now edit principal from 100,000 to 120,000
    const updated = await updateRecord('loans', userId, String(created._id), {
      amount: 120000,
    });

    // Total repaid was 20,000. Balance should be max(0, 120,000 - 20,000) = 100,000 (10,000,000 cents)
    assert.strictEqual((updated as any).principalCents, 12000000);
    assert.strictEqual((updated as any).balanceCents, 10000000, 'Balance must adjust relative to repayments');
    assert.strictEqual((updated as any).repayments?.length, 1, 'Repayments must be preserved');
  });

  it('goals: update does not reset savedAmountCents or contributions', async () => {
    const created = await createRecord('goals', userId, {
      name: 'Emergency Fund',
      dailyAmount: 500,
      targetAmount: 100000,
      targetDate: '2026-12-31',
    });

    // Simulate a contribution
    await updateRecord('goals', userId, String(created._id), {
      savedAmountCents: 1500000,
      contributions: [{ date: '2026-02-01', amountCents: 1500000, note: 'Deposit' }],
    });

    // Update goal name only
    const updated = await updateRecord('goals', userId, String(created._id), {
      name: 'Emergency Fund 2026',
    });

    assert.strictEqual((updated as any).name, 'Emergency Fund 2026');
    assert.strictEqual((updated as any).savedAmountCents, 1500000, 'savedAmountCents must be preserved');
    assert.strictEqual((updated as any).contributions?.length, 1, 'contributions must be preserved');
  });
});
