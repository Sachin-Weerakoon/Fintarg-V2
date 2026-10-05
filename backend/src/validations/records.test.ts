import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordSchemas } from './records';

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

  describe('savings goals schema', () => {
    it('validates savings goal', () => {
      const input = {
        name: 'Emergency Fund',
        dailyAmount: 1000,
        endDate: '2026-12-31',
      };
      const parsed = recordSchemas.goals.safeParse(input);
      assert.strictEqual(parsed.success, true);
    });
  });
});
