'use client';

import React from 'react';
import Link from 'next/link';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Icon } from '@/components/ui/Icon';

const MONTHS = ['2026-07', '2026-08', '2026-09'];
const MONTH_LABELS: Record<string, string> = { '2026-07': 'July 2026', '2026-08': 'August 2026', '2026-09': 'September 2026' };

export default function Analysis() {
  const { state, dispatch } = useApp();
  const month = state.selectedMonth;

  const a = calcAnalysis(state, month);
  const { totalIncome, livingExpenses, financePayments, loanInterest, savingsTarget, totalOutflow, netPosition, shortfall, freeCash } = a;

  const catMap = calcExpensesByCategory(state.expenses, month);
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catEntries.map(c => c[1]), 1);

  const pawnInterest = state.pawnedItems.reduce((s, p) => s + Math.round(p.amountReceived * p.interestRate / 100), 0);
  const fpTotal = state.financePayments.reduce((s, f) => s + f.amount, 0);
  const projectedBalance = freeCash - pawnInterest - fpTotal - loanInterest;

  // Multi-month trend data
  const trendData = MONTHS.map(m => {
    const ma = calcAnalysis(state, m);
    return { month: m, income: ma.totalIncome, outflow: ma.totalOutflow, net: ma.netPosition };
  });
  const maxTrend = Math.max(...trendData.map(t => Math.max(t.income, t.outflow)), 1);

  const rows: { label: string; value: number; bold?: boolean; isNet?: boolean }[] = [
    { label: 'Total income', value: totalIncome },
    { label: 'Living expenses', value: livingExpenses },
    { label: 'Finance payments', value: financePayments },
    { label: 'Loan interest', value: loanInterest },
    { label: 'Savings set aside', value: savingsTarget },
    { label: 'Total outflow', value: totalOutflow, bold: true },
    { label: netPosition < 0 ? 'Shortfall' : 'Net position (remaining)', value: netPosition, bold: true, isNet: true },
  ];

  const prevMonth = MONTHS[MONTHS.indexOf(month) - 1];
  const nextMonth = MONTHS[MONTHS.indexOf(month) + 1];

  return (
    <PageContainer width="narrow">
      {/* Month selector & Page Header */}
      <PageHeader
        title="Financial Analysis"
        description="Deep-dive breakdown into burn rate, categories, and forecast trends."
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-hover border border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => prevMonth && dispatch({ type: 'SET_MONTH', month: prevMonth })}
              disabled={!prevMonth}
              className="!p-1.5"
              title="Previous month"
              aria-label="Previous month"
            >
              <Icon name="chevron-left" size={16} />
            </Button>
            <span className="px-3 text-xs font-bold text-text">{MONTH_LABELS[month] || month}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => nextMonth && dispatch({ type: 'SET_MONTH', month: nextMonth })}
              disabled={!nextMonth}
              className="!p-1.5"
              title="Next month"
              aria-label="Next month"
            >
              <Icon name="chevron-right" size={16} />
            </Button>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-5">
        {/* Monthly summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-text flex items-center gap-2">
              <Icon name="analysis" size={16} className="text-primary-text" />
              <span>Monthly Summary</span>
            </div>
            <Badge tone="neutral" size="sm">
              {month}
            </Badge>
          </div>

          <div className="space-y-2.5">
            {rows.map(row => (
              <div
                key={row.label}
                className={`flex justify-between items-center text-xs ${
                  row.bold ? 'pt-3 mt-3 border-t border-border' : 'py-0.5'
                }`}
              >
                <span className={row.bold ? 'font-bold text-text' : 'text-muted'}>
                  {row.label}
                </span>
                <span
                  className={`num ${row.bold ? 'font-extrabold text-sm' : 'font-semibold text-text'} ${
                    row.isNet && row.value < 0 ? 'text-danger-text' : row.isNet && row.value > 0 ? 'text-success-text' : ''
                  }`}
                >
                  {formatRs(row.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Status Alert */}
          {shortfall > 0 ? (
            <div className="p-5 rounded-2xl border border-danger-solid/30 bg-danger-tint/50 text-danger-text">
              <div className="font-bold text-sm flex items-center gap-2 mb-1.5">
                <Icon name="alert" size={18} />
                <span>Shortfall Warning</span>
              </div>
              <p className="text-xs leading-relaxed text-text">
                You are currently projected <strong className="num text-danger-text">{formatRs(shortfall)}</strong> short this month. Borrowing will accumulate recurring loan interest.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3.5"
                onClick={() => dispatch({ type: 'ADD_LOAN_FROM_SHORTFALL', amount: shortfall, month })}
              >
                Record as loan →
              </Button>
            </div>
          ) : (
            <Card className="p-5 border-success-solid/30 bg-success-tint/20">
              <div className="font-bold text-sm text-success-text flex items-center gap-2">
                <Icon name="check" size={18} />
                <span>On Track & Healthy</span>
              </div>
              <p className="text-xs mt-2 text-muted">
                Remaining positive cashflow: <span className="font-bold text-text num">{formatRs(netPosition)}</span>
              </p>
            </Card>
          )}

          {/* Next month preview */}
          <Card className="p-5">
            <div className="font-bold text-sm text-text mb-3 flex items-center gap-2">
              <Icon name="calendar" size={16} className="text-primary-text" />
              <span>Next Month Preview</span>
            </div>
            <div className="space-y-2 text-xs">
              {pawnInterest > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Pawn interest due</span>
                  <span className="font-semibold text-text num">{formatRs(pawnInterest)}</span>
                </div>
              )}
              {fpTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Finance payments</span>
                  <span className="font-semibold text-text num">{formatRs(fpTotal)}</span>
                </div>
              )}
              {loanInterest > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Loan interest</span>
                  <span className="font-semibold text-text num">{formatRs(loanInterest)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-bold text-text">Projected Balance</span>
                <span className={`font-extrabold num ${projectedBalance < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                  {formatRs(projectedBalance)}
                </span>
              </div>
            </div>
            <Link href="/print/analysis" className="w-full mt-4 block text-center no-print">
              <Button variant="secondary" size="sm" className="w-full">
                Export Analysis as PDF
              </Button>
            </Link>
          </Card>
        </div>

        {/* Where money goes */}
        <Card className="p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-text flex items-center gap-2">
              <Icon name="financial" size={16} className="text-primary-text" />
              <span>Expense Distribution — {MONTH_LABELS[month]}</span>
            </div>
          </div>
          {catEntries.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">No expenses recorded for this month.</p>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold text-text shrink-0">{cat}</div>
                  <div className="flex-1">
                    <ProgressBar
                      value={amt}
                      max={maxCat}
                      tone="primary"
                      size="md"
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-bold text-text num">{formatRs(amt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Multi-month trend */}
        <Card className="p-6 md:col-span-2 no-print">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-text flex items-center gap-2">
              <Icon name="analysis" size={16} className="text-primary-text" />
              <span>Income vs. Outflow — 3-Month Trend</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success-solid inline-block" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" /> Outflow
              </span>
            </div>
          </div>

          <div className="flex gap-6 items-end pt-4 pb-2" style={{ height: 140 }}>
            {trendData.map(t => (
              <div key={t.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1.5 items-end justify-center" style={{ height: 95 }}>
                  <div
                    className="w-5 rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm bg-success-solid"
                    style={{ height: `${Math.max(6, (t.income / maxTrend) * 95)}px` }}
                    title={`Income: ${formatRs(t.income)}`}
                  />
                  <div
                    className="w-5 rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm"
                    style={{
                      height: `${Math.max(6, (t.outflow / maxTrend) * 95)}px`,
                      background: t.outflow > t.income ? 'var(--color-danger-solid)' : 'var(--color-primary-500)',
                    }}
                    title={`Outflow: ${formatRs(t.outflow)}`}
                  />
                </div>
                <div className="text-[11px] font-semibold text-muted">
                  {MONTH_LABELS[t.month]?.slice(0, 3)} {t.month.slice(2, 4)}
                </div>
                <div className={`text-[11px] font-bold num ${t.net < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                  {formatRs(t.net)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
