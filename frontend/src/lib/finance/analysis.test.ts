import { describe, expect, it } from 'vitest';
import {
  calcAnalysis,
  calcFinancePaymentsCents,
  calcLoanInterestCents,
  calcMonthlyExpensesCents,
  calcMonthlyIncomeCents,
  calcPawnInterestCents,
  centsToRupees,
  daysInMonth,
  formatRs,
  rupeesToCents,
} from './analysis';

describe('finance analysis', () => {
  describe('currency and date helpers', () => {
    it('converts cents to rupees and rupees to cents accurately', () => {
      expect(centsToRupees(150000)).toBe(1500);
      expect(centsToRupees(99)).toBe(1);
      expect(rupeesToCents(1500)).toBe(150000);
      expect(rupeesToCents(12.50)).toBe(1250);
    });

    it('formats cents into Sri Lankan Rupees format string', () => {
      expect(formatRs(150000)).toBe('Rs. 1,500');
      expect(formatRs(0)).toBe('Rs. 0');
      expect(formatRs(25000000)).toBe('Rs. 250,000');
    });

    it('calculates days in month correctly including leap years', () => {
      expect(daysInMonth('2026-09')).toBe(30);
      expect(daysInMonth('2026-10')).toBe(31);
      expect(daysInMonth('2024-02')).toBe(29); // 2024 is a leap year
      expect(daysInMonth('2026-02')).toBe(28); // 2026 is non-leap
    });
  });

  describe('income and expenses calculations', () => {
    it('handles weekly and daily income accurately', () => {
      const month = '2026-09';
      const income = [
        { frequency: 'weekly', amountCents: 8_000, date: '2026-09-01' },
        { frequency: 'daily', amountCents: 500, date: '2026-09-01' },
        { frequency: 'one-time', amountCents: 3_000, date: '2026-09-15' },
      ];

      expect(calcMonthlyIncomeCents(income, month)).toBe(Math.round(8_000 * 30 / 7) + 500 * 30 + 3_000);
    });

    it('filters monthly expenses strictly by target month', () => {
      const expenses = [
        { date: '2026-09-05', amountCents: 15_000, category: 'Food' },
        { date: '2026-09-20', amountCents: 25_000, category: 'Transport' },
        { date: '2026-10-01', amountCents: 50_000, category: 'Rent' }, // next month
      ];

      expect(calcMonthlyExpensesCents(expenses, '2026-09')).toBe(40_000);
      expect(calcMonthlyExpensesCents(expenses, '2026-10')).toBe(50_000);
    });

    it('calculates finance payments sum', () => {
      const payments = [{ amountCents: 20_000 }, { amountCents: 35_000 }];
      expect(calcFinancePaymentsCents(payments)).toBe(55_000);
    });
  });

  describe('loans and pawn interest', () => {
    it('calculates simple interest for loans', () => {
      const loans = [
        { balanceCents: 100_000_00, ratePercent: 12, method: 'simple', startDate: '2026-01-01', dueDate: '2027-01-01' }
      ];
      expect(calcLoanInterestCents(loans, '2026-09')).toBe(12_000_00);
    });

    it('calculates pawn interest when due in the target month', () => {
      const pawned = [
        { amountReceivedCents: 50_000_00, interestRatePercent: 3, nextDue: '2026-09-15' },
        { amountReceivedCents: 80_000_00, interestRatePercent: 3, nextDue: '2026-10-15' },
      ];
      expect(calcPawnInterestCents(pawned, '2026-09')).toBe(1_500_00);
    });
  });

  describe('full calcAnalysis integration', () => {
    it('matches the worked example shortfall and goal warning', () => {
      const month = '2026-09';
      const result = calcAnalysis({
        income: [{ frequency: 'monthly', amountCents: 5_000_000, date: '2026-09-01' }],
        expenses: Array.from({ length: 30 }, (_, index) => ({
          date: `2026-09-${String(index + 1).padStart(2, '0')}`,
          amountCents: 100_000,
          category: 'Food',
        })),
        financePayments: [{ amountCents: 2_500_000 }],
        loans: [],
        pawnedItems: [],
        savingsGoals: [{ monthlyTargetCents: 3_000_000 }],
        personalSpendingBudgetCents: 0,
        month,
      });

      expect(result.totalIncome).toBe(5_000_000);
      expect(result.livingExpenses).toBe(3_000_000);
      expect(result.financePaymentsCents).toBe(2_500_000);
      expect(result.totalOutflow).toBe(5_500_000);
      expect(result.shortfall).toBe(500_000);
      expect(result.achievableSavingsGoals).toHaveLength(0);
    });

    it('rounds money values without floating point drift', () => {
      const month = '2026-09';
      const result = calcAnalysis({
        income: [{ frequency: 'monthly', amountCents: 1_000_000, date: '2026-09-01' }],
        expenses: [{ date: '2026-09-10', amountCents: 333_33, category: 'Food' }],
        financePayments: [],
        loans: [],
        pawnedItems: [],
        savingsGoals: [],
        personalSpendingBudgetCents: 0,
        month,
      });

      expect(result.netPosition).toBe(966_667);
    });
  });
});

