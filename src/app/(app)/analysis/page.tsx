'use client';

import React from 'react';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory, calcMonthlyIncome } from '@/store';
import Link from 'next/link';

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

  const rows: { label: string; value: number; bold?: boolean; negative?: boolean }[] = [
    { label: 'Total income', value: totalIncome },
    { label: 'Living expenses', value: livingExpenses },
    { label: 'Finance payments', value: financePayments },
    { label: 'Loan interest', value: loanInterest },
    { label: 'Savings set aside', value: savingsTarget },
    { label: 'Total outflow', value: totalOutflow, bold: true },
    { label: netPosition < 0 ? 'Shortfall' : 'Net position (remaining)', value: Math.abs(netPosition), bold: true, negative: netPosition < 0 },
  ];

  const prevMonth = MONTHS[MONTHS.indexOf(month) - 1];
  const nextMonth = MONTHS[MONTHS.indexOf(month) + 1];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Month selector */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <button onClick={() => prevMonth && dispatch({ type: 'SET_MONTH', month: prevMonth })} disabled={!prevMonth}
          className="text-xl px-2" style={{ color: prevMonth ? 'var(--color-primary)' : 'var(--color-muted)' }}>‹</button>
        <span className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>{MONTH_LABELS[month] || month}</span>
        <button onClick={() => nextMonth && dispatch({ type: 'SET_MONTH', month: nextMonth })} disabled={!nextMonth}
          className="text-xl px-2" style={{ color: nextMonth ? 'var(--color-primary)' : 'var(--color-muted)' }}>›</button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Monthly summary */}
        <div className="card">
          <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Monthly summary</div>
          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.label} className={`flex justify-between text-sm ${row.bold ? 'pt-2 mt-2 border-t' : ''}`} style={{ borderColor: 'var(--color-border)' }}>
                <span className={row.bold ? 'font-semibold' : ''} style={{ color: row.bold ? 'var(--color-text)' : 'var(--color-muted)' }}>{row.label}</span>
                <span
                  className={row.bold ? 'font-bold text-base' : 'font-medium'}
                  style={{ color: row.negative ? 'var(--color-danger)' : row.bold ? 'var(--color-text)' : 'var(--color-text)' }}
                >
                  {row.negative && netPosition < 0 ? '−' : ''}{formatRs(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Status */}
          {shortfall > 0 ? (
            <div className="alert-danger">
              <div className="font-semibold mb-1" style={{ color: 'var(--color-danger)' }}>⚠ Shortfall warning</div>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                You are <strong>{formatRs(shortfall)}</strong> short this month. Borrowing creates a loan with interest.
              </p>
              <button className="mt-3 btn-primary text-sm no-print" style={{ fontSize: 13 }}
                onClick={() => dispatch({ type: 'ADD_LOAN_FROM_SHORTFALL', amount: shortfall, month })}>
                Record as loan →
              </button>
            </div>
          ) : (
            <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
              <div className="font-semibold text-sm" style={{ color: 'var(--color-success)' }}>✓ On track</div>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Remaining money: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(netPosition)}</span>
              </p>
            </div>
          )}

          {/* Next month preview */}
          <div className="card">
            <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Next month preview</div>
            <div className="space-y-2 text-sm">
              {pawnInterest > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted)' }}>Pawn interest due</span>
                  <span className="font-medium">{formatRs(pawnInterest)}</span>
                </div>
              )}
              {fpTotal > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted)' }}>Finance payments</span>
                  <span className="font-medium">{formatRs(fpTotal)}</span>
                </div>
              )}
              {loanInterest > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted)' }}>Loan interest</span>
                  <span className="font-medium">{formatRs(loanInterest)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Projected balance</span>
                <span className="font-bold" style={{ color: projectedBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {projectedBalance < 0 ? '−' : ''}{formatRs(projectedBalance)}
                </span>
              </div>
            </div>
            <Link href="/print/analysis" className="btn-secondary w-full mt-4 text-sm no-print block text-center" style={{ fontSize: 13 }}>
              Export analysis as PDF
            </Link>
          </div>
        </div>

        {/* Where money goes */}
        <div className="card md:col-span-2">
          <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Where the money goes — {MONTH_LABELS[month]}</div>
          {catEntries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No expenses recorded for this month.</p>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium shrink-0" style={{ color: 'var(--color-muted)' }}>{cat}</div>
                  <div className="flex-1 progress-track" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${(amt / maxCat) * 100}%` }} />
                  </div>
                  <div className="w-20 text-right text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(amt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multi-month trend */}
        <div className="card md:col-span-2 no-print">
          <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Income vs. outflow — 3-month trend</div>
          <div className="flex gap-6 items-end" style={{ height: 120 }}>
            {trendData.map(t => (
              <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end" style={{ height: 90 }}>
                  <div
                    className="flex-1 rounded-t"
                    style={{ height: `${(t.income / maxTrend) * 90}px`, background: 'var(--color-success)', opacity: 0.8 }}
                    title={`Income: ${formatRs(t.income)}`}
                  />
                  <div
                    className="flex-1 rounded-t"
                    style={{ height: `${(t.outflow / maxTrend) * 90}px`, background: t.outflow > t.income ? 'var(--color-danger)' : 'var(--color-primary)', opacity: 0.8 }}
                    title={`Outflow: ${formatRs(t.outflow)}`}
                  />
                </div>
                <div className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>{MONTH_LABELS[t.month]?.slice(0, 3)} {t.month.slice(2, 4)}</div>
                <div className="text-xs font-medium text-center" style={{ color: t.net < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {t.net < 0 ? '−' : '+'}{Math.abs(t.net).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-muted)' }}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-success)' }} /> Income</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-primary)' }} /> Outflow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
