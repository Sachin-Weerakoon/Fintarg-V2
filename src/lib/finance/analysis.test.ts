import { describe, expect, it } from 'vitest';
import { calcAnalysis, calcMonthlyIncomeCents } from './analysis';

describe('finance analysis', () => {
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

  it('handles weekly and daily income accurately', () => {
    const month = '2026-09';
    const income = [
      { frequency: 'weekly', amountCents: 8_000, date: '2026-09-01' },
      { frequency: 'daily', amountCents: 500, date: '2026-09-01' },
      { frequency: 'one-time', amountCents: 3_000, date: '2026-09-15' },
    ];

    expect(calcMonthlyIncomeCents(income, month)).toBe(Math.round(8_000 * 30 / 7) + 500 * 30 + 3_000);
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
