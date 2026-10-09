'use client';

import React from 'react';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory } from '@/store';
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Month selector & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Financial Analysis</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Deep-dive breakdown into burn rate, categories, and forecast trends.</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => prevMonth && dispatch({ type: 'SET_MONTH', month: prevMonth })}
            disabled={!prevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-none hover:shadow-sm"
            title="Previous month"
          >
            ←
          </button>
          <span className="px-3 text-xs font-bold text-slate-900 dark:text-slate-100">{MONTH_LABELS[month] || month}</span>
          <button
            onClick={() => nextMonth && dispatch({ type: 'SET_MONTH', month: nextMonth })}
            disabled={!nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-none hover:shadow-sm"
            title="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Monthly summary */}
        <div className="card p-6 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M7 10h10M7 14h6"/></svg>
              <span>Monthly Summary</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {month}
            </span>
          </div>

          <div className="space-y-2.5">
            {rows.map(row => (
              <div
                key={row.label}
                className={`flex justify-between items-center text-xs ${
                  row.bold ? 'pt-3 mt-3 border-t border-slate-200 dark:border-slate-800' : 'py-0.5'
                }`}
              >
                <span className={row.bold ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}>
                  {row.label}
                </span>
                <span
                  className={row.bold ? 'font-extrabold text-sm' : 'font-semibold text-slate-800 dark:text-slate-200'}
                  style={{ color: row.negative ? 'var(--color-danger)' : undefined }}
                >
                  {row.negative && netPosition < 0 ? '−' : ''}{formatRs(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Status Alert */}
          {shortfall > 0 ? (
            <div className="alert-danger p-5">
              <div className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-1.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Shortfall Warning</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                You are currently projected <strong>{formatRs(shortfall)}</strong> short this month. Borrowing will accumulate recurring loan interest.
              </p>
              <button
                className="mt-3.5 btn-primary !min-h-[36px] !py-1.5 !px-3.5 !text-xs font-semibold no-print"
                onClick={() => dispatch({ type: 'ADD_LOAN_FROM_SHORTFALL', amount: shortfall, month })}
              >
                Record as loan →
              </button>
            </div>
          ) : (
            <div className="card p-5 border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 to-transparent">
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>On Track & Healthy</span>
              </div>
              <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">
                Remaining positive cashflow: <span className="font-bold text-slate-900 dark:text-slate-100">{formatRs(netPosition)}</span>
              </p>
            </div>
          )}

          {/* Next month preview */}
          <div className="card p-5 border-slate-200/80 dark:border-slate-800">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Next Month Preview</span>
            </div>
            <div className="space-y-2 text-xs">
              {pawnInterest > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Pawn interest due</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRs(pawnInterest)}</span>
                </div>
              )}
              {fpTotal > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Finance payments</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRs(fpTotal)}</span>
                </div>
              )}
              {loanInterest > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Loan interest</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRs(loanInterest)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">Projected Balance</span>
                <span className={`font-extrabold ${projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {projectedBalance < 0 ? '−' : ''}{formatRs(projectedBalance)}
                </span>
              </div>
            </div>
            <Link href="/print/analysis" className="btn-secondary w-full mt-4 !text-xs !py-2 block text-center no-print">
              Export Analysis as PDF
            </Link>
          </div>
        </div>

        {/* Where money goes */}
        <div className="card p-6 md:col-span-2 border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>
              <span>Expense Distribution — {MONTH_LABELS[month]}</span>
            </div>
          </div>
          {catEntries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No expenses recorded for this month.</p>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{cat}</div>
                  <div className="flex-1 progress-track !h-2.5">
                    <div className="progress-fill" style={{ width: `${(amt / maxCat) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right text-xs font-bold text-slate-900 dark:text-slate-100">{formatRs(amt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multi-month trend */}
        <div className="card p-6 md:col-span-2 no-print border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span>Income vs. Outflow — 3-Month Trend</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" /> Outflow</span>
            </div>
          </div>

          <div className="flex gap-6 items-end pt-4 pb-2" style={{ height: 140 }}>
            {trendData.map(t => (
              <div key={t.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1.5 items-end justify-center" style={{ height: 95 }}>
                  <div
                    className="w-5 rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm"
                    style={{ height: `${Math.max(6, (t.income / maxTrend) * 95)}px`, background: 'var(--color-success)' }}
                    title={`Income: ${formatRs(t.income)}`}
                  />
                  <div
                    className="w-5 rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm"
                    style={{ height: `${Math.max(6, (t.outflow / maxTrend) * 95)}px`, background: t.outflow > t.income ? 'var(--color-danger)' : 'var(--color-primary)' }}
                    title={`Outflow: ${formatRs(t.outflow)}`}
                  />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{MONTH_LABELS[t.month]?.slice(0, 3)} {t.month.slice(2, 4)}</div>
                <div className={`text-[11px] font-bold ${t.net < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {t.net < 0 ? '−' : '+'}{Math.abs(t.net).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
