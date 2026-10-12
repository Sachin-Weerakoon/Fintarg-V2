import type { AppState, IncomeEntry, ExpenseEntry, FinancePayment, Loan, SavingsGoal, EmploymentProfile } from '@/types';

/**
 * Shared Money and Period Module
 * Central single-source-of-truth for all calculations across Dashboard, Expenses, Goals, Analysis, and Print views.
 */

/**
 * Returns total days in a month.
 * Supports "YYYY-MM", "YYYY-MM-DD", or Date instances.
 */
export function getDaysInMonth(month: string | Date): number {
  if (month instanceof Date) {
    return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  }
  const parts = String(month).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!y || !m || m < 1 || m > 12) return 30;
  return new Date(y, m, 0).getDate();
}

/**
 * Returns days remaining in a month relative to asOfDate.
 * - Past months return 0 days left.
 * - Future months return total days in that month.
 * - Current month returns (daysInMonth - asOfDate.getDate() + 1), minimum 1 if on or before last day.
 */
export function getDaysLeftInMonth(month: string, asOfDate: Date = new Date()): number {
  const parts = String(month).split('-');
  const targetYear = parseInt(parts[0], 10);
  const targetMonth = parseInt(parts[1], 10);
  if (!targetYear || !targetMonth) return 0;

  const currentYear = asOfDate.getFullYear();
  const currentMonth = asOfDate.getMonth() + 1;

  if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth)) {
    return 0;
  }

  const daysInTargetMonth = getDaysInMonth(month);

  if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
    return daysInTargetMonth;
  }

  return Math.max(1, daysInTargetMonth - asOfDate.getDate() + 1);
}

/**
 * Computes monthly income from income records.
 * - Monthly: amount
 * - Weekly: amount * 52 / 12
 * - Daily: amount * daysInMonth(month)
 * - One-time: amount only in the specific month
 * - Salary: deducts monthly deductions if provided directly or via employmentProfiles
 */
export function calcMonthlyIncome(
  income: IncomeEntry[],
  month: string,
  employmentProfiles?: EmploymentProfile[]
): number {
  const daysInTargetMonth = getDaysInMonth(month);

  return income.reduce((sum, i) => {
    let effectiveAmount = i.amount;

    if (i.type === 'salary') {
      if ((i as any).deductions !== undefined && (i as any).deductions !== null) {
        effectiveAmount = Math.max(0, i.amount - Number((i as any).deductions));
      } else if (employmentProfiles && employmentProfiles.length > 0) {
        const matchingJob = employmentProfiles.find(
          j => j.employer.toLowerCase().trim() === i.source.toLowerCase().trim() ||
               i.source.toLowerCase().includes(j.employer.toLowerCase().trim()) ||
               j.employer.toLowerCase().includes(i.source.toLowerCase().trim())
        ) || (employmentProfiles.length === 1 ? employmentProfiles[0] : undefined);

        if (matchingJob && matchingJob.monthlyDeductions > 0) {
          effectiveAmount = Math.max(0, i.amount - matchingJob.monthlyDeductions);
        }
      }
    }

    if (i.frequency === 'monthly') return sum + effectiveAmount;
    if (i.frequency === 'weekly') return sum + (effectiveAmount * 52) / 12;
    if (i.frequency === 'daily') return sum + effectiveAmount * daysInTargetMonth;
    if (i.frequency === 'one-time') {
      return i.date.startsWith(month) ? sum + effectiveAmount : sum;
    }
    return sum;
  }, 0);
}

/**
 * Computes recurring portion of monthly income (monthly, weekly, daily).
 */
export function calcRecurringIncome(
  income: IncomeEntry[],
  month: string,
  employmentProfiles?: EmploymentProfile[]
): number {
  const recurringOnly = income.filter(i => i.frequency !== 'one-time');
  return calcMonthlyIncome(recurringOnly, month, employmentProfiles);
}

/**
 * Computes one-time income for a given month.
 */
export function calcOneTimeIncome(income: IncomeEntry[], month: string): number {
  return income
    .filter(i => i.frequency === 'one-time' && i.date.startsWith(month))
    .reduce((sum, i) => sum + i.amount, 0);
}

/**
 * Computes total living expenses for a given month.
 * Excludes transfers (category 'Transfer' or 'transfer').
 */
export function calcMonthlyExpenses(expenses: ExpenseEntry[], month: string): number {
  return expenses
    .filter(e => e.date.startsWith(month) && (!e.category || e.category.toLowerCase().trim() !== 'transfer'))
    .reduce((s, e) => s + e.amount, 0);
}

/**
 * Computes Personal category expenses for a given month.
 */
export function calcPersonalSpent(expenses: ExpenseEntry[], month: string): number {
  return expenses
    .filter(e => e.date.startsWith(month) && e.category === 'Personal')
    .reduce((s, e) => s + e.amount, 0);
}

/**
 * Computes total active finance payments obligations.
 */
export function calcFinancePayments(fps: FinancePayment[]): number {
  return fps
    .filter(f => f.status !== 'completed' && f.status !== 'cancelled' && f.status !== 'cleared')
    .reduce((s, f) => s + f.amount, 0);
}

/**
 * Computes amortisation-based monthly loan interest (interest portion of the next installment).
 * Honours interestBasis ('annual' vs 'monthly').
 * Excludes loans that are already accounted for in active finance payments to avoid double counting.
 */
export function calcLoanInterest(loans: Loan[], financePayments: FinancePayment[] = []): number {
  const activeFp = financePayments.filter(f => f.status !== 'completed' && f.status !== 'cancelled' && f.status !== 'cleared');

  return loans.reduce((sum, l) => {
    if (!l.balance || l.balance <= 0) return sum;

    const isLinkedToFinancePayment = activeFp.some(f => {
      if ((f as any).loanId && (f as any).loanId === l.id) return true;
      if (f.lender && l.lender && f.lender.trim().toLowerCase() === l.lender.trim().toLowerCase()) return true;
      return false;
    });
    if (isLinkedToFinancePayment) return sum;

    const effectiveAnnualRate = l.interestBasis === 'monthly' ? l.rate * 12 : l.rate;
    const monthlyRate = (effectiveAnnualRate / 100) / 12;
    const monthlyInterest = Math.round(l.balance * monthlyRate * 100) / 100;

    return sum + monthlyInterest;
  }, 0);
}

/**
 * Aggregates expenses by category for a given month, excluding transfers.
 */
export function calcExpensesByCategory(expenses: ExpenseEntry[], month: string): Record<string, number> {
  const map: Record<string, number> = {};
  expenses
    .filter(e => e.date.startsWith(month) && (!e.category || e.category.toLowerCase().trim() !== 'transfer'))
    .forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
  return map;
}

/**
 * Aggregates expenses by day for a given month, excluding transfers.
 */
export function calcExpensesByDay(expenses: ExpenseEntry[], month: string): Record<string, number> {
  const map: Record<string, number> = {};
  expenses
    .filter(e => e.date.startsWith(month) && (!e.category || e.category.toLowerCase().trim() !== 'transfer'))
    .forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
  return map;
}

/**
 * Computes the monthly target for a savings goal in a specific month.
 * If dailyAmount is defined and > 0, derives monthly target as dailyAmount * daysInMonth(month).
 * Otherwise falls back to goal.monthlyTarget.
 */
export function calcGoalMonthlyTarget(goal: SavingsGoal, month: string): number {
  const days = getDaysInMonth(month);
  if (goal.dailyAmount && goal.dailyAmount > 0) {
    return Math.round(goal.dailyAmount * days);
  }
  return goal.monthlyTarget || 0;
}

/**
 * Computes total savings target across all goals for a specific month.
 */
export function calcTotalSavingsTarget(goals: SavingsGoal[], month: string): number {
  return goals.reduce((s, g) => s + calcGoalMonthlyTarget(g, month), 0);
}

export interface GoalPaceResult {
  onTrack: boolean;
  daysLeft: number;
  remainingAmount: number;
  projectedAmount: number;
  requiredDaily: number;
  shortfall: number;
}

/**
 * Validates goal pace: verifies whether dailyAmount * daysLeft >= remaining amount by targetDate.
 */
export function validateGoalPace(goal: SavingsGoal, asOfDate: Date = new Date()): GoalPaceResult {
  const targetDateStr = goal.targetDate || goal.endDate || '';
  const targetAmount = goal.targetAmount || 0;
  const savedAmount = goal.savedAmount || 0;
  const remainingAmount = Math.max(0, targetAmount - savedAmount);

  if (!targetDateStr) {
    return {
      onTrack: true,
      daysLeft: 0,
      remainingAmount,
      projectedAmount: savedAmount,
      requiredDaily: 0,
      shortfall: 0,
    };
  }

  const targetTime = new Date(targetDateStr).getTime();
  const currentTime = asOfDate.getTime();
  const diffDays = Math.max(0, Math.ceil((targetTime - currentTime) / (1000 * 60 * 60 * 24)));

  const dailyAmount = goal.dailyAmount || 0;
  const projectedSavings = dailyAmount * diffDays;
  const projectedAmount = savedAmount + projectedSavings;
  const shortfall = Math.max(0, remainingAmount - projectedSavings);
  const requiredDaily = diffDays > 0 ? Math.ceil(remainingAmount / diffDays) : remainingAmount;
  const onTrack = remainingAmount === 0 || projectedSavings >= remainingAmount;

  return {
    onTrack,
    daysLeft: diffDays,
    remainingAmount,
    projectedAmount,
    requiredDaily,
    shortfall,
  };
}

export interface DailyExpenseBudgetResult {
  daysLeft: number;
  daysInMonth: number;
  remainingBudget: number;
  dailyBudget: number;
}

/**
 * Calculates daily expense allowance based on real month length, remaining days, and obligations.
 */
export function calcDailyExpenseBudget(params: {
  monthlyIncome: number;
  obligations: number;
  monthlyExpenses: number;
  month: string;
  asOfDate?: Date;
}): DailyExpenseBudgetResult {
  const { monthlyIncome, obligations, monthlyExpenses, month, asOfDate = new Date() } = params;
  const daysInMonth = getDaysInMonth(month);
  const daysLeft = getDaysLeftInMonth(month, asOfDate);

  const remainingBudget = Math.max(0, monthlyIncome - obligations - monthlyExpenses);
  const dailyBudget = daysLeft > 0 ? Math.round(remainingBudget / daysLeft) : 0;

  return {
    daysLeft,
    daysInMonth,
    remainingBudget,
    dailyBudget,
  };
}

export interface DailyPersonalAllowanceResult {
  daysLeft: number;
  daysInMonth: number;
  remainingAllowance: number;
  dailyAllowance: number;
}

/**
 * Calculates daily personal allowance: (monthly budget - spent in month so far) / days remaining with real month length.
 */
export function calcDailyPersonalAllowance(params: {
  personalBudget: number;
  personalSpent: number;
  month: string;
  asOfDate?: Date;
}): DailyPersonalAllowanceResult {
  const { personalBudget, personalSpent, month, asOfDate = new Date() } = params;
  const daysInMonth = getDaysInMonth(month);
  const daysLeft = getDaysLeftInMonth(month, asOfDate);
  const remainingAllowance = Math.max(0, personalBudget - personalSpent);
  const dailyAllowance = daysLeft > 0 ? Math.round(remainingAllowance / daysLeft) : 0;

  return {
    daysLeft,
    daysInMonth,
    remainingAllowance,
    dailyAllowance,
  };
}

/**
 * Central financial analysis for an AppState and month.
 */
export function calcAnalysis(state: AppState, month: string) {
  const totalIncome = calcMonthlyIncome(state.income, month, state.employmentProfiles);
  const livingExpenses = calcMonthlyExpenses(state.expenses, month);
  const financePayments = calcFinancePayments(state.financePayments);
  const loanInterest = calcLoanInterest(state.loans, state.financePayments);
  const savingsTarget = calcTotalSavingsTarget(state.savingsGoals, month);

  const totalOutflow = livingExpenses + financePayments + loanInterest + savingsTarget;
  const netPosition = totalIncome - totalOutflow;
  const shortfall = netPosition < 0 ? Math.abs(netPosition) : 0;
  const freeCash = totalIncome - livingExpenses - financePayments - loanInterest;
  const personalSpent = calcPersonalSpent(state.expenses, month);

  return {
    totalIncome,
    livingExpenses,
    financePayments,
    loanInterest,
    savingsTarget,
    totalOutflow,
    netPosition,
    shortfall,
    freeCash,
    personalSpent,
  };
}
