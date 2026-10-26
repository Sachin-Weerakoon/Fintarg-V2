import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { addGoalContribution, calculateLoanPayoff, createRecord, deleteFinancePaymentPayment, deleteGoalContribution, deleteLoanRepayment, deletePawnPayment, deleteRecord, deriveNextDueDate, getRecord, getTransactionHistory, listRecords, recordFinancePayment, recordLoanRepayment, recordPawnPayment, updateRecord } from './recordService';
import { ensureCashWallet, recomputeBalance, transferFunds } from './ledgerService';
import { BankAccountModel } from '../models/BankAccount';
import { BranchEntryModel } from '../models/BranchEntry';
import { CardModel } from '../models/Card';
import { ExpenseModel } from '../models/Expense';
import { MedicalExpenseModel } from '../models/MedicalExpense';
import { FinancePaymentModel } from '../models/FinancePayment';
import { PawnedItemModel } from '../models/PawnedItem';
import { SavingsGoalModel } from '../models/SavingsGoal';
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

  it('goals: derives monthlyTargetCents from dailyAmount * daysInMonth of the target date (4.3)', async () => {
    // 28-day month (Feb 2026)
    const goalFeb26 = await createRecord('goals', userId, {
      name: 'Feb 2026 Goal',
      dailyAmount: 100,
      targetDate: '2026-02-15',
    });
    assert.strictEqual(goalFeb26.monthlyTargetCents, 10000 * 28);

    // 29-day leap month (Feb 2024)
    const goalFeb24 = await createRecord('goals', userId, {
      name: 'Feb 2024 Leap Goal',
      dailyAmount: 100,
      targetDate: '2024-02-20',
    });
    assert.strictEqual(goalFeb24.monthlyTargetCents, 10000 * 29);

    // 30-day month (April 2026)
    const goalApr = await createRecord('goals', userId, {
      name: 'April Goal',
      dailyAmount: 100,
      targetDate: '2026-04-10',
    });
    assert.strictEqual(goalApr.monthlyTargetCents, 10000 * 30);

    // 31-day month (March 2026)
    const goalMar = await createRecord('goals', userId, {
      name: 'March Goal',
      dailyAmount: 100,
      targetDate: '2026-03-31',
    });
    assert.strictEqual(goalMar.monthlyTargetCents, 10000 * 31);
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
      assert.strictEqual(updated.balanceCents, 10000000 - 788488, 'only the principal portion reduces a reducing-balance loan');

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
        interestRate: 2, // 2% per month -> 60000 * 0.02 = 1200 rupees (120,000 cents)
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

  describe('goal contributions and optional ledger debit (2.6)', () => {
    it('adds contribution without debiting account (tracks savings progress only)', async () => {
      const goal = await createRecord('goals', userId, {
        name: 'New Laptop',
        targetAmount: 250000,
        dailyAmount: 1000,
      });

      const updated = await addGoalContribution(userId, String(goal._id), {
        amount: 20000,
        date: '2026-03-10',
        note: 'Cash saved in envelope',
        debitAccount: false,
      });

      assert.strictEqual(updated.savedAmountCents, 2000000);
      assert.strictEqual(updated.contributions.length, 1);
      assert.strictEqual(updated.contributions[0].amountCents, 2000000);
      assert.strictEqual(updated.contributions[0].transactionId, null);
    });

    it('adds contribution with account debit, creates ledger transaction, and handles undo', async () => {
      const bankAccount = await createRecord('bankAccounts', userId, {
        bankName: 'NDB Bank',
        accountNumber: '55667788',
        balance: 100000,
      });
      const initialBalance = (bankAccount as any).balanceCents;

      const goal = await createRecord('goals', userId, {
        name: 'Vacation Fund',
        targetAmount: 150000,
        dailyAmount: 500,
      });

      const updated = await addGoalContribution(userId, String(goal._id), {
        amount: 25000,
        date: '2026-03-15',
        note: 'Bank transfer to vacation goal',
        debitAccount: true,
        paymentMethod: 'bank_transfer',
        bankAccountId: String(bankAccount._id),
      });

      assert.strictEqual(updated.savedAmountCents, 2500000);
      assert.strictEqual(updated.contributions.length, 1);
      const contrib = updated.contributions[0];
      assert.ok(contrib.transactionId);
      assert.strictEqual(contrib.paymentMethod, 'bank_transfer');

      // Bank account debited
      const debitedAccount = await BankAccountModel.findById(bankAccount._id);
      assert.strictEqual(debitedAccount.balanceCents, initialBalance - 2500000);

      // Transaction created
      const tx = await TransactionModel.findById(contrib.transactionId);
      assert.ok(tx);
      assert.strictEqual(tx.category, 'Savings Contribution');
      assert.strictEqual(tx.amountCents, 2500000);

      // Undo contribution
      const contribId = String(contrib._id);
      const afterUndo = await deleteGoalContribution(userId, String(goal._id), contribId);

      assert.strictEqual(afterUndo.savedAmountCents, 0);
      assert.strictEqual(afterUndo.contributions.length, 0);

      // Bank account restored
      const restoredAccount = await BankAccountModel.findById(bankAccount._id);
      assert.strictEqual(restoredAccount.balanceCents, initialBalance);

      // Transaction removed
      const txAfterUndo = await TransactionModel.findById(contrib.transactionId);
      assert.strictEqual(txAfterUndo, null);
    });

    it('rejects bank contribution when bankAccountId is missing or unowned', async () => {
      const goal = await createRecord('goals', userId, {
        name: 'Investment Fund',
        targetAmount: 500000,
        dailyAmount: 1500,
      });

      await assert.rejects(
        async () => {
          await addGoalContribution(userId, String(goal._id), {
            amount: 10000,
            debitAccount: true,
            paymentMethod: 'bank_transfer',
          });
        },
        (err: any) => err.status === 400 && /Bank account is required/i.test(err.message),
      );
    });
  });

  describe('Generic /records/transactions CRUD and system row protection (2.8)', () => {
    it('creates generic transaction via ledger, adjusts account balance, and prevents direct referenceId spoofing', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'Seylan Bank',
        accountNumber: '99881122',
        accountName: 'Generic Tx Test',
        accountType: 'savings',
        openingBalance: 50000, // 5,000,000 cents
      });

      const tx = await createRecord('transactions', userId, {
        type: 'expense',
        amount: 10000, // 10,000 LKR = 1,000,000 cents
        date: '2026-10-12',
        category: 'Office Supplies',
        description: 'Printer ink',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
        referenceId: 'spoofed_system_id',
      });

      // referenceId should be empty (protected from direct spoofing)
      assert.strictEqual(tx.referenceId, '');
      assert.strictEqual(tx.amountCents, 1000000);

      // Account balance must decrease by 10,000
      const accAfter = await BankAccountModel.findById(account._id);
      assert.strictEqual(accAfter?.balanceCents, 4000000);

      // Recompute balance must show zero drift
      const recompute = await recomputeBalance(userId, account._id.toString());
      assert.strictEqual(recompute.driftCents, 0);
      assert.strictEqual(recompute.computedBalanceCents, 4000000);
    });

    it('updates generic transaction with accurate balance adjustment and zero drift', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'HNB Bank',
        accountNumber: '55443322',
        accountName: 'Update Tx Test',
        accountType: 'current',
        openingBalance: 50000, // 5,000,000 cents
      });

      const tx = await createRecord('transactions', userId, {
        type: 'expense',
        amount: 10000,
        date: '2026-10-12',
        category: 'Supplies',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      // Update amount to 15,000
      const updated = await updateRecord('transactions', userId, tx._id.toString(), {
        amount: 15000,
        description: 'Updated ink price',
      });

      assert.strictEqual(updated.amountCents, 1500000);
      const accAfterUpdate = await BankAccountModel.findById(account._id);
      assert.strictEqual(accAfterUpdate?.balanceCents, 3500000);

      const recompute = await recomputeBalance(userId, account._id.toString());
      assert.strictEqual(recompute.driftCents, 0);
      assert.strictEqual(recompute.computedBalanceCents, 3500000);
    });

    it('deletes generic transaction, restores balance, and confirms zero drift', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'BOC Bank',
        accountNumber: '11223344',
        accountName: 'Delete Tx Test',
        accountType: 'savings',
        openingBalance: 50000, // 5,000,000 cents
      });

      const tx = await createRecord('transactions', userId, {
        type: 'expense',
        amount: 8000,
        date: '2026-10-12',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      const accAfterCreate = await BankAccountModel.findById(account._id);
      assert.strictEqual(accAfterCreate?.balanceCents, 4200000);

      await deleteRecord('transactions', userId, tx._id.toString());

      const accAfterDelete = await BankAccountModel.findById(account._id);
      assert.strictEqual(accAfterDelete?.balanceCents, 5000000);

      const recompute = await recomputeBalance(userId, account._id.toString());
      assert.strictEqual(recompute.driftCents, 0);
      assert.strictEqual(recompute.computedBalanceCents, 5000000);
    });

    it('protects system-generated rows (referenceId or transferGroupId present) from direct update and delete', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'Commercial Bank',
        accountNumber: '77665544',
        accountName: 'System Protection Test',
        openingBalance: 100000,
      });

      // Create an expense record (which creates a system transaction with referenceId)
      const expense = await createRecord('expenses', userId, {
        date: '2026-10-12',
        amount: 5000,
        category: 'Food',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      const systemTx = await TransactionModel.findOne({ referenceId: expense._id.toString() });
      assert.ok(systemTx);

      // Attempting to update systemTx directly via /records/transactions must reject with 403
      await assert.rejects(
        async () => {
          await updateRecord('transactions', userId, systemTx._id.toString(), {
            amount: 9999,
          });
        },
        (err: any) => err.status === 403 && /System-generated transactions cannot be updated directly/i.test(err.message),
      );

      // Attempting to delete systemTx directly via /records/transactions must reject with 403
      await assert.rejects(
        async () => {
          await deleteRecord('transactions', userId, systemTx._id.toString());
        },
        (err: any) => err.status === 403 && /System-generated transactions cannot be deleted directly/i.test(err.message),
      );
    });
  });

  describe('Transaction history aggregation with true running balance and indexes (2.9)', () => {
    it('computes true running balance per account taking into account openingBalanceCents and stable sort', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'History Bank',
        accountNumber: '99887766',
        accountName: 'Savings Main',
        openingBalance: 1000, // 100,000 cents
      });

      // 1. Income on 2026-01-01 of Rs 500 (50,000 cents) -> running balance: 150,000 cents
      await createRecord('transactions', userId, {
        date: '2026-01-01',
        type: 'income',
        amount: 500,
        category: 'Salary',
        description: 'Monthly Salary January',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      // 2. Expense on 2026-01-02 of Rs 200 (20,000 cents) -> running balance: 130,000 cents
      await createRecord('transactions', userId, {
        date: '2026-01-02',
        type: 'expense',
        amount: 200,
        category: 'Groceries',
        description: 'Supermarket shopping',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      // 3. Expense on 2026-01-03 of Rs 100 (10,000 cents) -> running balance: 120,000 cents
      await createRecord('transactions', userId, {
        date: '2026-01-03',
        type: 'expense',
        amount: 100,
        category: 'Utilities',
        description: 'Electricity bill',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      const history = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
      });

      assert.strictEqual(history.totalCount, 3);
      assert.strictEqual(history.transactions.length, 3);
      assert.strictEqual(history.summary.totalIncomeCents, 50000);
      assert.strictEqual(history.summary.totalExpenseCents, 30000);
      assert.strictEqual(history.summary.netCents, 20000);
      assert.strictEqual(history.summary.netFlowCents, 20000);
      assert.strictEqual(history.summary.closingBalanceCents, 120000);

      // Verify descending order: 2026-01-03 first, then 01-02, then 01-01
      const [tx3, tx2, tx1] = history.transactions;
      assert.strictEqual(tx3.date, '2026-01-03');
      assert.strictEqual(tx3.runningBalanceCents, 120000);
      assert.strictEqual(tx3.balanceAfterCents, 120000);

      assert.strictEqual(tx2.date, '2026-01-02');
      assert.strictEqual(tx2.runningBalanceCents, 130000);
      assert.strictEqual(tx2.balanceAfterCents, 130000);

      assert.strictEqual(tx1.date, '2026-01-01');
      assert.strictEqual(tx1.runningBalanceCents, 150000);
      assert.strictEqual(tx1.balanceAfterCents, 150000);
    });

    it('supports pagination (skip, limit) and totalCount', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'Pagination Bank',
        accountNumber: '11223344',
        accountName: 'Pagination Account',
        openingBalance: 500,
      });

      for (let i = 1; i <= 5; i++) {
        await createRecord('transactions', userId, {
          date: `2026-02-0${i}`,
          type: 'income',
          amount: 100 * i,
          category: 'Income',
          description: `Income ${i}`,
          paymentMethod: 'bank_transfer',
          bankAccountId: account._id.toString(),
        });
      }

      // Page 1: limit 2, skip 0
      const page1 = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        limit: 2,
        skip: 0,
      });
      assert.strictEqual(page1.totalCount, 5);
      assert.strictEqual(page1.transactions.length, 2);
      assert.strictEqual(page1.transactions[0].date, '2026-02-05');
      assert.strictEqual(page1.transactions[1].date, '2026-02-04');

      // Page 2: limit 2, skip 2
      const page2 = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        limit: 2,
        skip: 2,
      });
      assert.strictEqual(page2.totalCount, 5);
      assert.strictEqual(page2.transactions.length, 2);
      assert.strictEqual(page2.transactions[0].date, '2026-02-03');
      assert.strictEqual(page2.transactions[1].date, '2026-02-02');

      // Page 3: limit 2, skip 4
      const page3 = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        limit: 2,
        skip: 4,
      });
      assert.strictEqual(page3.totalCount, 5);
      assert.strictEqual(page3.transactions.length, 1);
      assert.strictEqual(page3.transactions[0].date, '2026-02-01');
    });

    it('supports filters for type, category, date range, and search keyword', async () => {
      const account = await createRecord('bankAccounts', userId, {
        bankName: 'Filter Bank',
        accountNumber: '55667788',
        accountName: 'Filter Account',
        openingBalance: 0,
      });

      await createRecord('transactions', userId, {
        date: '2026-03-01',
        type: 'income',
        amount: 300,
        category: 'Consulting',
        description: 'Client Project Alpha',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });
      await createRecord('transactions', userId, {
        date: '2026-03-05',
        type: 'expense',
        amount: 150,
        category: 'Software',
        description: 'IDE Subscription License',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });
      await createRecord('transactions', userId, {
        date: '2026-03-10',
        type: 'expense',
        amount: 50,
        category: 'Food',
        description: 'Team Lunch at Pizza Hut',
        paymentMethod: 'bank_transfer',
        bankAccountId: account._id.toString(),
      });

      // Filter by type
      const expenseOnly = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        type: 'expense',
      });
      assert.strictEqual(expenseOnly.totalCount, 2);
      assert.strictEqual(expenseOnly.summary.totalExpenseCents, 20000);
      assert.strictEqual(expenseOnly.summary.totalIncomeCents, 0);

      // Filter by category
      const softwareOnly = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        category: 'Software',
      });
      assert.strictEqual(softwareOnly.totalCount, 1);
      assert.strictEqual(softwareOnly.transactions[0].description, 'IDE Subscription License');

      // Filter by date range
      const march5to8 = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        startDate: '2026-03-05',
        endDate: '2026-03-08',
      });
      assert.strictEqual(march5to8.totalCount, 1);
      assert.strictEqual(march5to8.transactions[0].date, '2026-03-05');

      // Search keyword in description
      const searchPizza = await getTransactionHistory(userId, {
        bankAccountId: account._id.toString(),
        search: 'Pizza',
      });
      assert.strictEqual(searchPizza.totalCount, 1);
      assert.strictEqual(searchPizza.transactions[0].description, 'Team Lunch at Pizza Hut');
    });

    it('rejects invalid or unowned bankAccountId and cardId', async () => {
      const otherUser = new mongoose.Types.ObjectId().toString();
      const foreignAccount = await createRecord('bankAccounts', otherUser, {
        bankName: 'Other Bank',
        accountNumber: '99999999',
        accountName: 'Foreign Account',
        openingBalance: 100,
      });

      // Invalid bankAccountId format
      await assert.rejects(
        async () => {
          await getTransactionHistory(userId, { bankAccountId: 'invalid-id' });
        },
        (err: any) => err.status === 400 && /Invalid bank account id/i.test(err.message),
      );

      // Unowned bankAccountId
      await assert.rejects(
        async () => {
          await getTransactionHistory(userId, { bankAccountId: foreignAccount._id.toString() });
        },
        (err: any) => err.status === 404 && /Bank account not found/i.test(err.message),
      );

      // Invalid cardId format
      await assert.rejects(
        async () => {
          await getTransactionHistory(userId, { cardId: 'invalid-card' });
        },
        (err: any) => err.status === 400 && /Invalid card id/i.test(err.message),
      );

      // Unowned cardId
      const foreignCard = await createRecord('cards', otherUser, {
        cardName: 'Foreign Card',
        cardNumber: '4111111111119999',
        cardType: 'credit',
        expiryMonth: '12',
        expiryYear: '2028',
      });
      await assert.rejects(
        async () => {
          await getTransactionHistory(userId, { cardId: foreignCard._id.toString() });
        },
        (err: any) => err.status === 404 && /Card not found/i.test(err.message),
      );
    });
  });

  describe('bank account deletion safeguards and archive (ledger integrity)', () => {
    const blockedMessage = 'Cannot delete account with a non-zero balance or active transactions. Please transfer remaining funds or archive the account.';

    it('rejects deleting an account with a non-zero balance', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const account = await createRecord('bankAccounts', uid, { bankName: 'BOC', accountNumber: '1001', balance: 500 });

      await assert.rejects(
        () => deleteRecord('bankAccounts', uid, String(account._id)),
        (err: any) => err.status === 400 && err.message === blockedMessage,
      );
      assert.ok(await BankAccountModel.exists({ _id: account._id }));
    });

    it('rejects deleting a zero-balance account that still has transfer history, keeping both legs intact', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const a = await createRecord('bankAccounts', uid, { bankName: 'BOC', accountNumber: 'A-1', balance: 1000 });
      const b = await createRecord('bankAccounts', uid, { bankName: 'NSB', accountNumber: 'B-1', balance: 0 });
      const out = await transferFunds(uid, { fromAccountId: String(a._id), toAccountId: String(b._id), amountCents: 100000, date: '2026-03-01' });
      await transferFunds(uid, { fromAccountId: String(b._id), toAccountId: String(a._id), amountCents: 100000, date: '2026-03-02' });
      assert.strictEqual((await BankAccountModel.findById(b._id)).balanceCents, 0);

      await assert.rejects(
        () => deleteRecord('bankAccounts', uid, String(b._id)),
        (err: any) => err.status === 400 && err.message === blockedMessage,
      );
      assert.strictEqual(await TransactionModel.countDocuments({ transferGroupId: out.transferGroupId }), 2);
      assert.strictEqual((await recomputeBalance(uid, String(a._id))).driftCents, 0);
      assert.strictEqual((await recomputeBalance(uid, String(b._id))).driftCents, 0);
    });

    it('never deletes the built-in cash wallet', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const cash = await ensureCashWallet(uid);
      await assert.rejects(
        () => deleteRecord('bankAccounts', uid, String(cash._id)),
        (err: any) => err.status === 400 && /cash wallet/i.test(err.message),
      );
      await assert.rejects(
        () => updateRecord('bankAccounts', uid, String(cash._id), { isArchived: true }),
        (err: any) => err.status === 400 && /cash wallet/i.test(err.message),
      );
    });

    it('deletes an empty unused account, removing unused linked cards and nulling soft references', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const account = await createRecord('bankAccounts', uid, { bankName: 'DFCC', accountNumber: '2002', balance: 0 });
      const card = await createRecord('cards', uid, { bankAccountId: String(account._id), cardType: 'debit', cardNumber: '4111111111111111', cardHolder: 'Test' });
      const plan = await createRecord('financePayments', uid, { lender: 'Lease Co', amount: 1000, dueDay: 5, monthsRemaining: 3, bankAccountId: String(account._id) });

      await deleteRecord('bankAccounts', uid, String(account._id));

      assert.strictEqual(await BankAccountModel.exists({ _id: account._id }), null);
      assert.strictEqual(await CardModel.exists({ _id: card._id }), null);
      assert.strictEqual((await FinancePaymentModel.findById(plan._id)).bankAccountId, null);
    });

    it('archives an account: history is preserved but new activity is rejected without orphaned records', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const account = await createRecord('bankAccounts', uid, { bankName: 'Sampath', accountNumber: '3003', balance: 0 });
      await createRecord('incomes', uid, { amount: 200, date: '2026-04-01', source: 'Salary', type: 'salary', frequency: 'monthly', paymentMethod: 'bank_transfer', bankAccountId: String(account._id) });

      const archived = await updateRecord('bankAccounts', uid, String(account._id), { isArchived: true });
      assert.strictEqual((archived as any).isArchived, true);
      assert.strictEqual(await TransactionModel.countDocuments({ bankAccountId: account._id }), 1);

      await assert.rejects(
        () => createRecord('expenses', uid, { amount: 50, date: '2026-04-02', category: 'Food', paymentMethod: 'bank_transfer', bankAccountId: String(account._id) }),
        (err: any) => err.status === 400 && /archived/i.test(err.message),
      );
      assert.strictEqual(await ExpenseModel.countDocuments({ userId: uid }), 0);
      assert.strictEqual((await BankAccountModel.findById(account._id)).balanceCents, 20000);
    });
  });

  describe('business branch entry synchronization', () => {
    async function setupBranch(uid: string) {
      const company = await createRecord('companies', uid, { name: 'Acme Holdings' });
      return createRecord('businessBranches', uid, { companyId: String(company._id), name: 'Kandy', monthlyTarget: 0, annualTarget: 0 });
    }
    const entry = (overrides: Record<string, unknown> = {}) => ({ date: '2026-05-01', type: 'revenue', category: 'Sales', amount: 100, note: '', ...overrides });

    it('creates, updates and prunes entries so storage matches the submitted array', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const branch = await setupBranch(uid);
      const branchId = String(branch._id);

      await updateRecord('businessBranches', uid, branchId, { entries: [entry({ id: 'tmp-1' }), entry({ id: 'tmp-2', amount: 250 })] });
      let stored = (await getRecord('businessBranches', uid, branchId) as any).entries;
      assert.strictEqual(stored.length, 2);
      const [first, second] = stored.sort((x: any, y: any) => x.amountCents - y.amountCents);

      // Drop the second entry, edit the first, and add a new one
      await updateRecord('businessBranches', uid, branchId, {
        entries: [entry({ id: String(first._id), amount: 120 }), entry({ id: 'tmp-3', type: 'utility', category: 'Power', amount: 75 })],
      });
      stored = (await getRecord('businessBranches', uid, branchId) as any).entries;
      assert.strictEqual(stored.length, 2);
      assert.strictEqual(await BranchEntryModel.exists({ _id: second._id }), null, 'removed entry must be deleted from MongoDB');
      assert.strictEqual(stored.find((e: any) => String(e._id) === String(first._id)).amountCents, 12000);

      // Updating other fields without `entries` leaves entries untouched
      await updateRecord('businessBranches', uid, branchId, { location: 'Peradeniya Rd' });
      assert.strictEqual(await BranchEntryModel.countDocuments({ branchId }), 2);

      // An empty array clears all entries
      await updateRecord('businessBranches', uid, branchId, { entries: [] });
      assert.strictEqual(await BranchEntryModel.countDocuments({ branchId }), 0);
    });

    it('persists entries submitted when the branch is created', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const company = await createRecord('companies', uid, { name: 'Beta Traders' });
      const branch = await createRecord('businessBranches', uid, {
        companyId: String(company._id), name: 'Galle', monthlyTarget: 0, annualTarget: 0,
        entries: [entry({ id: 'local-1' }), entry({ id: 'local-2', type: 'utility', category: 'Water', amount: 30 })],
      });
      const stored = (await getRecord('businessBranches', uid, String(branch._id)) as any).entries;
      assert.strictEqual(stored.length, 2);
    });

    it("never touches another user's entry when its id is submitted, and validates entries before writing", async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const otherUid = new mongoose.Types.ObjectId().toString();
      const branch = await setupBranch(uid);
      const otherBranch = await setupBranch(otherUid);
      const foreign = await BranchEntryModel.create({ userId: otherUid, branchId: otherBranch._id, date: '2026-05-01', type: 'revenue', category: 'Sales', amountCents: 9900 });

      await updateRecord('businessBranches', uid, String(branch._id), { entries: [entry({ id: String(foreign._id), amount: 1 })] });
      assert.strictEqual((await BranchEntryModel.findById(foreign._id)).amountCents, 9900);
      assert.strictEqual(await BranchEntryModel.countDocuments({ branchId: branch._id, userId: uid }), 1);

      await assert.rejects(
        () => updateRecord('businessBranches', uid, String(branch._id), { entries: [entry({ date: '2026-02-31' })] }),
        (err: any) => err.status === 400 && /date/i.test(err.message),
      );
      await assert.rejects(
        () => updateRecord('businessBranches', uid, String(branch._id), { entries: [entry({ amount: 0 })] }),
        (err: any) => err.status === 400 && /amount/i.test(err.message),
      );
      assert.strictEqual(await BranchEntryModel.countDocuments({ branchId: branch._id, userId: uid }), 1, 'rejected payloads must not prune');
    });
  });

  describe('reducing-balance loan interest allocation', () => {
    // 100,000 @ 12% p.a. over 12 months: EMI 8,884.88, month-1 interest 1,000.00
    async function createLoan(uid: string) {
      return createRecord('loans', uid, {
        lender: 'NDB', amount: 100000, rate: 12, method: 'reducing_balance', tenureMonths: 12, startDate: '2026-01-01',
      });
    }

    it('two half-installments in the same month allocate interest once, matching a single full EMI', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const loan = await createLoan(uid);
      const afterFirst = await recordLoanRepayment(uid, String(loan._id), 4442.44, '2026-02-01');
      assert.strictEqual(afterFirst.repayments[0].interestCents, 100000);
      assert.strictEqual(afterFirst.repayments[0].principalCents, 344244);

      const afterSecond = await recordLoanRepayment(uid, String(loan._id), 4442.44, '2026-02-01');
      assert.strictEqual(afterSecond.repayments[1].interestCents, 0, 'interest for the period was already paid');
      assert.strictEqual(afterSecond.repayments[1].principalCents, 444244);
      assert.strictEqual(afterSecond.balanceCents, 10000000 - 788488);
    });

    it('a partial payment smaller than accrued interest pays interest only; the rest stays due', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const loan = await createLoan(uid);
      const partial = await recordLoanRepayment(uid, String(loan._id), 500, '2026-02-01');
      assert.strictEqual(partial.repayments[0].interestCents, 50000);
      assert.strictEqual(partial.repayments[0].principalCents, 0);
      assert.strictEqual(partial.balanceCents, 10000000);

      const rest = await recordLoanRepayment(uid, String(loan._id), 8384.88, '2026-02-01');
      assert.strictEqual(rest.repayments[1].interestCents, 50000);
      assert.strictEqual(rest.repayments[1].principalCents, 788488);
    });

    it('an extra mid-period payment accrues pro-rated interest on the actual outstanding balance', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const loan = await createLoan(uid);
      await recordLoanRepayment(uid, String(loan._id), 8884.88, '2026-02-01');
      // 14 of 28 days into February on 92,115.12 outstanding: 921.1512 * 14/28 = 460.58
      const extra = await recordLoanRepayment(uid, String(loan._id), 50000, '2026-02-15');
      assert.strictEqual(extra.repayments[1].interestCents, 46058);
      assert.strictEqual(extra.repayments[1].principalCents, 5000000 - 46058);
      assert.strictEqual(extra.balanceCents, 9211512 - (5000000 - 46058));

      const payoff = await calculateLoanPayoff(uid, String(loan._id), '2026-02-15');
      assert.strictEqual(payoff.accruedInterestCents, 0);
      assert.strictEqual(payoff.payoffAmountCents, extra.balanceCents);
    });

    it('charges every elapsed period when a month is skipped', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const loan = await createLoan(uid);
      const late = await recordLoanRepayment(uid, String(loan._id), 8884.88, '2026-03-01');
      assert.strictEqual(late.repayments[0].interestCents, 200000);
      assert.strictEqual(late.repayments[0].principalCents, 688488);
    });

    it('payoff = remaining principal + accrued interest; paying it settles to zero and overpaying is rejected', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const loan = await createLoan(uid);
      await recordLoanRepayment(uid, String(loan._id), 8884.88, '2026-02-01');

      const payoff = await calculateLoanPayoff(uid, String(loan._id), '2026-03-01');
      assert.strictEqual(payoff.remainingBalanceCents, 9211512);
      assert.strictEqual(payoff.accruedInterestCents, 92115);
      assert.strictEqual(payoff.payoffAmountCents, 9303627);

      await assert.rejects(
        () => recordLoanRepayment(uid, String(loan._id), 93036.28, '2026-03-01'),
        (err: any) => err.status === 400 && /exceeds the payoff amount of 93036\.27/.test(err.message),
      );
      const settled = await recordLoanRepayment(uid, String(loan._id), 93036.27, '2026-03-01');
      assert.strictEqual(settled.balanceCents, 0);
      assert.strictEqual(settled.repayments[1].interestCents, 92115);

      // Undo restores outstanding principal from the principal portions only
      const undone = await deleteLoanRepayment(uid, String(loan._id), String(settled.repayments[1]._id));
      assert.strictEqual(undone.balanceCents, 9211512);
      const cash = await BankAccountModel.findOne({ userId: uid, accountType: 'cash' });
      assert.strictEqual(cash.balanceCents, -888488);
      assert.strictEqual((await recomputeBalance(uid, String(cash._id))).driftCents, 0);
    });
  });

  describe('pawn redemption including interest and zero-drift undo', () => {
    it('splits redemption into principal + interest and undo restores both exactly', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const item = await createRecord('pawnedItems', uid, { description: 'Gold Bangle', amountReceived: 50000, interestRate: 12, nextDue: '2026-05-01' });

      await recordPawnPayment(uid, String(item._id), { paymentType: 'part_principal', amount: 20000, date: '2026-05-01' });
      await assert.rejects(
        () => recordPawnPayment(uid, String(item._id), { paymentType: 'part_principal', amount: 40000 }),
        (err: any) => err.status === 400 && /exceeds the outstanding principal/.test(err.message),
      );
      await assert.rejects(
        () => recordPawnPayment(uid, String(item._id), { paymentType: 'redemption', amount: 29000 }),
        (err: any) => err.status === 400 && /must cover the outstanding principal/.test(err.message),
      );

      const redeemed = await recordPawnPayment(uid, String(item._id), { paymentType: 'redemption', amount: 31000, date: '2026-05-20' });
      assert.strictEqual(redeemed.status, 'redeemed');
      assert.strictEqual(redeemed.redemptionDate, '2026-05-20');
      assert.strictEqual(redeemed.principalOutstandingCents, 0);
      assert.strictEqual(redeemed.interestPaidCents, 100000);
      assert.strictEqual(redeemed.payments[1].principalCents, 3000000);
      assert.strictEqual(redeemed.payments[1].interestCents, 100000);

      const undone = await deletePawnPayment(uid, String(item._id), String(redeemed.payments[1]._id));
      assert.strictEqual(undone.principalOutstandingCents, 3000000, 'undo must not add the interest portion back to principal');
      assert.strictEqual(undone.interestPaidCents, 0);
      assert.strictEqual(undone.status, 'active');

      const cash = await BankAccountModel.findOne({ userId: uid, accountType: 'cash' });
      assert.strictEqual(cash.balanceCents, -2000000);
      assert.strictEqual((await recomputeBalance(uid, String(cash._id))).driftCents, 0);
    });
  });
  describe('medical expenses are linked to the financial ledger', () => {
    it('creates a Medical ledger expense, and deleting either side removes both', async () => {
      const uid = new mongoose.Types.ObjectId().toString();
      const medical: any = await createRecord('medicalExpenses', uid, { date: '2026-10-20', type: 'Lab test', amount: 300, note: 'gp visit' });
      assert.ok(medical.expenseId, 'medical record stores its ledger expense id');
      const expense: any = await ExpenseModel.findById(medical.expenseId).lean();
      assert.strictEqual(expense.amountCents, 30000);
      assert.strictEqual(expense.category, 'Medical');
      assert.strictEqual(expense.sourceType, 'medical');
      assert.strictEqual(expense.note, 'Medical: Lab test · gp visit');
      assert.ok(await TransactionModel.exists({ userId: uid, referenceId: String(expense._id) }), 'ledger transaction posted');

      await deleteRecord('medicalExpenses', uid, String(medical._id));
      assert.strictEqual(await ExpenseModel.countDocuments({ userId: uid }), 0);

      const second: any = await createRecord('medicalExpenses', uid, { date: '2026-10-21', type: 'Medicine', amount: 1200, note: '' });
      await deleteRecord('expenses', uid, String(second.expenseId));
      assert.strictEqual(await MedicalExpenseModel.countDocuments({ userId: uid }), 0);
    });
  });
});
