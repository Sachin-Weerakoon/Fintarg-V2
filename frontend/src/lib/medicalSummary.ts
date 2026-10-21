import type { MedicalExpense } from '@/types';

export interface TypeSummaryRow {
  type: string;
  total: number;
  percent: number;
}

export function summariseByType(expenses: MedicalExpense[]): TypeSummaryRow[] {
  const totalsByType = new Map<string, number>();

  for (const expense of expenses) {
    totalsByType.set(
      expense.type,
      (totalsByType.get(expense.type) ?? 0) + expense.amount
    );
  }

  const rows = Array.from(totalsByType, ([type, total]) => ({
    type,
    total,
    percent: 0,
  })).sort((a, b) => b.total - a.total || a.type.localeCompare(b.type));

  const grandTotal = rows.reduce((total, row) => total + row.total, 0);
  if (grandTotal <= 0 || rows.length === 0) {
    return [];
  }

  let roundedPercentTotal = 0;
  for (const row of rows) {
    row.percent = Math.round((row.total / grandTotal) * 100);
    roundedPercentTotal += row.percent;
  }

  rows[0].percent += 100 - roundedPercentTotal;
  return rows;
}
