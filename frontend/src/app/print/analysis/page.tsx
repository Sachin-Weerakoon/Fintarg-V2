'use client';

import React from 'react';
import Link from 'next/link';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory } from '@/store';

const MONTH_LABELS: Record<string, string> = {
  '2026-07': 'July 2026',
  '2026-08': 'August 2026',
  '2026-09': 'September 2026',
};

export default function PrintAnalysisPage() {
  const { state } = useApp();
  const month = state.selectedMonth;
  const a = calcAnalysis(state, month);
  const { totalIncome, livingExpenses, financePayments, loanInterest, savingsTarget, totalOutflow, netPosition, freeCash } = a;

  const catMap = calcExpensesByCategory(state.expenses, month);
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catEntries.map(c => c[1]), 1);

  const pawnInterest = state.pawnedItems.reduce((s, p) => s + Math.round(p.amountReceived * p.interestRate / 100), 0);
  const fpTotal = state.financePayments.reduce((s, f) => s + f.amount, 0);
  const projectedBalance = freeCash - pawnInterest - fpTotal - loanInterest;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 font-sans text-slate-900 bg-white">
      {/* Top action bar - hidden during print */}
      <div className="no-print mb-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <Link
          href="/analysis"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Interactive Analysis
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Document Header */}
      <div className="border-b-2 border-slate-800 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-black flex items-center justify-center text-sm">
                F
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">FINTARG</h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
              Personal & Business Financial Statement
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900">Period: {MONTH_LABELS[month] || month}</div>
            <div>Generated: {new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="text-[11px] text-slate-400">Ref: FNT-EXP-{month.replace('-', '')}</div>
          </div>
        </div>

        {/* User Identity Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Account Holder</span>
            <span className="font-bold text-slate-800">{state.profile.name || 'Personal Account'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">NIC / ID</span>
            <span className="font-semibold text-slate-800">{state.profile.nicNumber || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Primary Bank</span>
            <span className="font-semibold text-slate-800">{state.profile.bankName || 'Standard Bank'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Earning Profile</span>
            <span className="font-semibold text-slate-800 capitalize">{state.profile.workMode || 'Personal'}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Executive Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Income</div>
          <div className="text-xl font-bold text-teal-700 mt-1">{formatRs(totalIncome)}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Outflow</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatRs(totalOutflow)}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Position</div>
          <div className={`text-xl font-bold mt-1 ${netPosition < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatRs(netPosition)}
          </div>
        </div>
      </div>

      {/* Ledger Breakdown Table */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-200 pb-2">
          Monthly Cash Flow Breakdown
        </h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-500">
              <th className="py-2.5 font-bold">Category Item</th>
              <th className="py-2.5 font-bold">Classification</th>
              <th className="py-2.5 font-bold text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 font-medium text-slate-800">Total Monthly Income</td>
              <td className="py-2 text-slate-500">Inflows (Salary, Business, Other)</td>
              <td className="py-2 text-right font-semibold text-teal-700">{formatRs(totalIncome)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-slate-800">Living Expenses</td>
              <td className="py-2 text-slate-500">Operational & Household</td>
              <td className="py-2 text-right font-semibold text-slate-700">{formatRs(livingExpenses)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-slate-800">Finance & Lease Installments</td>
              <td className="py-2 text-slate-500">Fixed Obligations</td>
              <td className="py-2 text-right font-semibold text-slate-700">{formatRs(financePayments)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-slate-800">Loan & Pawn Interest</td>
              <td className="py-2 text-slate-500">Debt Servicing</td>
              <td className="py-2 text-right font-semibold text-slate-700">{formatRs(loanInterest + pawnInterest)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-slate-800">Target Savings Allocation</td>
              <td className="py-2 text-slate-500">Goal Reserve</td>
              <td className="py-2 text-right font-semibold text-slate-700">{formatRs(savingsTarget)}</td>
            </tr>
            <tr className="border-t-2 border-slate-300 font-bold bg-slate-50/50">
              <td className="py-2.5 text-slate-900">Total Outflow & Reserves</td>
              <td className="py-2.5 text-slate-500">Aggregated Deductions</td>
              <td className="py-2.5 text-right text-slate-900">{formatRs(totalOutflow)}</td>
            </tr>
            <tr className="border-t border-slate-300 font-bold bg-slate-100/70">
              <td className="py-3 text-slate-900">Final Net Balance</td>
              <td className="py-3 text-slate-500">Free Cash / Deficit</td>
              <td className={`py-3 text-right text-sm ${netPosition < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatRs(netPosition)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expense Categories Distribution */}
      {catEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-200 pb-2">
            Expense Allocation by Category
          </h2>
          <div className="space-y-2">
            {catEntries.map(([cat, amt]) => {
              const pct = totalOutflow > 0 ? Math.round((amt / totalOutflow) * 100) : 0;
              return (
                <div key={cat} className="flex items-center text-xs justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 w-40">{cat}</span>
                  <div className="flex-1 mx-4 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, (amt / maxCat) * 100))}%` }}
                    />
                  </div>
                  <span className="text-slate-500 w-12 text-right">{pct}%</span>
                  <span className="font-bold text-slate-800 w-28 text-right">{formatRs(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projection summary */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs flex justify-between items-center mb-8">
        <div>
          <span className="font-bold text-slate-800 block">Forecast Projected Balance</span>
          <span className="text-slate-500">Free cash after ongoing commitments, lease installments, and loan interest</span>
        </div>
        <span className={`text-base font-extrabold ${projectedBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {formatRs(projectedBalance)}
        </span>
      </div>

      {/* Document Sign-off Footer */}
      <div className="mt-12 pt-6 border-t border-slate-300 text-[11px] text-slate-500 flex justify-between items-center">
        <div>Generated via Fintarg Financial Management Platform · raxwo.net</div>
        <div className="text-right">Official Record Copy</div>
      </div>
    </div>
  );
}
