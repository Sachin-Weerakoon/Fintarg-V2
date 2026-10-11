import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordSchemas, isoMonthSchema } from './records';

describe('Financial Record Validation Schemas', () => {
  describe('incomes schema', () => {
    it('accepts valid income and coerces number string', () => {
      const input = {
        source: 'Software Consulting',
        type: 'business',
        amount: '150000',
        frequency: 'monthly',
        date: '2026-10-01',
      };
      const parsed = recordSchemas.incomes.safeParse(input);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.amount, 150000);
      }
    });

    it('rejects negative or zero amount', () => {
      const input = {
        source: 'Consulting',
        type: 'business',
        amount: -500,
        frequency: 'monthly',
        date: '2026-10-01',
      };
      assert.strictEqual(recordSchemas.incomes.safeParse(input).success, false);
      assert.strictEqual(recordSchemas.incomes.safeParse({ ...input, amount: 0 }).success, false);
    });
  });

  describe('expenses schema', () => {
    it('validates expense with optional defaults', () => {
      const input = {
        date: '2026-10-02',
        amount: 3500,
        category: 'Groceries',
      };
      const parsed = recordSchemas.expenses.safeParse(input);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.note, '');
        assert.strictEqual(parsed.data.recurring, false);
      }
    });
  });

  describe('loans schema', () => {
    it('validates simple and compound interest loans', () => {
      const input = {
        lender: 'Commercial Bank',
        amount: 1000000,
        rate: 14.5,
        method: 'simple',
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
      };
      assert.strictEqual(recordSchemas.loans.safeParse(input).success, true);
      assert.strictEqual(recordSchemas.loans.safeParse({ ...input, method: 'invalid' }).success, false);
    });
  });

  describe('paymentMethod enum alignment (1.6)', () => {
    it('accepts standing_order and online across expenses, incomes, and transactions', () => {
      const expense = {
        date: '2026-10-02',
        amount: 2500,
        category: 'Utilities',
        paymentMethod: 'standing_order',
      };
      assert.strictEqual(recordSchemas.expenses.safeParse(expense).success, true);

      const income = {
        source: 'Online Sales',
        type: 'business',
        amount: 50000,
        frequency: 'one-time',
        date: '2026-10-02',
        paymentMethod: 'online',
      };
      assert.strictEqual(recordSchemas.incomes.safeParse(income).success, true);

      const tx = {
        type: 'expense',
        amount: 1200,
        date: '2026-10-02',
        paymentMethod: 'standing_order',
      };
      assert.strictEqual(recordSchemas.transactions.safeParse(tx).success, true);
    });
  });

  describe('strict ISO date and month validation (1.8)', () => {
    it('accepts valid calendar dates', () => {
      const expense = {
        date: '2026-10-11',
        amount: 2500,
        category: 'Utilities',
      };
      assert.strictEqual(recordSchemas.expenses.safeParse(expense).success, true);
    });

    it('accepts leap year Feb 29 (2024-02-29)', () => {
      const expense = {
        date: '2024-02-29',
        amount: 2500,
        category: 'Utilities',
      };
      assert.strictEqual(recordSchemas.expenses.safeParse(expense).success, true);
    });

    it('rejects invalid calendar dates like 2026-02-31 and non-leap 2025-02-29', () => {
      const exp1 = { date: '2026-02-31', amount: 100, category: 'Food' };
      assert.strictEqual(recordSchemas.expenses.safeParse(exp1).success, false);

      const exp2 = { date: '2025-02-29', amount: 100, category: 'Food' };
      assert.strictEqual(recordSchemas.expenses.safeParse(exp2).success, false);
    });

    it('rejects non-ISO format dates like DD/MM/YYYY or arbitrary strings', () => {
      assert.strictEqual(recordSchemas.expenses.safeParse({ date: '11/10/2026', amount: 100, category: 'Food' }).success, false);
      assert.strictEqual(recordSchemas.expenses.safeParse({ date: 'not-a-date', amount: 100, category: 'Food' }).success, false);
      assert.strictEqual(recordSchemas.expenses.safeParse({ date: '2026-13-01', amount: 100, category: 'Food' }).success, false);
      assert.strictEqual(recordSchemas.expenses.safeParse({ date: '2026-00-10', amount: 100, category: 'Food' }).success, false);
    });

    it('rejects invalid dates in optional fields when provided', () => {
      const loan = {
        lender: 'Bank',
        amount: 100000,
        rate: 10,
        startDate: '2026-01-01',
        dueDate: 'invalid-date',
      };
      assert.strictEqual(recordSchemas.loans.safeParse(loan).success, false);
    });

    it('accepts empty string or valid date in optional fields', () => {
      const loan = {
        lender: 'Bank',
        amount: 100000,
        rate: 10,
        startDate: '2026-01-01',
        dueDate: '',
      };
      assert.strictEqual(recordSchemas.loans.safeParse(loan).success, true);
      assert.strictEqual(recordSchemas.loans.safeParse({ ...loan, dueDate: '2027-01-01' }).success, true);
    });

    it('validates YYYY-MM months strictly', () => {
      assert.strictEqual(isoMonthSchema.safeParse('2026-10').success, true);
      assert.strictEqual(isoMonthSchema.safeParse('2026-01').success, true);
      assert.strictEqual(isoMonthSchema.safeParse('2026-12').success, true);
      assert.strictEqual(isoMonthSchema.safeParse('2026-13').success, false);
      assert.strictEqual(isoMonthSchema.safeParse('2026-00').success, false);
      assert.strictEqual(isoMonthSchema.safeParse('2026').success, false);
      assert.strictEqual(isoMonthSchema.safeParse('not-a-month').success, false);
    });
  });
});

