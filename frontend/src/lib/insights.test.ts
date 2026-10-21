import { describe, expect, it } from 'vitest';
import type { AppState } from '@/types';
import {
  addDays,
  addMonths,
  buildInsights,
  buildPlan,
  buildSeries,
  cashflowSplit,
  categoryChanges,
  daysBetween,
  daysInMonth,
  forecastMonths,
  forecastSeries,
  goalProjections,
  healthScore,
  linearFit,
  monthPace,
  monthPoint,
  normalCdf,
  upcomingObligations,
} from './insights';

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    currentPage: 'dashboard',
    selectedMonth: '2026-09',
    profile: {} as AppState['profile'],
    income: [{ id: 'i1', source: 'Salary', type: 'salary', amount: 100000, frequency: 'monthly', date: '2026-07-01' }],
    expenses: [],
    financePayments: [],
    loans: [],
    bankAccounts: [],
    cards: [],
    transactions: [],
    pawnedItems: [],
    savingsGoals: [],
    personalSpendingBudget: 0,
    letters: [],
    agreements: [],
    companies: [],
    businessBranches: [],
    employmentProfiles: [],
    ownerDraws: [],
    medicalExpenses: [],
    documents: [],
    reminders: [],
    setupComplete: true,
    ...overrides,
  };
}

const exp = (id: string, date: string, amount: number, category = 'Food', recurring = false) => ({ id, date, amount, category, note: '', recurring });

describe('date helpers', () => {
  it('adds and subtracts months across year boundaries', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-09', 0)).toBe('2026-09');
  });
  it('computes days in month incl. leap years', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-09')).toBe(30);
  });
  it('computes day differences and offsets', () => {
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
    expect(daysBetween('2026-10-05', '2026-09-28')).toBe(-7);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('statistics', () => {
  it('fits a perfect line', () => {
    const fit = linearFit([10, 20, 30, 40]);
    expect(fit.slope).toBeCloseTo(10);
    expect(fit.intercept).toBeCloseTo(10);
    expect(fit.r2).toBeCloseTo(1);
  });
  it('normal CDF is symmetric and bounded', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });
  it('forecast stays non-negative and widens with horizon', () => {
    const fc = forecastSeries([100, 90, 80, 70, 60, 50], 4);
    expect(fc).toHaveLength(4);
    fc.forEach(p => {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.low).toBeLessThanOrEqual(p.value);
      expect(p.high).toBeGreaterThanOrEqual(p.value);
    });
    expect(fc[3].high - fc[3].low).toBeGreaterThan(fc[0].high - fc[0].low);
  });
  it('flat history forecasts flat', () => {
    const fc = forecastSeries([500, 500, 500], 2);
    expect(fc[0].value).toBeCloseTo(500, 0);
  });
  it('handles empty history', () => {
    expect(forecastSeries([], 2)).toEqual([{ value: 0, low: 0, high: 0 }, { value: 0, low: 0, high: 0 }]);
  });
});

describe('month aggregates', () => {
  it('mirrors the app cash-flow formula', () => {
    const state = baseState({
      expenses: [exp('e1', '2026-09-03', 30000)],
      financePayments: [{ id: 'f1', lender: 'Bank', amount: 10000, dueDay: 10, monthsRemaining: 6 }],
      savingsGoals: [{ id: 'g1', name: 'EF', dailyAmount: 0, monthlyTarget: 5000, endDate: '2027-01-01', savedAmount: 0, contributions: [] }],
    });
    const p = monthPoint(state, '2026-09');
    expect(p.income).toBe(100000);
    expect(p.outflow).toBe(45000);
    expect(p.net).toBe(55000);
    expect(p.savingsRate).toBeCloseTo(0.55);
  });

  it('does not fabricate history before the first record', () => {
    const state = baseState({ expenses: [exp('e1', '2026-08-03', 1000)], income: [{ id: 'i', source: 's', type: 'salary', amount: 1, frequency: 'monthly', date: '2026-08-01' }] });
    const series = buildSeries(state, '2026-09', 6);
    expect(series.map(s => s.month)).toEqual(['2026-08', '2026-09']);
  });

  it('forecasts the next months and rolls off finishing instalments', () => {
    const state = baseState({
      expenses: [exp('a', '2026-07-05', 20000), exp('b', '2026-08-05', 20000), exp('c', '2026-09-05', 20000)],
      financePayments: [{ id: 'f1', lender: 'Bank', amount: 10000, dueDay: 10, monthsRemaining: 1 }],
    });
    const series = buildSeries(state, '2026-09', 6);
    const fc = forecastMonths(state, series, 3);
    expect(fc.map(f => f.month)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(fc[0].financePayments).toBe(10000);
    expect(fc[1].financePayments).toBe(0);
    expect(fc[0].shortfallRisk).toBeGreaterThanOrEqual(0);
    expect(fc[0].shortfallRisk).toBeLessThanOrEqual(1);
    expect(fc[0].net).toBeGreaterThan(0);
  });
});

describe('spending analytics', () => {
  it('flags a category spike versus the 3 month average', () => {
    const state = baseState({
      expenses: [
        exp('a', '2026-06-10', 3000, 'Food'),
        exp('b', '2026-07-10', 3000, 'Food'),
        exp('c', '2026-08-10', 3000, 'Food'),
        exp('d', '2026-09-10', 6000, 'Food'),
      ],
    });
    const row = categoryChanges(state, '2026-09').find(c => c.category === 'Food');
    expect(row?.flag).toBe('spike');
    expect(Math.round(row?.changePct ?? 0)).toBe(100);
  });

  it('projects month-end from current pace', () => {
    const state = baseState({ expenses: [exp('a', '2026-09-05', 10000, 'Food'), exp('r', '2026-09-01', 12000, 'Rent', true)] });
    const pace = monthPace(state, '2026-09', '2026-09-10');
    expect(pace.isCurrent).toBe(true);
    expect(pace.elapsed).toBe(10);
    // recurring 12k + variable 10k/10d*30d = 42k
    expect(Math.round(pace.projectedLiving)).toBe(42000);
  });
});

describe('goals', () => {
  it('classifies goal status from recent pace', () => {
    const today = '2026-09-30';
    const contributions = Array.from({ length: 10 }, (_, i) => ({ date: addDays(today, -i), amount: 1000 }));
    const state = baseState({
      savingsGoals: [
        { id: 'ok', name: 'On', dailyAmount: 0, monthlyTarget: 0, endDate: '2027-03-31', targetAmount: 30000, savedAmount: 10000, contributions },
        { id: 'st', name: 'Stalled', dailyAmount: 0, monthlyTarget: 0, endDate: '2027-03-31', targetAmount: 30000, savedAmount: 1000, contributions: [] },
        { id: 'done', name: 'Done', dailyAmount: 0, monthlyTarget: 0, endDate: '2027-03-31', targetAmount: 1000, savedAmount: 1000, contributions: [] },
        { id: 'late', name: 'Late', dailyAmount: 0, monthlyTarget: 0, endDate: '2026-01-01', targetAmount: 9999, savedAmount: 10, contributions: [] },
      ],
    });
    const byId = Object.fromEntries(goalProjections(state, today).map(g => [g.id, g]));
    expect(byId.ok.status).toBe('on-track');
    expect(byId.st.status).toBe('stalled');
    expect(byId.done.status).toBe('achieved');
    expect(byId.late.status).toBe('overdue');
  });
});

describe('obligations & insights', () => {
  it('surfaces due and overdue obligations', () => {
    const state = baseState({
      financePayments: [{ id: 'f1', lender: 'People’s Bank', amount: 25000, dueDay: 10, monthsRemaining: 5, nextDueDate: '2026-09-12' }],
      pawnedItems: [{ id: 'p1', description: 'Gold chain', amountReceived: 85000, interestRate: 2, nextDue: '2026-09-05', redemptionDate: '2027-01-05' }],
    });
    const items = upcomingObligations(state, '2026-09-10', 14);
    expect(items.find(i => i.kind === 'finance')?.daysUntil).toBe(2);
    expect(items.find(i => i.kind === 'pawn')?.daysUntil).toBe(-5);
  });

  it('raises a critical alert when the month is in deficit', () => {
    const state = baseState({ expenses: [exp('a', '2026-09-03', 140000, 'Personal')] });
    const insights = buildInsights(state, '2026-09-20');
    expect(insights[0].severity).toBe('critical');
    expect(insights.some(i => i.id === 'cf-deficit-2026-09')).toBe(true);
  });

  it('nudges new users to add data', () => {
    const insights = buildInsights(baseState({ income: [], expenses: [] }), '2026-09-20');
    expect(insights).toHaveLength(1);
    expect(insights[0].category).toBe('data');
  });

  it('has stable ids so dismissals persist', () => {
    const state = baseState({ expenses: [exp('a', '2026-09-03', 140000, 'Personal')] });
    const a = buildInsights(state, '2026-09-20').map(i => i.id);
    const b = buildInsights(state, '2026-09-20').map(i => i.id);
    expect(a).toEqual(b);
  });
});

describe('health score & plan', () => {
  it('scores a strong saver higher than an overspender', () => {
    const strong = baseState({ expenses: [exp('a', '2026-09-03', 40000)] });
    const weak = baseState({ expenses: [exp('a', '2026-09-03', 130000)] });
    expect(healthScore(strong, '2026-09', '2026-09-20').score).toBeGreaterThan(healthScore(weak, '2026-09', '2026-09-20').score);
  });
  it('score is always within 0..100', () => {
    const s = healthScore(baseState({ expenses: [exp('a', '2026-09-03', 9_999_999)] }), '2026-09', '2026-09-20');
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
  it('first plan step addresses a deficit', () => {
    const plan = buildPlan(baseState({ expenses: [exp('a', '2026-09-03', 140000, 'Personal')] }), '2026-09', '2026-09-20');
    expect(plan[0].id).toBe('cover-gap');
  });
});

describe('cashflowSplit (dashboard health bar)', () => {
  it('no data: empty track, no burn rate', () => {
    expect(cashflowSplit(0, 0)).toEqual({ spentPct: 0, remainingPct: 0, burnRate: null, remaining: 0, hasData: false });
  });
  it('expenses but no income: fully red, no burn rate, nothing remaining', () => {
    expect(cashflowSplit(0, 5000)).toEqual({ spentPct: 100, remainingPct: 0, burnRate: null, remaining: 0, hasData: true });
  });
  it('income only: fully green', () => {
    expect(cashflowSplit(100000, 0)).toMatchObject({ spentPct: 0, remainingPct: 100, burnRate: 0, remaining: 100000 });
  });
  it('normal month: red = expenses / income, green = rest', () => {
    expect(cashflowSplit(100000, 25000)).toMatchObject({ spentPct: 25, remainingPct: 75, burnRate: 25, remaining: 75000 });
  });
  it('overspent: red capped at 100, burn rate shows the real %', () => {
    expect(cashflowSplit(100000, 150000)).toMatchObject({ spentPct: 100, remainingPct: 0, burnRate: 150, remaining: 0 });
  });
  it('segments never overfill the track', () => {
    for (const [i, e] of [[0, 0], [0, 1], [1, 0], [3, 1], [1, 3], [7, 7]]) {
      const s = cashflowSplit(i, e);
      expect(s.spentPct + s.remainingPct).toBeLessThanOrEqual(100);
    }
  });
});
