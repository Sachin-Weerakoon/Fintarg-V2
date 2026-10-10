'use client';

import React from 'react';
import Link from 'next/link';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory } from '@/store';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

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
    <div className="max-w-4xl mx-auto p-6 sm:p-10 font-sans text-text bg-white">
      {/* Top action bar - hidden during print */}
      <div className="no-print mb-8 p-4 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-sm">
        <Link
          href="/analysis"
          className="text-xs font-semibold text-primary-text hover:underline flex items-center gap-1.5"
        >
          <Icon name="arrow-left" size={14} />
          Back to Interactive Analysis
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            iconLeft={<Icon name="download" size={14} />}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable Document Header */}
      <div className="border-b-2 border-text pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-solid text-white font-black flex items-center justify-center text-sm">
                F
              </div>
              <h1 className="text-2xl font-black tracking-tight text-text">FINTARG</h1>
            </div>
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mt-1">
              Personal & Business Financial Statement
            </p>
          </div>
          <div className="text-right text-xs text-muted space-y-1">
            <div className="font-bold text-text">Period: {MONTH_LABELS[month] || month}</div>
            <div>Generated: {new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="text-[11px] text-muted">Ref: FNT-EXP-{month.replace('-', '')}</div>
          </div>
        </div>

        {/* User Identity Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border text-xs">
          <div>
            <span className="text-muted block text-[11px]">Account Holder</span>
            <span className="font-bold text-text">{state.profile.name || 'Personal Account'}</span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">NIC / ID</span>
            <span className="font-semibold text-text">{state.profile.nicNumber || '—'}</span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">Primary Bank</span>
            <span className="font-semibold text-text">{state.profile.bankName || 'Standard Bank'}</span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">Earning Profile</span>
            <span className="font-semibold text-text capitalize">{state.profile.workMode || 'Personal'}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Executive Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border bg-surface-hover/70">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Gross Income</div>
          <div className="text-xl font-bold text-primary-text mt-1">{formatRs(totalIncome)}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface-hover/70">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Outflow</div>
          <div className="text-xl font-bold text-text mt-1">{formatRs(totalOutflow)}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface-hover/70">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Net Position</div>
          <div className={`text-xl font-bold mt-1 ${netPosition < 0 ? 'text-danger-text' : 'text-success-text'}`}>
            {formatRs(netPosition)}
          </div>
        </div>
      </div>

      {/* Ledger Breakdown Table */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text mb-3 border-b border-border pb-2">
          Monthly Cash Flow Breakdown
        </h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2.5 font-bold">Category Item</th>
              <th className="py-2.5 font-bold">Classification</th>
              <th className="py-2.5 font-bold text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-2 font-medium text-text">Total Monthly Income</td>
              <td className="py-2 text-muted">Inflows (Salary, Business, Other)</td>
              <td className="py-2 text-right font-semibold text-primary-text">{formatRs(totalIncome)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-text">Living Expenses</td>
              <td className="py-2 text-muted">Operational & Household</td>
              <td className="py-2 text-right font-semibold text-text">{formatRs(livingExpenses)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-text">Finance & Lease Installments</td>
              <td className="py-2 text-muted">Fixed Obligations</td>
              <td className="py-2 text-right font-semibold text-text">{formatRs(financePayments)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-text">Loan & Pawn Interest</td>
              <td className="py-2 text-muted">Debt Servicing</td>
              <td className="py-2 text-right font-semibold text-text">{formatRs(loanInterest + pawnInterest)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-text">Target Savings Allocation</td>
              <td className="py-2 text-muted">Goal Reserve</td>
              <td className="py-2 text-right font-semibold text-text">{formatRs(savingsTarget)}</td>
            </tr>
            <tr className="border-t-2 border-border font-bold bg-surface-hover/50">
              <td className="py-2.5 text-text">Total Outflow & Reserves</td>
              <td className="py-2.5 text-muted">Aggregated Deductions</td>
              <td className="py-2.5 text-right text-text">{formatRs(totalOutflow)}</td>
            </tr>
            <tr className="border-t border-border font-bold bg-surface-hover/80">
              <td className="py-3 text-text">Final Net Balance</td>
              <td className="py-3 text-muted">Free Cash / Deficit</td>
              <td className={`py-3 text-right text-sm ${netPosition < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                {formatRs(netPosition)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expense Categories Distribution */}
      {catEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text mb-3 border-b border-border pb-2">
            Expense Allocation by Category
          </h2>
          <div className="space-y-2">
            {catEntries.map(([cat, amt]) => {
              const pct = totalOutflow > 0 ? Math.round((amt / totalOutflow) * 100) : 0;
              return (
                <div key={cat} className="flex items-center text-xs justify-between py-1 border-b border-border/60">
                  <span className="font-semibold text-text w-40">{cat}</span>
                  <div className="flex-1 mx-4 bg-surface-hover h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-solid h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, (amt / maxCat) * 100))}%` }}
                    />
                  </div>
                  <span className="text-muted w-12 text-right">{pct}%</span>
                  <span className="font-bold text-text w-28 text-right">{formatRs(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projection summary */}
      <div className="p-4 rounded-xl border border-border bg-surface-hover/50 text-xs flex justify-between items-center mb-8">
        <div>
          <span className="font-bold text-text block">Forecast Projected Balance</span>
          <span className="text-muted">Free cash after ongoing commitments, lease installments, and loan interest</span>
        </div>
        <span className={`text-base font-extrabold ${projectedBalance < 0 ? 'text-danger-text' : 'text-success-text'}`}>
          {formatRs(projectedBalance)}
        </span>
      </div>

      {/* Document Sign-off Footer */}
      <div className="mt-12 pt-6 border-t border-border text-[11px] text-muted flex justify-between items-center">
        <div>Generated via Fintarg Financial Management Platform · raxwo.net</div>
        <div className="text-right">Official Record Copy</div>
      </div>
    </div>
  );
}
