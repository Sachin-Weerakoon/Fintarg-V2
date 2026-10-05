export type Amount = number; // stored in cents, display in rupees

export function centsToRupees(cents: number): number {
  return Math.round(cents / 100);
}

export function rupeesToCents(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatRs(cents: number): string {
  const rupees = Math.abs(Math.round(cents / 100));
  return 'Rs. ' + rupees.toLocaleString('en-LK');
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function calcMonthlyIncomeCents(income: { frequency: string; amountCents: number; date: string }[], month: string): number {
  const days = daysInMonth(month);
  return income.reduce((sum, i) => {
    if (i.frequency === 'monthly') return sum + i.amountCents;
    if (i.frequency === 'weekly') return sum + Math.round(i.amountCents * days / 7);
    if (i.frequency === 'daily') return sum + i.amountCents * days;
    if (i.frequency === 'one-time') return i.date.startsWith(month) ? sum + i.amountCents : sum;
    return sum;
  }, 0);
}

export function calcMonthlyExpensesCents(expenses: { date: string; amountCents: number; category: string }[], month: string): number {
  return expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amountCents, 0);
}

export function calcFinancePaymentsCents(payments: { amountCents: number }[]): number {
  return payments.reduce((s, p) => s + p.amountCents, 0);
}

export function calcLoanInterestCents(loans: { balanceCents: number; ratePercent: number; method: string; startDate: string; dueDate: string }[], _month?: string): number {
  void _month;
  return loans.reduce((s, l) => {
    if (l.method === 'compound') {
      return s + Math.round(l.balanceCents * (Math.pow(1 + l.ratePercent / 100, 1) - 1));
    }
    return s + Math.round((l.balanceCents * l.ratePercent) / 100);
  }, 0);
}

export function calcPawnInterestCents(pawned: { amountReceivedCents: number; interestRatePercent: number; nextDue: string }[], month: string): number {
  return pawned.reduce((s, p) => {
    if (p.nextDue.startsWith(month)) {
      return s + Math.round(p.amountReceivedCents * p.interestRatePercent / 100);
    }
    return s;
  }, 0);
}

export function calcAnalysis({
  income,
  expenses,
  financePayments,
  loans,
  pawnedItems,
  savingsGoals,
  personalSpendingBudgetCents,
  month,
}: {
  income: { frequency: string; amountCents: number; date: string }[];
  expenses: { date: string; amountCents: number; category: string }[];
  financePayments: { amountCents: number }[];
  loans: { balanceCents: number; ratePercent: number; method: string; startDate: string; dueDate: string }[];
  pawnedItems: { amountReceivedCents: number; interestRatePercent: number; nextDue: string }[];
  savingsGoals: { monthlyTargetCents: number }[];
  personalSpendingBudgetCents: number;
  month: string;
}) {
  const totalIncome = calcMonthlyIncomeCents(income, month);
  const livingExpenses = calcMonthlyExpensesCents(
    expenses.filter(e => e.category !== 'Personal'),
    month,
  );
  const personalSpentCents = calcMonthlyExpensesCents(expenses.filter(e => e.category === 'Personal'), month);
  const financePaymentsCents = calcFinancePaymentsCents(financePayments);
  const loanInterestCents = calcLoanInterestCents(loans, month);
  const pawnInterestCents = calcPawnInterestCents(pawnedItems, month);
  const personalSpending = Math.max(personalSpentCents, personalSpendingBudgetCents);
  const freeCash = totalIncome - livingExpenses - financePaymentsCents - loanInterestCents - pawnInterestCents;
  const achievableSavingsGoals = savingsGoals.filter(goal => goal.monthlyTargetCents <= freeCash);
  const savingsTargetCents = achievableSavingsGoals.reduce((sum, goal) => sum + goal.monthlyTargetCents, 0);
  const totalOutflow = livingExpenses + financePaymentsCents + loanInterestCents + pawnInterestCents + personalSpending + savingsTargetCents;
  const netPosition = totalIncome - totalOutflow;
  const shortfall = netPosition < 0 ? Math.abs(netPosition) : 0;

  return {
    totalIncome,
    livingExpenses,
    financePaymentsCents,
    loanInterestCents,
    pawnInterestCents,
    savingsTargetCents,
    personalSpending,
    totalOutflow,
    netPosition,
    shortfall,
    freeCash,
    achievableSavingsGoals,
  };
}

export function workedExample() {
  const income = [{ frequency: 'monthly', amountCents: 5_000_000, date: '2026-09-01' }];
  const expenses = Array.from({ length: 30 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    amountCents: 100_000,
    category: 'Food',
  }));
  const financePayments = [{ amountCents: 2_500_000 }];
  const loans: any[] = [];
  const pawnedItems: any[] = [];
  const savingsGoals = [{ monthlyTargetCents: 3_000_000 }];
  const result = calcAnalysis({ income, expenses, financePayments, loans, pawnedItems, savingsGoals, personalSpendingBudgetCents: 0, month: '2026-09' });

  if (result.totalIncome !== 5_000_000) throw new Error(`income mismatch: ${result.totalIncome}`);
  if (result.livingExpenses !== 3_000_000) throw new Error(`livingExpenses mismatch: ${result.livingExpenses}`);
  if (result.financePaymentsCents !== 2_500_000) throw new Error(`finance mismatch: ${result.financePaymentsCents}`);
  if (result.totalOutflow !== 5_500_000) throw new Error(`outflow mismatch: ${result.totalOutflow}`);
  if (result.shortfall !== 500_000) throw new Error(`shortfall mismatch: ${result.shortfall}`);
  if (result.achievableSavingsGoals.length !== 0) throw new Error('goal should be excluded when not possible');

  return result;
}
