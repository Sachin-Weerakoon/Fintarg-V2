import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { calculateLoanPayoff, createRecord, deleteFinancePaymentPayment, deleteLoanRepayment, deletePawnPayment, deriveNextDueDate, getRecord, listRecords, recordFinancePayment, recordLoanRepayment, recordPawnPayment, updateRecord } from './recordService';
import { BankAccountModel } from '../models/BankAccount';
import { FinancePaymentModel } from '../models/FinancePayment';
import { PawnedItemModel } from '../models/PawnedItem';
import { TransactionModel } from '../models/Transaction';

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

  it('bankAccounts: persists notes field correctly on create and update (1.5)', async () => {
    const created = await createRecord('bankAccounts', userId, {
      bankName: 'HNB Bank',
      accountNumber: '44332211',
      name: 'Tax Savings Account',
      notes: 'Initial account creation note',
      balance: 10000,
    });
    assert.strictEqual((created as any).notes, 'Initial account creation note');

    const updated = await updateRecord('bankAccounts', userId, String(created._id), {
      notes: 'Updated account tax note',
    });
    assert.strictEqual((updated as any).notes, 'Updated account tax note');

    const doc = await getRecord('bankAccounts', userId, String(created._id));
    assert.strictEqual((doc as any).notes, 'Updated account tax note');
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

  it('foreign keys: rejects invalid ObjectIds with 400 and unowned cards/accounts with 404 (1.7)', async () => {
    // Invalid ObjectId format should throw 400
    await assert.rejects(
      async () => {
        await createRecord('expenses', userId, {
          date: '2026-10-02',
          amount: 500,
          category: 'Snacks',
          cardId: 'invalid-non-object-id',
        });
      },
      (err: any) => err.status === 400 && /Invalid card id/i.test(err.message)
    );

    await assert.rejects(
      async () => {
        await createRecord('expenses', userId, {
          date: '2026-10-02',
          amount: 500,
          category: 'Snacks',
          bankAccountId: 'invalid-non-object-id',
        });
      },
      (err: any) => err.status === 400 && /Invalid bank account id/i.test(err.message)
    );

    // Another user's cardId should throw 404
    const otherUserId = new mongoose.Types.ObjectId().toString();
    const otherCard = await createRecord('cards', otherUserId, {
      cardName: 'Other User Card',
      last4: '1111',
      creditLimit: 50000,
    });

    await assert.rejects(
      async () => {
        await createRecord('expenses', userId, {
          date: '2026-10-02',
          amount: 500,
          category: 'Snacks',
          cardId: String(otherCard._id),
        });
      },
      (err: any) => err.status === 404 && /Card not found/i.test(err.message)
    );
  });

  describe('Loan repayment, ledger integration & payoff calculation (2.3)', () => {
    it('records cash loan repayment, creates transaction, updates cash wallet, and splits principal/interest', async () => {
      // 100,000 principal, 12% reducing balance, 12 months -> EMI 8,884.88
      const loan = await createRecord('loans', userId, {
        lender: 'Commercial Bank',
        amount: 100000,
        rate: 12,
        method: 'reducing_balance',
        tenureMonths: 12,
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
      });

      const updated = await recordLoanRepayment(
        userId,
        String(loan._id),
        8884.88,
        '2026-02-01',
        'Month 1 Installment',
        'cash',
      );

      assert.strictEqual(updated.repayments.length, 1);
      const r1 = updated.repayments[0];
      assert.strictEqual(r1.amountCents, 888488);
      // Month 1 interest on 100,000 @ 1% per month is 1,000 (100,000 cents)
      assert.strictEqual(r1.interestCents, 100000);
      // Month 1 principal is 8,884.88 - 1,000.00 = 7,884.88 (788,488 cents)
      assert.strictEqual(r1.principalCents, 788488);
      assert.strictEqual(r1.paymentMethod, 'cash');

      // Balance reduced
      assert.strictEqual(updated.balanceCents, 10000000 - 888488);

      // Linked transaction verified
      assert.ok(r1.transactionId);
      const tx = await TransactionModel.findById(r1.transactionId);
      assert.ok(tx);
      assert.strictEqual(tx.amountCents, 888488);
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.category, 'Loan Repayment');
      assert.strictEqual(tx.paymentMethod, 'cash');

      // Cash wallet debited
      const cashWallet = await BankAccountModel.findOne({ userId, accountType: 'cash' });
      assert.ok(cashWallet);
      assert.strictEqual(cashWallet.balanceCents, -888488);
    });

    it('records bank-linked loan repayment, debits bank account, and creates transaction', async () => {
      const bankAccount = await createRecord('bankAccounts', userId, {
        bankName: 'HNB',
        accountNumber: '88889999',
        balance: 150000,
      });
      const initialBalanceCents = (bankAccount as any).balanceCents;

      const loan = await createRecord('loans', userId, {
        lender: 'HNB Personal Loan',
        amount: 50000,
        rate: 10,
        method: 'simple',
        tenureMonths: 10,
        startDate: '2026-01-01',
      });

      const updated = await recordLoanRepayment(
        userId,
        String(loan._id),
        5000,
        '2026-02-01',
        'Bank Transfer Repayment',
        'bank_transfer',
        String(bankAccount._id),
      );

      assert.strictEqual(updated.repayments.length, 1);
      const r1 = updated.repayments[0];
      assert.strictEqual(r1.amountCents, 500000);
      assert.strictEqual(r1.paymentMethod, 'bank_transfer');
      assert.strictEqual(String(r1.bankAccountId), String(bankAccount._id));

      // Bank account debited
      const updatedAccount = await BankAccountModel.findById(bankAccount._id);
      assert.strictEqual(updatedAccount.balanceCents, initialBalanceCents - 500000);

      // Test payoff calculation
      const payoff = await calculateLoanPayoff(userId, String(loan._id));
      assert.strictEqual(payoff.totalRepaidCents, 500000);
      assert.strictEqual(payoff.remainingBalanceCents, 5000000 - 500000);
      assert.strictEqual(payoff.payoffAmountCents, 5000000 - 500000);

      // Test undo / delete repayment
      const undone = await deleteLoanRepayment(userId, String(loan._id), String(r1._id));
      assert.strictEqual(undone.repayments.length, 0);
      assert.strictEqual(undone.balanceCents, 5000000);

      // Bank account balance restored
      const restoredAccount = await BankAccountModel.findById(bankAccount._id);
      assert.strictEqual(restoredAccount.balanceCents, initialBalanceCents);

      // Transaction deleted
      const txAfterUndo = await TransactionModel.findById(r1.transactionId);
      assert.strictEqual(txAfterUndo, null);
    });

    it('rejects bank repayment without bankAccountId or unowned account', async () => {
      const loan = await createRecord('loans', userId, {
        lender: 'Seylan Bank',
        amount: 25000,
        rate: 12,
        startDate: '2026-01-01',
      });

      await assert.rejects(
        async () => {
          await recordLoanRepayment(userId, String(loan._id), 2500, '2026-02-01', 'No account', 'bank_transfer');
        },
        (err: any) => err.status === 400 && /Bank account is required/i.test(err.message),
      );

      const otherUser = new mongoose.Types.ObjectId().toString();
      const otherAccount = await createRecord('bankAccounts', otherUser, {
        bankName: 'Other Bank',
        accountNumber: '112233',
      });

      await assert.rejects(
        async () => {
          await recordLoanRepayment(userId, String(loan._id), 2500, '2026-02-01', 'Other account', 'bank_transfer', String(otherAccount._id));
        },
        (err: any) => err.status === 404 && /Bank account not found/i.test(err.message),
      );
    });
  });

  describe('pawn payments, part-principal, redemption, and undo (2.4)', () => {
    it('creates pawned item with default status active and sets principalOutstandingCents', async () => {
      const item = await createRecord('pawnedItems', userId, {
        description: '22K Gold Sovereign',
        ticketNumber: 'TKT-9901',
        amountReceived: 100000,
        interestRate: 2,
        nextDue: '2026-03-01',
      });

      assert.strictEqual((item as any).status, 'active');
      assert.strictEqual((item as any).ticketNumber, 'TKT-9901');
      assert.strictEqual((item as any).amountReceivedCents, 10000000);
      assert.strictEqual((item as any).principalOutstandingCents, 10000000);
      assert.strictEqual((item as any).interestPaidCents, 0);
    });

    it('records interest payment, updates interestPaidCents, advances nextDue, and logs transaction', async () => {
      const item = await createRecord('pawnedItems', userId, {
        description: 'Gold Chain (16g)',
        amountReceived: 60000,
        interestRate: 24, // 24% annual / 2% monthly -> 60000 * 0.24 / 12 = 1200 rupees (120,000 cents)
        nextDue: '2026-04-15',
      });

      const updated = await recordPawnPayment(userId, String(item._id), {
        paymentType: 'interest',
        paymentMethod: 'cash',
        date: '2026-04-10',
      });

      assert.strictEqual(updated.interestPaidCents, 120000);
      assert.strictEqual(updated.principalOutstandingCents, 6000000);
      assert.strictEqual(updated.nextDue, '2026-05-15');
      assert.strictEqual(updated.payments.length, 1);
      assert.strictEqual(updated.payments[0].paymentType, 'interest');
      assert.strictEqual(updated.payments[0].amountCents, 120000);

      // Verify transaction created
      const tx = await TransactionModel.findById(updated.payments[0].transactionId);
      assert.ok(tx);
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.amountCents, 120000);
    });

    it('handles part-principal payment, full redemption, and undo', async () => {
      const item = await createRecord('pawnedItems', userId, {
        description: 'Gold Ring',
        amountReceived: 50000,
        interestRate: 12,
        nextDue: '2026-05-01',
      });

      // Part principal of 20,000
      const afterPart = await recordPawnPayment(userId, String(item._id), {
        paymentType: 'part_principal',
        amount: 20000,
        paymentMethod: 'cash',
        date: '2026-05-01',
      });

      assert.strictEqual(afterPart.principalOutstandingCents, 3000000);
      assert.strictEqual(afterPart.status, 'active');
      assert.strictEqual(afterPart.payments.length, 1);

      // Full redemption of remaining 30,000
      const afterRedemption = await recordPawnPayment(userId, String(item._id), {
        paymentType: 'redemption',
        paymentMethod: 'cash',
        date: '2026-05-15',
      });

      assert.strictEqual(afterRedemption.principalOutstandingCents, 0);
      assert.strictEqual(afterRedemption.status, 'redeemed');
      assert.strictEqual(afterRedemption.redemptionDate, '2026-05-15');
      assert.strictEqual(afterRedemption.payments.length, 2);

      // Undo redemption payment
      const redemptionPaymentId = String(afterRedemption.payments[1]._id);
      const afterUndo = await deletePawnPayment(userId, String(item._id), redemptionPaymentId);

      assert.strictEqual(afterUndo.principalOutstandingCents, 3000000);
      assert.strictEqual(afterUndo.status, 'active');
      assert.strictEqual(afterUndo.redemptionDate, '');
      assert.strictEqual(afterUndo.payments.length, 1);
    });

    it('rejects bank payment without bankAccountId', async () => {
      const item = await createRecord('pawnedItems', userId, {
        description: 'Gold Bracelet',
        amountReceived: 40000,
        interestRate: 12,
        nextDue: '2026-06-01',
      });

      await assert.rejects(
        async () => {
          await recordPawnPayment(userId, String(item._id), {
            paymentType: 'interest',
            paymentMethod: 'bank_transfer',
          });
        },
        (err: any) => err.status === 400 && /Bank account is required/i.test(err.message),
      );
    });
  });

  describe('finance payments, mark as paid, nextDueDate derivation, and undo (2.5)', () => {
    it('deriveNextDueDate calculates future due date correctly based on dueDay', () => {
      const baseDate = new Date('2026-03-25T10:00:00.000Z');
      // Due day 10 has already passed in March -> should be 2026-04-10
      assert.strictEqual(deriveNextDueDate(10, baseDate), '2026-04-10');
      // Due day 28 hasn't passed in March -> should be 2026-03-28
      assert.strictEqual(deriveNextDueDate(28, baseDate), '2026-03-28');
    });

    it('creates finance payment with auto-derived nextDueDate when not specified', async () => {
      const fp = await createRecord('financePayments', userId, {
        lender: 'Singer Sri Lanka',
        amount: 15000,
        dueDay: 15,
        monthsRemaining: 12,
        paymentKind: 'instalment',
      });

      assert.strictEqual((fp as any).amountCents, 1500000);
      assert.strictEqual((fp as any).status, 'active');
      assert.strictEqual((fp as any).monthsRemaining, 12);
      assert.ok((fp as any).nextDueDate, 'nextDueDate should be derived');
      assert.ok((fp as any).nextDueDate.endsWith('-15'), 'nextDueDate should end with due day');
    });

    it('marks finance payment as paid: debits account, advances nextDueDate, decrements monthsRemaining, and creates transaction', async () => {
      const bankAccount = await createRecord('bankAccounts', userId, {
        bankName: 'Commercial Bank',
        accountNumber: '99887766',
        balance: 100000,
      });
      const initialBalance = (bankAccount as any).balanceCents;

      const fp = await createRecord('financePayments', userId, {
        lender: 'Central Finance Lease',
        amount: 25000,
        dueDay: 10,
        nextDueDate: '2026-05-10',
        monthsRemaining: 2,
        paymentKind: 'lease',
        bankAccountId: String(bankAccount._id),
      });

      const updated = await recordFinancePayment(userId, String(fp._id), {
        paymentMethod: 'bank_transfer',
        bankAccountId: String(bankAccount._id),
        date: '2026-05-09',
        note: 'May Lease Installment',
      });

      assert.strictEqual(updated.monthsRemaining, 1);
      assert.strictEqual(updated.nextDueDate, '2026-06-10');
      assert.strictEqual(updated.status, 'active');
      assert.strictEqual(updated.payments.length, 1);

      const payRecord = updated.payments[0];
      assert.strictEqual(payRecord.amountCents, 2500000);
      assert.strictEqual(payRecord.paymentMethod, 'bank_transfer');

      // Bank account debited
      const debitedAccount = await BankAccountModel.findById(bankAccount._id);
      assert.strictEqual(debitedAccount.balanceCents, initialBalance - 2500000);

      // Transaction created
      const tx = await TransactionModel.findById(payRecord.transactionId);
      assert.ok(tx);
      assert.strictEqual(tx.category, 'Finance Payment');
      assert.strictEqual(tx.amountCents, 2500000);
    });

    it('completes obligation when monthsRemaining reaches 0 and restores upon undo', async () => {
      const fp = await createRecord('financePayments', userId, {
        lender: 'Final Month Equipment Lease',
        amount: 10000,
        dueDay: 5,
        nextDueDate: '2026-06-05',
        monthsRemaining: 1,
        paymentKind: 'instalment',
      });

      const afterPayment = await recordFinancePayment(userId, String(fp._id), {
        paymentMethod: 'cash',
        date: '2026-06-05',
      });

      assert.strictEqual(afterPayment.monthsRemaining, 0);
      assert.strictEqual(afterPayment.status, 'completed');
      assert.strictEqual(afterPayment.payments.length, 1);

      // Undo the final payment
      const paymentId = String(afterPayment.payments[0]._id);
      const afterUndo = await deleteFinancePaymentPayment(userId, String(fp._id), paymentId);

      assert.strictEqual(afterUndo.monthsRemaining, 1);
      assert.strictEqual(afterUndo.status, 'active');
      assert.strictEqual(afterUndo.nextDueDate, '2026-06-05');
      assert.strictEqual(afterUndo.payments.length, 0);
    });

    it('rejects bank payment without bankAccountId', async () => {
      const fp = await createRecord('financePayments', userId, {
        lender: 'Standing Order Obligation',
        amount: 8000,
        dueDay: 20,
        monthsRemaining: 6,
        paymentKind: 'standing_order',
      });

      await assert.rejects(
        async () => {
          await recordFinancePayment(userId, String(fp._id), {
            paymentMethod: 'standing_order',
          });
        },
        (err: any) => err.status === 400 && /Bank account is required/i.test(err.message),
      );
    });
  });
});
