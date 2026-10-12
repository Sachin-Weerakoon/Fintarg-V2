import { describe, it, expect } from 'vitest';
import {
  getDaysInMonth,
  getDaysLeftInMonth,
  calcMonthlyIncome,
  calcRecurringIncome,
  calcOneTimeIncome,
  calcMonthlyExpenses,
  calcPersonalSpent,
  calcFinancePayments,
  calcLoanInterest,
  calcExpensesByCategory,
  calcExpensesByDay,
  calcGoalMonthlyTarget,
  calcTotalSavingsTarget,
  validateGoalPace,
  calcDailyExpenseBudget,
  calcDailyPersonalAllowance,
  calcAnalysis,
} from './money';
import type { AppState, IncomeEntry, ExpenseEntry, FinancePayment, Loan, SavingsGoal, EmploymentProfile } from '@/types';

describe('Shared Money & Period Module (lib/money.ts)', () => {
  describe('Calendar & Month Math', () => {
    it('accurately calculates days in month across 28, 29, 30, and 31-day months', () => {
      // 28-day Feb non-leap
      expect(getDaysInMonth('2026-02')).toBe(28);
      expect(getDaysInMonth('2025-02')).toBe(28);
      // 29-day Feb leap
      expect(getDaysInMonth('2024-02')).toBe(29);
      expect(getDaysInMonth('2028-02')).toBe(29);
      // 30-day months
      expect(getDaysInMonth('2026-04')).toBe(30);
      expect(getDaysInMonth('2026-06')).toBe(30);
      expect(getDaysInMonth('2026-09')).toBe(30);
      expect(getDaysInMonth('2026-11')).toBe(30);
      // 31-day months
      expect(getDaysInMonth('2026-01')).toBe(31);
      expect(getDaysInMonth('2026-03')).toBe(31);
      expect(getDaysInMonth('2026-05')).toBe(31);
      expect(getDaysInMonth('2026-07')).toBe(31);
      expect(getDaysInMonth('2026-08')).toBe(31);
      expect(getDaysInMonth('2026-10')).toBe(31);
      expect(getDaysInMonth('2026-12')).toBe(31);
    });

    it('handles Date instances and invalid strings gracefully', () => {
      expect(getDaysInMonth(new Date(2024, 1, 15))).toBe(29);
      expect(getDaysInMonth('invalid')).toBe(30);
    });

    it('accurately calculates getDaysLeftInMonth for past, future, and current months', () => {
      const fixedToday = new Date(2026, 8, 15); // Sept 15, 2026 (September has 30 days)

      // Past month -> 0 days left
      expect(getDaysLeftInMonth('2026-08', fixedToday)).toBe(0);
      expect(getDaysLeftInMonth('2025-12', fixedToday)).toBe(0);

      // Future month -> full month length
      expect(getDaysLeftInMonth('2026-10', fixedToday)).toBe(31);
      expect(getDaysLeftInMonth('2026-11', fixedToday)).toBe(30);

      // Current month -> remaining days from today (15th through 30th inclusive = 16 days)
      expect(getDaysLeftInMonth('2026-09', fixedToday)).toBe(16);

      // Last day of month -> 1 day left
      const lastDaySept = new Date(2026, 8, 30);
      expect(getDaysLeftInMonth('2026-09', lastDaySept)).toBe(1);
    });
  });

  describe('calcMonthlyIncome (4.2)', () => {
    it('calculates weekly income as amount * 52 / 12 (not 4)', () => {
      const income: IncomeEntry[] = [
        { id: '1', source: 'Part-time', type: 'other', amount: 12000, frequency: 'weekly', date: '2026-09-01' },
      ];
      // 12,000 * 52 / 12 = 52,000
      expect(calcMonthlyIncome(income, '2026-09')).toBe(52000);
    });

    it('calculates daily income using exact days in month across 28, 29, 30, and 31-day months (not 30)', () => {
      const dailyIncome: IncomeEntry[] = [
        { id: 'd1', source: 'Daily gig', type: 'other', amount: 1000, frequency: 'daily', date: '2026-01-01' },
      ];
      // Feb 2026 (28 days) -> 28,000
      expect(calcMonthlyIncome(dailyIncome, '2026-02')).toBe(28000);
      // Feb 2024 (29 days leap) -> 29,000
      expect(calcMonthlyIncome(dailyIncome, '2024-02')).toBe(29000);
      // Apr 2026 (30 days) -> 30,000
      expect(calcMonthlyIncome(dailyIncome, '2026-04')).toBe(30000);
      // Jan 2026 (31 days) -> 31,000
      expect(calcMonthlyIncome(dailyIncome, '2026-01')).toBe(31000);
    });

    it('scopes one-time income strictly to its matching month', () => {
      const income: IncomeEntry[] = [
        { id: 'o1', source: 'Bonus', type: 'other', amount: 25000, frequency: 'one-time', date: '2026-09-18' },
        { id: 'o2', source: 'Gift', type: 'other', amount: 10000, frequency: 'one-time', date: '2026-10-05' },
      ];
      expect(calcMonthlyIncome(income, '2026-09')).toBe(25000);
      expect(calcMonthlyIncome(income, '2026-10')).toBe(10000);
      expect(calcMonthlyIncome(income, '2026-08')).toBe(0);
    });

    it('applies salary net of deductions when provided via entry or employment profile', () => {
      // 1. Direct deduction on income entry
      const incomeWithDirectDeduction: IncomeEntry[] = [
        {
          id: 's1',
          source: 'Primary Job',
          type: 'salary',
          amount: 100000,
          frequency: 'monthly',
          date: '2026-09-01',
          deductions: 8000,
        } as any,
      ];
      expect(calcMonthlyIncome(incomeWithDirectDeduction, '2026-09')).toBe(92000);

      // 2. Matching employment profile
      const rawSalaryIncome: IncomeEntry[] = [
        { id: 's2', source: 'Serendib Holdings', type: 'salary', amount: 85000, frequency: 'monthly', date: '2026-09-01' },
      ];
      const employmentProfiles: EmploymentProfile[] = [
        {
          id: 'job1',
          employer: 'Serendib Holdings',
          role: 'Operations Executive',
          monthlyGross: 85000,
          payday: 25,
          monthlyDeductions: 6800,
          monthlySavingsTarget: 15000,
          careerGoal: 'Growth',
        },
      ];
      expect(calcMonthlyIncome(rawSalaryIncome, '2026-09', employmentProfiles)).toBe(78200);
    });

    it('table-driven verification of calcMonthlyIncome combinations', () => {
      const testCases = [
        {
          desc: 'Monthly fixed salary + daily + weekly in 30-day month',
          income: [
            { id: '1', source: 'Job', type: 'salary', amount: 60000, frequency: 'monthly', date: '2026-09-01' },
            { id: '2', source: 'Store', type: 'other', amount: 500, frequency: 'daily', date: '2026-09-01' },
            { id: '3', source: 'Tutoring', type: 'other', amount: 3000, frequency: 'weekly', date: '2026-09-01' },
          ] as IncomeEntry[],
          month: '2026-09', // 30 days
          expected: 60000 + 500 * 30 + (3000 * 52) / 12, // 60,000 + 15,000 + 13,000 = 88,000
        },
        {
          desc: 'Daily income in 28-day February',
          income: [
            { id: '1', source: 'Consulting', type: 'other', amount: 2000, frequency: 'daily', date: '2026-02-01' },
          ] as IncomeEntry[],
          month: '2026-02',
          expected: 2000 * 28, // 56,000
        },
      ];

      for (const tc of testCases) {
        expect(calcMonthlyIncome(tc.income, tc.month)).toBeCloseTo(tc.expected, 2);
      }
    });
  });

  describe('calcMonthlyExpenses (4.7)', () => {
    it('aggregates expenses for the month and strictly excludes transfers', () => {
      const expenses: ExpenseEntry[] = [
        { id: 'e1', date: '2026-09-10', amount: 5000, category: 'Food', note: '', recurring: false },
        { id: 'e2', date: '2026-09-12', amount: 15000, category: 'Transfer', note: 'To savings', recurring: false },
        { id: 'e3', date: '2026-09-15', amount: 2500, category: 'transport', note: '', recurring: false },
        { id: 'e4', date: '2026-08-20', amount: 4000, category: 'Food', note: '', recurring: false },
      ];
      // Excludes Transfer (15,000) and August (4,000) -> 5,000 + 2,500 = 7,500
      expect(calcMonthlyExpenses(expenses, '2026-09')).toBe(7500);
      expect(calcExpensesByCategory(expenses, '2026-09')).toEqual({
        Food: 5000,
        transport: 2500,
      });
    });
  });

  describe('calcLoanInterest (4.4)', () => {
    it('computes amortisation-based monthly interest (not annual overstated 12x)', () => {
      const loans: Loan[] = [
        {
          id: 'l1',
          lender: 'Commercial Bank',
          principal: 100000,
          rate: 12, // 12% per annum
          method: 'reducing_balance',
          interestBasis: 'annual',
          startDate: '2026-01-01',
          dueDate: '',
          balance: 100000,
        },
      ];
      // 100,000 * (12/100) / 12 = 1,000 monthly interest (previously was 12,000!)
      expect(calcLoanInterest(loans)).toBe(1000);
    });

    it('honours monthly interestBasis correctly', () => {
      const loans: Loan[] = [
        {
          id: 'l2',
          lender: 'Microfinance',
          principal: 50000,
          rate: 1.5, // 1.5% per month
          method: 'reducing_balance',
          interestBasis: 'monthly',
          startDate: '2026-01-01',
          dueDate: '',
          balance: 50000,
        },
      ];
      // 50,000 * (1.5/100) = 750
      expect(calcLoanInterest(loans)).toBe(750);
    });

    it('stops double-counting a loan when an active financePayment exists for that lender or loanId', () => {
      const loans: Loan[] = [
        {
          id: 'l1',
          lender: "People's Bank",
          principal: 100000,
          rate: 12,
          method: 'reducing_balance',
          startDate: '2026-01-01',
          dueDate: '',
          balance: 100000,
        },
        {
          id: 'l2',
          lender: 'Seylan Bank',
          principal: 50000,
          rate: 12,
          method: 'reducing_balance',
          startDate: '2026-01-01',
          dueDate: '',
          balance: 50000,
        },
      ];
      const financePayments: FinancePayment[] = [
        {
          id: 'fp1',
          lender: "People's Bank",
          amount: 25000,
          dueDay: 10,
          monthsRemaining: 12,
          status: 'active',
        },
      ];
      // People's Bank interest (1,000) is excluded because fp1 already covers that obligation
      // Only Seylan Bank (50,000 * 0.01 = 500) is counted
      expect(calcLoanInterest(loans, financePayments)).toBe(500);
    });
  });

  describe('Goals & Target Date Validation (4.3)', () => {
    it('derives monthlyTarget from dailyAmount * daysInMonth of the relevant month', () => {
      const goal: SavingsGoal = {
        id: 'g1',
        name: 'Emergency Fund',
        dailyAmount: 1000,
        monthlyTarget: 30000,
        savedAmount: 5000,
      };
      // 28-day Feb -> 28,000
      expect(calcGoalMonthlyTarget(goal, '2026-02')).toBe(28000);
      // 29-day leap Feb -> 29,000
      expect(calcGoalMonthlyTarget(goal, '2024-02')).toBe(29000);
      // 30-day Sept -> 30,000
      expect(calcGoalMonthlyTarget(goal, '2026-09')).toBe(30000);
      // 31-day Jan -> 31,000
      expect(calcGoalMonthlyTarget(goal, '2026-01')).toBe(31000);
    });

    it('validates goal pace: on-track when daily * daysLeft >= remaining, warns when falling short', () => {
      const fixedToday = new Date('2026-09-01T00:00:00Z');

      // Goal 1: Target 30,000 in 30 days (by 2026-10-01), daily is 1,000 -> on track
      const goalOnTrack: SavingsGoal = {
        id: 'g1',
        name: 'On track',
        dailyAmount: 1000,
        monthlyTarget: 30000,
        targetAmount: 30000,
        targetDate: '2026-10-01',
        savedAmount: 0,
      };
      const result1 = validateGoalPace(goalOnTrack, fixedToday);
      expect(result1.onTrack).toBe(true);
      expect(result1.shortfall).toBe(0);

      // Goal 2: Target 60,000 in 30 days, but daily is only 1,000 (reaches 30,000 -> short by 30,000)
      const goalShort: SavingsGoal = {
        id: 'g2',
        name: 'Falling short',
        dailyAmount: 1000,
        monthlyTarget: 30000,
        targetAmount: 60000,
        targetDate: '2026-10-01',
        savedAmount: 0,
      };
      const result2 = validateGoalPace(goalShort, fixedToday);
      expect(result2.onTrack).toBe(false);
      expect(result2.shortfall).toBe(30000);
      expect(result2.requiredDaily).toBe(2000);
    });
  });

  describe('Daily Budget and Allowance (4.5 & 4.7)', () => {
    it('calculates daily budget using remaining days and handles past/future months', () => {
      const fixedToday = new Date(2026, 8, 15); // Sept 15, 2026 (16 days left in Sept)

      // Current month
      const current = calcDailyExpenseBudget({
        monthlyIncome: 100000,
        obligations: 20000,
        monthlyExpenses: 48000,
        month: '2026-09',
        asOfDate: fixedToday,
      });
      // Remaining = 100k - 20k - 48k = 32k. Days left = 16. Daily = 32k / 16 = 2,000
      expect(current.remainingBudget).toBe(32000);
      expect(current.daysLeft).toBe(16);
      expect(current.dailyBudget).toBe(2000);

      // Past month -> 0 days left, daily budget 0
      const past = calcDailyExpenseBudget({
        monthlyIncome: 100000,
        obligations: 20000,
        monthlyExpenses: 50000,
        month: '2026-08',
        asOfDate: fixedToday,
      });
      expect(past.daysLeft).toBe(0);
      expect(past.dailyBudget).toBe(0);

      // Future month -> 31 days left for October
      const future = calcDailyExpenseBudget({
        monthlyIncome: 100000,
        obligations: 20000,
        monthlyExpenses: 0,
        month: '2026-10',
        asOfDate: fixedToday,
      });
      expect(future.daysLeft).toBe(31);
      expect(future.dailyBudget).toBe(Math.round(80000 / 31));
    });
  });

  describe('Selector Consistency Gate', () => {
    it('ensures calcAnalysis produces identical figures used across Dashboard, Analysis, and Goals', () => {
      const sampleState: AppState = {
        currentPage: 'dashboard',
        selectedMonth: '2026-09',
        profile: {} as any,
        income: [
          { id: 'i1', source: 'Salary', type: 'salary', amount: 90000, frequency: 'monthly', date: '2026-09-01' },
          { id: 'i2', source: 'Overtime', type: 'other', amount: 15000, frequency: 'one-time', date: '2026-09-10' },
        ],
        expenses: [
          { id: 'e1', date: '2026-09-02', amount: 12000, category: 'Rent', note: '', recurring: true },
          { id: 'e2', date: '2026-09-05', amount: 3000, category: 'Personal', note: 'Outing', recurring: false },
          { id: 'e3', date: '2026-09-06', amount: 20000, category: 'Transfer', note: 'Transfer to card', recurring: false },
        ],
        financePayments: [
          { id: 'fp1', lender: 'Auto Lease', amount: 25000, dueDay: 5, monthsRemaining: 10, status: 'active' },
        ],
        loans: [
          {
            id: 'l1',
            lender: 'Personal Loan',
            principal: 100000,
            rate: 12,
            method: 'reducing_balance',
            startDate: '2026-01-01',
            dueDate: '',
            balance: 50000,
          },
        ],
        savingsGoals: [
          { id: 'g1', name: 'Trip', dailyAmount: 500, monthlyTarget: 15000, savedAmount: 2000 },
        ],
        bankAccounts: [],
        cards: [],
        transactions: [],
        pawnedItems: [],
        personalSpendingBudget: 5000,
        letters: [],
        agreements: [],
        companies: [],
        businessBranches: [],
        employmentProfiles: [],
        ownerDraws: [],
        medicalExpenses: [],
        documents: [],
        reminders: [],
      };

      const analysis = calcAnalysis(sampleState, '2026-09');

      // Income = 90k + 15k = 105,000
      expect(analysis.totalIncome).toBe(105000);
      // Living expenses = 12k + 3k = 15,000 (excludes 20k Transfer)
      expect(analysis.livingExpenses).toBe(15000);
      // Finance payments = 25,000
      expect(analysis.financePayments).toBe(25000);
      // Loan interest = 50,000 * 0.01 = 500
      expect(analysis.loanInterest).toBe(500);
      // Savings = 500 * 30 days = 15,000
      expect(analysis.savingsTarget).toBe(15000);
      // Outflow = 15,000 + 25,000 + 500 + 15,000 = 55,500
      expect(analysis.totalOutflow).toBe(55500);
      // Net = 105,000 - 55,500 = 49,500
      expect(analysis.netPosition).toBe(49500);
      // Free cash = 105,000 - 15,000 - 25,000 - 500 = 64,500
      expect(analysis.freeCash).toBe(64500);
      // Personal spent = 3,000
      expect(analysis.personalSpent).toBe(3000);
    });
  });
});
