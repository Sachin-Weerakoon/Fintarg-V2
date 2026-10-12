/**
 * Fintarg insight engine.
 *
 * Pure, dependency-free analytics used by the Analysis page, the notification
 * centre and the dashboard. Everything here is derived from the user's own
 * records (AppState) — nothing is invented. Predictions are transparent
 * statistics (damped linear trend + residual spread), not black boxes.
 *
 * NOTE: the month maths deliberately mirrors `calcAnalysis` in `store.tsx`
 * so that numbers shown in analysis always agree with the rest of the app.
 */
import type { AppState, SavingsGoal, FinancePayment } from '@/types';
import {
  calcMonthlyExpenses,
  calcFinancePayments,
  calcLoanInterest,
  calcRecurringIncome,
  calcOneTimeIncome,
  calcGoalMonthlyTarget,
  calcTotalSavingsTarget,
} from './money';

/* ────────────────────────────────────────────────────────────────────────── */
/* Date helpers                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function utcDay(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000;
}

/** Whole days from a → b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round(utcDay(b) - utcDay(a));
}

export function addDays(date: string, delta: number): string {
  const t = new Date((utcDay(date) + delta) * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTH_NAMES[(m || 1) - 1] || month;
  return style === 'short' ? `${name.slice(0, 3)} ’${String(y).slice(2)}` : `${name} ${y}`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Small statistics toolkit                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(sum(xs.map(x => (x - m) ** 2)) / (xs.length - 1));
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
  residualSd: number;
}

/** Ordinary least squares over x = 0..n-1. */
export function linearFit(values: number[]): LinearFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, residualSd: 0 };
  if (n === 1) return { slope: 0, intercept: values[0], r2: 0, residualSd: 0 };
  const xs = values.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(values);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (values[i] - my);
    syy += (values[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const ssRes = sum(values.map((v, i) => (v - (intercept + slope * i)) ** 2));
  const r2 = syy === 0 ? 0 : clamp(1 - ssRes / syy, 0, 1);
  const residualSd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  return { slope, intercept, r2, residualSd };
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export interface ForecastPoint {
  value: number;
  low: number;
  high: number;
}

/**
 * Damped linear-trend forecast with a widening confidence band (≈80%).
 * - Trend uses the last `window` points and is capped to ±12% of the mean per
 *   step so a single odd month cannot produce absurd projections.
 * - The band never collapses below 6% of the mean (honest uncertainty).
 */
export function forecastSeries(values: number[], horizon: number, window = 6): ForecastPoint[] {
  const data = values.slice(-window);
  if (data.length === 0) return Array.from({ length: horizon }, () => ({ value: 0, low: 0, high: 0 }));
  const m = mean(data);
  const fit = linearFit(data);
  const maxSlope = Math.abs(m) * 0.12;
  const slope = data.length < 3 ? 0 : clamp(fit.slope, -maxSlope, maxSlope);
  const sd = Math.max(fit.residualSd || stdDev(data), Math.abs(m) * 0.06);
  const lastFitted = fit.intercept + fit.slope * (data.length - 1);
  // Anchor on a blend of recent actuals and the fitted line to damp noise.
  const anchor = data.length < 3 ? m : 0.5 * data[data.length - 1] + 0.5 * lastFitted;
  const out: ForecastPoint[] = [];
  let damp = 1;
  let cumulative = 0;
  for (let k = 1; k <= horizon; k++) {
    damp *= 0.85;
    cumulative += slope * damp;
    const value = Math.max(0, anchor + cumulative);
    const band = 1.28 * sd * Math.sqrt(1 + k * 0.35);
    out.push({ value, low: Math.max(0, value - band), high: value + band });
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Month level aggregates (mirrors store.calcAnalysis)                        */
/* ────────────────────────────────────────────────────────────────────────── */

export interface MonthPoint {
  month: string;
  income: number;
  recurringIncome: number;
  oneTimeIncome: number;
  living: number;
  financePayments: number;
  loanInterest: number;
  savings: number;
  outflow: number;
  net: number;
  shortfall: number;
  savingsRate: number;
  isForecast?: boolean;
}

export function livingExpenses(state: AppState, month: string): number {
  return calcMonthlyExpenses(state.expenses, month);
}

export function monthPoint(state: AppState, month: string): MonthPoint {
  const rec = calcRecurringIncome(state.income, month, state.employmentProfiles);
  const one = calcOneTimeIncome(state.income, month);
  const income = rec + one;
  const living = calcMonthlyExpenses(state.expenses, month);
  const financePayments = calcFinancePayments(state.financePayments);
  const loanInterest = calcLoanInterest(state.loans, state.financePayments);
  const savings = calcTotalSavingsTarget(state.savingsGoals, month);
  const outflow = living + financePayments + loanInterest + savings;
  const net = income - outflow;
  const shortfall = net < 0 ? -net : 0;
  return {
    month,
    income,
    recurringIncome: rec,
    oneTimeIncome: one,
    living,
    financePayments,
    loanInterest,
    savings,
    outflow,
    net,
    shortfall,
    savingsRate: income > 0 ? net / income : 0,
  };
}

/** Earliest month that holds any dated record (used to avoid fake empty history). */
export function firstDataMonth(state: AppState): string | null {
  const dates: string[] = [
    ...state.expenses.map(e => e.date),
    ...state.income.map(i => i.date),
    ...state.transactions.map(t => t.date),
  ].filter(Boolean);
  if (!dates.length) return null;
  return monthOf(dates.sort()[0]);
}

/** Up to `count` months ending at `endMonth`, trimmed to where data really exists. */
export function buildSeries(state: AppState, endMonth: string, count = 6): MonthPoint[] {
  const first = firstDataMonth(state);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(endMonth, -i);
    if (first && m < first && i !== 0) continue;
    months.push(m);
  }
  return months.map(m => monthPoint(state, m));
}

export interface ForecastMonth extends MonthPoint {
  isForecast: true;
  netLow: number;
  netHigh: number;
  outflowLow: number;
  outflowHigh: number;
  shortfallRisk: number; // 0..1
}

/** Projects the next `horizon` months from the history in `series`. */
export function forecastMonths(state: AppState, series: MonthPoint[], horizon = 3): ForecastMonth[] {
  if (!series.length) return [];
  const last = series[series.length - 1].month;
  const livingFc = forecastSeries(series.map(p => p.living), horizon);
  const oneTimeHistory = series.map(p => p.oneTimeIncome);
  const oneTimeAvg = mean(oneTimeHistory);
  const oneTimeSd = stdDev(oneTimeHistory);
  const loanInterest = calcLoanInterest(state.loans, state.financePayments);
  const active = state.financePayments.filter(f => f.status !== 'completed' && f.status !== 'cancelled' && f.status !== 'cleared');

  return livingFc.map((lf, idx) => {
    const k = idx + 1;
    const month = addMonths(last, k);
    const rec = calcRecurringIncome(state.income, month, state.employmentProfiles);
    const fp = active.reduce((s, f) => s + ((f.monthsRemaining || 0) >= k ? f.amount : 0), 0);
    const savings = state.savingsGoals.reduce((s, g) => {
      const end = g.targetDate || g.endDate;
      const reached = (g.targetAmount ?? 0) > 0 && g.savedAmount >= (g.targetAmount as number);
      return s + (reached || (end && monthOf(end) < month) ? 0 : calcGoalMonthlyTarget(g, month));
    }, 0);
    const income = rec + oneTimeAvg;
    const fixed = fp + loanInterest + savings;
    const outflow = lf.value + fixed;
    const net = income - outflow;
    const shortfall = net < 0 ? -net : 0;
    const sdExp = (lf.high - lf.low) / (2 * 1.28);
    const sdNet = Math.sqrt(sdExp ** 2 + oneTimeSd ** 2) || 1;
    return {
      month,
      income,
      recurringIncome: rec,
      oneTimeIncome: oneTimeAvg,
      living: lf.value,
      financePayments: fp,
      loanInterest,
      savings,
      outflow,
      net,
      shortfall,
      savingsRate: income > 0 ? net / income : 0,
      isForecast: true as const,
      netLow: income - (lf.high + fixed) - 1.28 * oneTimeSd,
      netHigh: income - (lf.low + fixed) + 1.28 * oneTimeSd,
      outflowLow: lf.low + fixed,
      outflowHigh: lf.high + fixed,
      shortfallRisk: clamp(normalCdf(-net / sdNet), 0, 1),
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Spending analytics                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CategoryChange {
  category: string;
  current: number;
  previous: number;
  avg3: number;
  changePct: number | null; // vs 3-month average
  share: number; // of this month's total
  flag: 'spike' | 'new' | 'drop' | null;
}

export function categoryTotals(state: AppState, month: string): Record<string, number> {
  const map: Record<string, number> = {};
  state.expenses.filter(e => e.date.startsWith(month)).forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return map;
}

export function categoryChanges(state: AppState, month: string): CategoryChange[] {
  const cur = categoryTotals(state, month);
  const prevMonths = [1, 2, 3].map(i => addMonths(month, -i));
  const prevTotals = prevMonths.map(m => categoryTotals(state, m));
  const monthsWithData = prevTotals.filter(t => Object.keys(t).length > 0).length || 1;
  const total = sum(Object.values(cur)) || 1;
  const cats = new Set<string>([...Object.keys(cur), ...prevTotals.flatMap(t => Object.keys(t))]);
  const rows: CategoryChange[] = [];
  cats.forEach(category => {
    const current = cur[category] || 0;
    const previous = prevTotals[0][category] || 0;
    const avg3 = sum(prevTotals.map(t => t[category] || 0)) / monthsWithData;
    const changePct = avg3 > 0 ? ((current - avg3) / avg3) * 100 : null;
    let flag: CategoryChange['flag'] = null;
    if (avg3 > 0 && current > avg3 * 1.3 && current - avg3 >= 1000) flag = 'spike';
    else if (avg3 === 0 && current >= 2000) flag = 'new';
    else if (avg3 > 0 && current < avg3 * 0.7 && avg3 - current >= 1000) flag = 'drop';
    if (current > 0 || avg3 > 0) rows.push({ category, current, previous, avg3, changePct, share: current / total, flag });
  });
  return rows.sort((a, b) => b.current - a.current);
}

export interface DayCell {
  date: string;
  day: number;
  weekday: number; // 0 = Sunday
  amount: number;
}

export function dailySpending(state: AppState, month: string): DayCell[] {
  const dim = daysInMonth(month);
  const amounts: Record<string, number> = {};
  state.expenses.filter(e => e.date.startsWith(month)).forEach(e => {
    amounts[e.date] = (amounts[e.date] || 0) + e.amount;
  });
  return Array.from({ length: dim }, (_, i) => {
    const day = i + 1;
    const date = `${month}-${pad(day)}`;
    return { date, day, weekday: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day)).getUTCDay(), amount: amounts[date] || 0 };
  });
}

export interface PaceProjection {
  isCurrent: boolean;
  elapsed: number;
  daysInMonth: number;
  remainingDays: number;
  spentSoFar: number;
  projectedLiving: number;
  projectedNet: number;
  dailyRate: number;
  safeDailyLimit: number; // what can still be spent per day without going negative
  budgetUsed: number | null; // personal spending budget used (0..n)
}

export function monthPace(state: AppState, month: string, today: string = todayISO()): PaceProjection {
  const dim = daysInMonth(month);
  const point = monthPoint(state, month);
  const isCurrent = monthOf(today) === month;
  const elapsed = isCurrent ? Math.min(dim, Math.max(1, Number(today.slice(8, 10)))) : dim;
  const remaining = dim - elapsed;
  const items = state.expenses.filter(e => e.date.startsWith(month));
  const recurring = sum(items.filter(e => e.recurring).map(e => e.amount));
  const variable = point.living - recurring;
  const projectedLiving = isCurrent ? recurring + (variable / elapsed) * dim : point.living;
  const projectedNet = point.income - (projectedLiving + point.financePayments + point.loanInterest + point.savings);
  const fixedRemaining = point.financePayments + point.loanInterest + point.savings;
  const headroom = point.income - point.living - fixedRemaining;
  const personalSpent = sum(items.filter(e => e.category === 'Personal').map(e => e.amount));
  return {
    isCurrent,
    elapsed,
    daysInMonth: dim,
    remainingDays: remaining,
    spentSoFar: point.living,
    projectedLiving,
    projectedNet,
    dailyRate: point.living / elapsed,
    safeDailyLimit: remaining > 0 ? Math.max(0, headroom) / remaining : 0,
    budgetUsed: state.personalSpendingBudget > 0 ? personalSpent / state.personalSpendingBudget : null,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Goals, debt and runway                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type GoalStatus = 'achieved' | 'on-track' | 'behind' | 'stalled' | 'overdue';

export interface GoalProjection {
  id: string;
  name: string;
  saved: number;
  target: number;
  remaining: number;
  progress: number; // 0..1
  deadline: string;
  daysLeft: number;
  paceDaily: number; // from last 30 days of contributions
  neededDaily: number;
  projectedDate: string | null;
  status: GoalStatus;
  catchUpMonthly: number; // extra per month needed to reach the deadline
}

export function goalTarget(g: SavingsGoal): number {
  if ((g.targetAmount ?? 0) > 0) return g.targetAmount as number;
  const end = g.targetDate || g.endDate;
  if (!end) return Math.max(g.savedAmount, g.monthlyTarget);
  const monthsLeft = Math.max(1, Math.ceil(daysBetween(todayISO(), end) / 30));
  return g.savedAmount + g.monthlyTarget * monthsLeft;
}

export function goalProjections(state: AppState, today: string = todayISO()): GoalProjection[] {
  return state.savingsGoals.map(g => {
    const deadline = g.targetDate || g.endDate || addDays(today, 365);
    const monthsLeft = Math.max(1, Math.ceil(daysBetween(today, deadline) / 30));
    const target = (g.targetAmount ?? 0) > 0 ? (g.targetAmount as number) : g.savedAmount + g.monthlyTarget * monthsLeft;
    const saved = g.savedAmount;
    const remaining = Math.max(0, target - saved);
    const daysLeft = daysBetween(today, deadline);
    const cutoff = addDays(today, -30);
    const recent = (g.contributions || []).filter(c => c.date >= cutoff && c.date <= today).reduce((s, c) => s + c.amount, 0);
    const paceDaily = recent / 30;
    const neededDaily = daysLeft > 0 ? remaining / daysLeft : remaining;
    const projectedDate = paceDaily > 0 ? addDays(today, Math.ceil(remaining / paceDaily)) : null;
    let status: GoalStatus;
    if (remaining <= 0) status = 'achieved';
    else if (daysLeft < 0) status = 'overdue';
    else if (recent === 0) status = 'stalled';
    else if (paceDaily >= neededDaily * 0.95) status = 'on-track';
    else status = 'behind';
    const catchUpMonthly = Math.max(0, (neededDaily - paceDaily) * 30);
    return {
      id: g.id,
      name: g.name,
      saved,
      target,
      remaining,
      progress: target > 0 ? clamp(saved / target, 0, 1) : 0,
      deadline,
      daysLeft,
      paceDaily,
      neededDaily,
      projectedDate,
      status,
      catchUpMonthly,
    };
  });
}

export interface DebtSummary {
  loanBalance: number;
  loanInterestMonthly: number;
  financeMonthly: number;
  financeRemainingTotal: number;
  pawnPrincipal: number;
  pawnInterestMonthly: number;
  totalMonthlyService: number;
  totalDebt: number;
  debtToIncome: number; // 0..n
  debtFreeMonths: number | null;
  items: { kind: 'loan' | 'finance' | 'pawn'; label: string; balance: number; monthlyCost: number; ratePct: number | null }[];
}

export function debtSummary(state: AppState, month: string): DebtSummary {
  const income = monthPoint(state, month).income;
  const items: DebtSummary['items'] = [];
  state.loans.forEach(l => {
    const monthly = l.method === 'compound' ? l.balance * (Math.pow(1 + l.rate / 100, 1) - 1) : (l.balance * l.rate) / 100;
    if (l.balance > 0) items.push({ kind: 'loan', label: l.lender, balance: l.balance, monthlyCost: monthly, ratePct: l.rate });
  });
  const active = activeFinancePayments(state);
  active.forEach(f => {
    items.push({ kind: 'finance', label: f.lender, balance: f.amount * (f.monthsRemaining || 0), monthlyCost: f.amount, ratePct: null });
  });
  state.pawnedItems.filter(p => p.status !== 'redeemed' && p.status !== 'forfeited').forEach(p => {
    const principal = p.principalOutstanding ?? p.amountReceived;
    items.push({ kind: 'pawn', label: p.description, balance: principal, monthlyCost: Math.round((principal * p.interestRate) / 100), ratePct: p.interestRate });
  });
  const loanBalance = sum(items.filter(i => i.kind === 'loan').map(i => i.balance));
  const loanInterestMonthly = sum(items.filter(i => i.kind === 'loan').map(i => i.monthlyCost));
  const financeMonthly = sum(items.filter(i => i.kind === 'finance').map(i => i.monthlyCost));
  const financeRemainingTotal = sum(items.filter(i => i.kind === 'finance').map(i => i.balance));
  const pawnPrincipal = sum(items.filter(i => i.kind === 'pawn').map(i => i.balance));
  const pawnInterestMonthly = sum(items.filter(i => i.kind === 'pawn').map(i => i.monthlyCost));
  const totalMonthlyService = loanInterestMonthly + financeMonthly + pawnInterestMonthly;
  return {
    loanBalance,
    loanInterestMonthly,
    financeMonthly,
    financeRemainingTotal,
    pawnPrincipal,
    pawnInterestMonthly,
    totalMonthlyService,
    totalDebt: loanBalance + financeRemainingTotal + pawnPrincipal,
    debtToIncome: income > 0 ? totalMonthlyService / income : 0,
    debtFreeMonths: active.length ? Math.max(...active.map(f => f.monthsRemaining || 0)) : null,
    items,
  };
}

export function liquidReserves(state: AppState): number {
  const bank = state.bankAccounts.reduce((s, b) => s + Math.max(0, b.currentBalance || 0), 0);
  const goals = state.savingsGoals.reduce((s, g) => s + Math.max(0, g.savedAmount || 0), 0);
  return bank + goals;
}

/** How many months the reserves cover essential monthly burn (living + debt service). */
export function runwayMonths(state: AppState, month: string): number | null {
  const p = monthPoint(state, month);
  const burn = p.living + p.financePayments + p.loanInterest;
  if (burn <= 0) return null;
  return liquidReserves(state) / burn;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Financial health score                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export interface HealthFactor {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number;
  detail: string;
  hasData: boolean;
}

export interface HealthScore {
  score: number;
  grade: 'Excellent' | 'Strong' | 'Fair' | 'At risk' | 'Critical';
  tone: 'success' | 'primary' | 'warning' | 'danger';
  factors: HealthFactor[];
}

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export function healthScore(state: AppState, month: string, today: string = todayISO()): HealthScore {
  const p = monthPoint(state, month);
  const debt = debtSummary(state, month);
  const runway = runwayMonths(state, month);
  const goals = goalProjections(state, today);
  const pace = monthPace(state, month, today);
  const hasIncome = p.income > 0;

  const factors: HealthFactor[] = [
    {
      key: 'savings',
      label: 'Savings rate',
      weight: 25,
      hasData: hasIncome,
      score: hasIncome ? clamp((p.savingsRate / 0.2) * 100) : 40,
      detail: hasIncome ? `${pct(p.savingsRate)} of income left after all outflow (target 20%)` : 'Add income to measure',
    },
    {
      key: 'spending',
      label: 'Spending ratio',
      weight: 20,
      hasData: hasIncome,
      score: hasIncome ? clamp(((1.1 - p.outflow / p.income) / 0.4) * 100) : 40,
      detail: hasIncome ? `Outflow is ${pct(p.outflow / p.income)} of income (aim for under 70%)` : 'Add income to measure',
    },
    {
      key: 'debt',
      label: 'Debt burden',
      weight: 20,
      hasData: hasIncome,
      score: hasIncome ? clamp(((0.4 - debt.debtToIncome) / 0.3) * 100) : 60,
      detail: debt.totalMonthlyService > 0 ? `${pct(debt.debtToIncome)} of income services debt (aim for under 10–20%)` : 'No active debt servicing',
    },
    {
      key: 'runway',
      label: 'Emergency runway',
      weight: 15,
      hasData: runway !== null,
      score: runway === null ? 50 : clamp((runway / 6) * 100),
      detail: runway === null ? 'Add expenses to estimate' : `${runway.toFixed(1)} months of essentials covered (goal 6)`,
    },
    {
      key: 'goals',
      label: 'Goal momentum',
      weight: 10,
      hasData: goals.length > 0,
      score: goals.length
        ? (goals.reduce((s, g) => s + (g.status === 'achieved' || g.status === 'on-track' ? 100 : g.status === 'behind' ? 55 : g.status === 'stalled' ? 20 : 10), 0) / goals.length)
        : 50,
      detail: goals.length ? `${goals.filter(g => g.status === 'achieved' || g.status === 'on-track').length}/${goals.length} goals on track` : 'Create a savings goal',
    },
    {
      key: 'budget',
      label: 'Budget discipline',
      weight: 10,
      hasData: pace.budgetUsed !== null,
      score: pace.budgetUsed === null ? 60 : clamp(((1.3 - pace.budgetUsed) / 0.3) * 100),
      detail: pace.budgetUsed === null ? 'Set a personal spending budget' : `${pct(pace.budgetUsed)} of personal budget used`,
    },
  ];

  const totalWeight = sum(factors.map(f => f.weight));
  const score = Math.round(sum(factors.map(f => f.score * f.weight)) / totalWeight);
  let grade: HealthScore['grade'];
  let tone: HealthScore['tone'];
  if (score >= 85) [grade, tone] = ['Excellent', 'success'];
  else if (score >= 70) [grade, tone] = ['Strong', 'primary'];
  else if (score >= 50) [grade, tone] = ['Fair', 'warning'];
  else if (score >= 30) [grade, tone] = ['At risk', 'danger'];
  else [grade, tone] = ['Critical', 'danger'];
  return { score, grade, tone, factors };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Upcoming obligations & reminders                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type ObligationKind = 'finance' | 'pawn' | 'pawn-redeem' | 'loan' | 'agreement' | 'reminder';

export interface Obligation {
  id: string;
  kind: ObligationKind;
  label: string;
  date: string;
  daysUntil: number;
  amount?: number;
  href: string;
  reminderId?: string;
}

function financeDueDate(f: FinancePayment, today: string): string | null {
  if (f.status === 'completed' || f.status === 'cancelled' || f.status === 'cleared') return null;
  if ((f.monthsRemaining ?? 1) <= 0) return null;
  if (f.nextDueDate) return f.nextDueDate.slice(0, 10);
  if (!f.dueDay) return null;
  const month = monthOf(today);
  const dim = daysInMonth(month);
  const thisMonth = `${month}-${pad(Math.min(f.dueDay, dim))}`;
  const paidThisMonth = (f.payments || []).some(p => p.date.startsWith(month));
  if (paidThisMonth) {
    const next = addMonths(month, 1);
    return `${next}-${pad(Math.min(f.dueDay, daysInMonth(next)))}`;
  }
  return thisMonth;
}

export function upcomingObligations(state: AppState, today: string = todayISO(), windowDays = 30): Obligation[] {
  const out: Obligation[] = [];
  const push = (o: Omit<Obligation, 'daysUntil'>) => {
    const daysUntil = daysBetween(today, o.date);
    if (daysUntil <= windowDays && daysUntil >= -30) out.push({ ...o, daysUntil });
  };

  state.financePayments.forEach(f => {
    const d = financeDueDate(f, today);
    if (d) push({ id: `fin-${f.id}-${d}`, kind: 'finance', label: `${f.lender} instalment`, date: d, amount: f.amount, href: '/financial?tab=finance' });
  });
  state.pawnedItems.filter(p => p.status !== 'redeemed' && p.status !== 'forfeited').forEach(p => {
    if (p.nextDue) push({ id: `pawn-${p.id}-${p.nextDue}`, kind: 'pawn', label: `Pawn interest · ${p.description}`, date: p.nextDue.slice(0, 10), amount: Math.round(((p.principalOutstanding ?? p.amountReceived) * p.interestRate) / 100), href: '/financial?tab=pawned' });
    if (p.redemptionDate) push({ id: `pawn-redeem-${p.id}-${p.redemptionDate}`, kind: 'pawn-redeem', label: `Redeem · ${p.description}`, date: p.redemptionDate.slice(0, 10), amount: p.principalOutstanding ?? p.amountReceived, href: '/financial?tab=pawned' });
  });
  state.loans.filter(l => l.balance > 0 && l.dueDate).forEach(l => {
    push({ id: `loan-${l.id}-${l.dueDate}`, kind: 'loan', label: `${l.lender} loan due`, date: l.dueDate.slice(0, 10), amount: l.monthlyPayment || l.balance, href: '/financial?tab=loans' });
  });
  state.agreements.filter(a => a.status === 'active' && a.endDate).forEach(a => {
    push({ id: `agr-${a.id}-${a.endDate}`, kind: 'agreement', label: `${a.title} ends`, date: a.endDate.slice(0, 10), amount: undefined, href: '/advanced?tab=agreements' });
  });
  state.reminders.filter(r => r.status === 'pending' && r.dueDate).forEach(r => {
    push({ id: `rem-${r.id}`, kind: 'reminder', label: r.label, date: r.dueDate.slice(0, 10), href: '/advanced/medical', reminderId: r.id });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Insights → notifications                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';
export type InsightCategory = 'cashflow' | 'spending' | 'bills' | 'goals' | 'debt' | 'savings' | 'data';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  message: string;
  href?: string;
  actionLabel?: string;
  /** Present for custom reminders so the UI can offer “mark done”. */
  reminderId?: string;
}

const rs = (n: number) => {
  const r = Math.round(n);
  const s = Math.abs(r).toLocaleString('en-LK');
  return r < 0 ? `−Rs. ${s}` : `Rs. ${s}`;
};

const SEVERITY_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };

function dueWording(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

export function buildInsights(state: AppState, today: string = todayISO()): Insight[] {
  const month = monthOf(today);
  const out: Insight[] = [];
  const hasAnyData = state.income.length + state.expenses.length > 0;

  if (!hasAnyData) {
    return [{
      id: 'data-empty',
      severity: 'info',
      category: 'data',
      title: 'Add your first income & expense',
      message: 'Fintarg learns from your records. Add a few entries and personalised forecasts and guidance appear here.',
      href: '/financial',
      actionLabel: 'Open Financial',
    }];
  }

  const series = buildSeries(state, month, 6);
  const point = series[series.length - 1] || monthPoint(state, month);
  const pace = monthPace(state, month, today);
  const forecast = forecastMonths(state, series, 3);
  const cats = categoryChanges(state, month);
  const debt = debtSummary(state, month);
  const runway = runwayMonths(state, month);
  const goals = goalProjections(state, today);
  const obligations = upcomingObligations(state, today, 14);

  /* Cash-flow now */
  if (point.income > 0 && point.net < 0) {
    const top = cats.filter(c => !['Rent', 'Utilities', 'Medical'].includes(c.category))[0];
    out.push({
      id: `cf-deficit-${month}`,
      severity: 'critical',
      category: 'cashflow',
      title: `You’re ${rs(Math.abs(point.net))} over budget this month`,
      message: `Outflow of ${rs(point.outflow)} exceeds income of ${rs(point.income)}.${top ? ` Trimming ${top.category} (${rs(top.current)}) is the fastest lever.` : ''}`,
      href: '/analysis',
      actionLabel: 'See the plan',
    });
  } else if (pace.isCurrent && point.income > 0 && pace.projectedNet < 0 && point.net >= 0) {
    out.push({
      id: `cf-pace-${month}`,
      severity: 'warning',
      category: 'cashflow',
      title: 'At this pace you’ll overspend by month-end',
      message: `Projected shortfall ${rs(Math.abs(pace.projectedNet))}. Keep daily spending under ${rs(pace.safeDailyLimit)} for the next ${pace.remainingDays} days.`,
      href: '/analysis',
      actionLabel: 'Review pace',
    });
  } else if (point.income > 0 && point.savingsRate >= 0.2) {
    out.push({
      id: `cf-strong-${month}`,
      severity: 'success',
      category: 'savings',
      title: `Great month — you’re saving ${(point.savingsRate * 100).toFixed(0)}%`,
      message: `${rs(point.net)} is left after every obligation. Move part of it into a goal to lock the win in.`,
      href: '/goals',
      actionLabel: 'Fund a goal',
    });
  } else if (point.income > 0 && point.savingsRate >= 0 && point.savingsRate < 0.1) {
    out.push({
      id: `sv-thin-${month}`,
      severity: 'info',
      category: 'savings',
      title: 'Your savings cushion is thin',
      message: `Only ${(point.savingsRate * 100).toFixed(0)}% of income is left over. Reaching 20% would add ${rs(point.income * 0.2 - Math.max(0, point.net))} a month.`,
      href: '/analysis',
      actionLabel: 'Find savings',
    });
  }

  /* Forecast */
  const worst = forecast.find(f => f.net < 0) || null;
  if (worst) {
    out.push({
      id: `fc-deficit-${worst.month}`,
      severity: 'warning',
      category: 'cashflow',
      title: `Forecast: shortfall expected in ${monthLabel(worst.month)}`,
      message: `Projected net ${rs(worst.net)} (${Math.round(worst.shortfallRisk * 100)}% risk). Act now to keep a buffer.`,
      href: '/analysis',
      actionLabel: 'View forecast',
    });
  } else {
    const risky = forecast.find(f => f.shortfallRisk >= 0.35);
    if (risky) {
      out.push({
        id: `fc-risk-${risky.month}`,
        severity: 'info',
        category: 'cashflow',
        title: `${monthLabel(risky.month)} looks tight`,
        message: `Roughly ${Math.round(risky.shortfallRisk * 100)}% chance of ending negative based on your spending volatility.`,
        href: '/analysis',
        actionLabel: 'View forecast',
      });
    }
  }

  /* Spending anomalies */
  cats.filter(c => c.flag === 'spike').slice(0, 2).forEach(c => {
    out.push({
      id: `cat-spike-${c.category}-${month}`,
      severity: 'warning',
      category: 'spending',
      title: `${c.category} spending is up ${Math.round(c.changePct ?? 0)}%`,
      message: `${rs(c.current)} this month vs a ${rs(c.avg3)} average. Worth a look.`,
      href: '/analysis',
      actionLabel: 'Inspect',
    });
  });
  if (pace.budgetUsed !== null && pace.budgetUsed >= 0.9) {
    out.push({
      id: `budget-${month}`,
      severity: pace.budgetUsed >= 1 ? 'critical' : 'warning',
      category: 'spending',
      title: pace.budgetUsed >= 1 ? 'Personal spending budget exceeded' : 'Personal budget nearly used up',
      message: `${Math.round(pace.budgetUsed * 100)}% of your ${rs(state.personalSpendingBudget)} personal budget is gone.`,
      href: '/financial?tab=expenses',
      actionLabel: 'View expenses',
    });
  }

  /* Bills & reminders */
  obligations.forEach(o => {
    if (o.daysUntil > 7) return;
    const overdue = o.daysUntil < 0;
    out.push({
      id: `due-${o.id}`,
      severity: overdue ? 'critical' : o.daysUntil <= 2 ? 'warning' : 'info',
      category: 'bills',
      title: `${o.label} ${dueWording(o.daysUntil)}`,
      message: o.amount !== undefined ? `${rs(o.amount)} · ${o.date}` : o.date,
      href: o.href,
      actionLabel: o.kind === 'reminder' ? 'Mark done' : 'Open',
      reminderId: o.reminderId,
    });
  });

  /* Goals */
  goals.forEach(g => {
    if (g.status === 'achieved') {
      out.push({ id: `goal-done-${g.id}`, severity: 'success', category: 'goals', title: `Goal reached: ${g.name} 🎉`, message: `You’ve saved ${rs(g.saved)}. Consider setting the next milestone.`, href: '/goals', actionLabel: 'View goals' });
    } else if (g.status === 'stalled') {
      out.push({ id: `goal-stalled-${g.id}-${month}`, severity: 'warning', category: 'goals', title: `${g.name} has had no contributions in 30 days`, message: `Saving ${rs(g.neededDaily)} a day would still hit the target by ${g.deadline}.`, href: '/goals', actionLabel: 'Add contribution' });
    } else if (g.status === 'behind') {
      out.push({ id: `goal-behind-${g.id}-${month}`, severity: 'info', category: 'goals', title: `${g.name} is slightly behind`, message: `Add about ${rs(g.catchUpMonthly)} a month more to finish by ${g.deadline}.`, href: '/goals', actionLabel: 'Adjust plan' });
    } else if (g.status === 'overdue') {
      out.push({ id: `goal-overdue-${g.id}`, severity: 'warning', category: 'goals', title: `${g.name} passed its deadline`, message: `${rs(g.remaining)} is still needed. Extend the date or top it up.`, href: '/goals', actionLabel: 'Review goal' });
    } else if (g.progress >= 0.75) {
      out.push({ id: `goal-near-${g.id}`, severity: 'success', category: 'goals', title: `${g.name} is ${Math.round(g.progress * 100)}% there`, message: `Only ${rs(g.remaining)} to go. Finish strong!`, href: '/goals', actionLabel: 'View goals' });
    }
  });

  /* Debt & runway */
  if (point.income > 0 && debt.debtToIncome > 0.35) {
    out.push({ id: `debt-heavy-${month}`, severity: 'warning', category: 'debt', title: 'Debt payments are taking a big share of income', message: `${Math.round(debt.debtToIncome * 100)}% of income goes to debt. Aim for under 20% by clearing the highest-cost item first.`, href: '/analysis', actionLabel: 'See payoff plan' });
  }
  if (runway !== null && runway < 1) {
    out.push({ id: `runway-low-${month}`, severity: 'warning', category: 'savings', title: 'Emergency cushion under one month', message: `Reserves cover ${runway.toFixed(1)} months of essentials. Build toward 3 months first.`, href: '/goals', actionLabel: 'Build cushion' });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Guidance: ordered plan + financial independence ladder                     */
/* ────────────────────────────────────────────────────────────────────────── */

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  impact?: string;
  href?: string;
  tone: 'danger' | 'warning' | 'primary' | 'success';
}

export function buildPlan(state: AppState, month: string, today: string = todayISO()): PlanStep[] {
  const p = monthPoint(state, month);
  const cats = categoryChanges(state, month);
  const debt = debtSummary(state, month);
  const runway = runwayMonths(state, month);
  const goals = goalProjections(state, today);
  const burn = p.living + p.financePayments + p.loanInterest;
  const reserves = liquidReserves(state);
  const steps: PlanStep[] = [];

  if (p.income > 0 && p.net < 0) {
    const flex = cats.filter(c => !['Rent', 'Utilities', 'Medical'].includes(c.category)).slice(0, 2);
    const cut = Math.abs(p.net);
    steps.push({
      id: 'cover-gap',
      tone: 'danger',
      title: `Close the ${rs(cut)} monthly gap`,
      detail: flex.length
        ? `Trim ${flex.map(c => `${c.category} (${rs(c.current)})`).join(' and ')} by about ${Math.round(Math.min(40, (cut / Math.max(1, sum(flex.map(c => c.current)))) * 100))}% to break even.`
        : 'Review discretionary spending and recurring costs to break even.',
      impact: `+${rs(cut)}/mo`,
      href: '/financial?tab=expenses',
    });
  }

  if (runway !== null && runway < 3) {
    const needed = Math.max(0, burn * 3 - reserves);
    steps.push({
      id: 'emergency',
      tone: runway < 1 ? 'warning' : 'primary',
      title: 'Build a 3-month emergency fund',
      detail: `You hold ${rs(reserves)} (${runway.toFixed(1)} months). ${rs(needed)} more reaches 3 months — ${rs(Math.ceil(needed / 6))}/month does it in 6.`,
      impact: `${rs(needed)} target`,
      href: '/goals',
    });
  }

  const costly = [...debt.items].filter(i => i.kind !== 'finance').sort((a, b) => (b.monthlyCost / Math.max(1, b.balance)) - (a.monthlyCost / Math.max(1, a.balance)))[0];
  if (costly && debt.totalMonthlyService > 0) {
    steps.push({
      id: 'debt',
      tone: debt.debtToIncome > 0.35 ? 'warning' : 'primary',
      title: `Pay down “${costly.label}” first`,
      detail: `It costs ${rs(costly.monthlyCost)} a month in interest${costly.ratePct !== null ? ` (${costly.ratePct}%)` : ''} — the highest cost per rupee owed. Clearing it frees cash fastest (avalanche method).`,
      impact: `−${rs(costly.monthlyCost)}/mo`,
      href: '/financial',
    });
  }

  goals.filter(g => g.status === 'stalled' || g.status === 'behind').slice(0, 2).forEach(g => {
    steps.push({
      id: `goal-${g.id}`,
      tone: 'primary',
      title: `Get “${g.name}” back on track`,
      detail: g.status === 'stalled'
        ? `No deposits for 30 days. ${rs(g.neededDaily)}/day finishes by ${g.deadline}.`
        : `Pace is ${rs(g.paceDaily)}/day; ${rs(g.neededDaily)}/day is needed. Add ${rs(g.catchUpMonthly)} per month.`,
      impact: `${rs(g.remaining)} to go`,
      href: '/goals',
    });
  });

  if (p.income > 0 && p.net > 0 && p.savingsRate < 0.2) {
    const lift = p.income * 0.2 - p.net;
    steps.push({
      id: 'rate',
      tone: 'primary',
      title: 'Lift your savings rate to 20%',
      detail: `You’re at ${(p.savingsRate * 100).toFixed(0)}%. Finding ${rs(lift)} a month (about ${rs(lift / 30)}/day) gets you there.`,
      impact: `+${rs(lift)}/mo`,
      href: '/analysis',
    });
  }

  if (!steps.length) {
    steps.push({
      id: 'maintain',
      tone: 'success',
      title: 'You’re on a healthy path — keep the momentum',
      detail: 'Cash flow, reserves and goals look solid. Consider raising a goal target or setting a new milestone.',
      href: '/goals',
    });
  }
  return steps;
}

export interface LadderRung {
  id: string;
  label: string;
  hint: string;
  progress: number; // 0..1
  done: boolean;
}

export function financialLadder(state: AppState, month: string): LadderRung[] {
  const p = monthPoint(state, month);
  const debt = debtSummary(state, month);
  const runway = runwayMonths(state, month);
  const r = (label: string, id: string, hint: string, progress: number): LadderRung => ({ id, label, hint, progress: clamp(progress, 0, 1), done: progress >= 1 });
  return [
    r('Positive cash flow', 'cash', 'Income covers every outflow', p.income > 0 ? (p.net >= 0 ? 1 : clamp(1 + p.net / p.income, 0, 0.95)) : 0),
    r('1-month cushion', 'cushion1', 'Reserves cover one month of essentials', runway === null ? 0 : runway / 1),
    r('Debt service under 20%', 'debt', 'Debt payments below 20% of income', p.income > 0 ? (debt.debtToIncome <= 0.2 ? 1 : clamp(0.2 / debt.debtToIncome, 0, 0.95)) : 0),
    r('Save 20% of income', 'rate', 'Net savings rate at or above 20%', p.income > 0 ? p.savingsRate / 0.2 : 0),
    r('3-month cushion', 'cushion3', 'Reserves cover three months', runway === null ? 0 : runway / 3),
    r('6-month cushion', 'cushion6', 'Full financial resilience', runway === null ? 0 : runway / 6),
  ];
}
