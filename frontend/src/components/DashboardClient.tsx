'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp, calcMonthlyIncome, calcMonthlyExpenses, formatRs } from '@/store';
import { StatCard } from '@/components/ui/StatCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLocalMonth, getTimeOfDayGreeting } from '@/utils/date';

export default function DashboardClient() {
  const { state } = useApp();
  const [greeting, setGreeting] = useState('Welcome');

  // Compute greeting on client after mount to prevent hydration mismatch
  useEffect(() => {
    setGreeting(getTimeOfDayGreeting());
  }, []);

  const selectedMonth = state.selectedMonth || getLocalMonth();
  const monthlyIncome = calcMonthlyIncome(state.income, selectedMonth);
  const monthlyExpenses = calcMonthlyExpenses(state.expenses, selectedMonth);
  const netPosition = monthlyIncome - monthlyExpenses;
  const upNext = state.reminders.slice(0, 3);
  const hasFinancialData = monthlyIncome > 0 || monthlyExpenses > 0;

  const recommendations = [
    ...(state.income.length === 0 ? ['Add your primary income source to project monthly cash flow and buffer.'] : []),
    ...(state.expenses.length === 0 ? ['Record your recurring expenses to monitor daily and monthly burn rate.'] : []),
    ...(state.savingsGoals.length === 0 ? ['Set up a savings target to track your progress toward financial freedom.'] : []),
  ];

  const burnRate = monthlyIncome > 0 ? Math.min(100, Math.round((monthlyExpenses / monthlyIncome) * 100)) : 0;
  const userName = state.profile?.name?.trim();

  // Liquidity and daily budget calculations
  const totalBankLiquidity = state.bankAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
  const today = new Date();
  const [yStr, mStr] = selectedMonth.split('-');
  const isCurrentMonth = Number(yStr) === today.getFullYear() && Number(mStr) === (today.getMonth() + 1);
  const daysInMonth = new Date(Number(yStr) || today.getFullYear(), Number(mStr) || (today.getMonth() + 1), 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate() + 1) : daysInMonth;
  const recurringObligations = state.financePayments.reduce((s, f) => s + f.amount, 0);
  const freeCashLeft = Math.max(0, monthlyIncome - recurringObligations - monthlyExpenses);
  const dailyBudget = Math.round(freeCashLeft / daysLeft);

  // Determine net position detail
  const netDetail = !hasFinancialData
    ? 'No records yet'
    : netPosition >= 0
    ? 'Surplus buffer'
    : 'Deficit shortfall';
  const netTone = !hasFinancialData ? 'default' : netPosition >= 0 ? 'success' : 'danger';

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        eyebrow={`Finance Dashboard · ${selectedMonth}`}
        title={`${greeting}${userName ? `, ${userName}` : ''}`}
        description="Here is your financial pulse and priority items for this month."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/financial">
              <Button variant="primary" iconLeft={<Icon name="plus" size={16} />}>
                Record Entry
              </Button>
            </Link>
            <Link href="/analysis">
              <Button variant="secondary" iconLeft={<Icon name="analysis" size={16} />}>
                Analytics
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Bank Liquidity"
          value={formatRs(totalBankLiquidity)}
          detail={`${state.bankAccounts.length} accounts connected`}
          tone="default"
          icon={<Icon name="bank" size={18} />}
        />
        <StatCard
          label="Total Income"
          value={formatRs(monthlyIncome)}
          detail={`for ${selectedMonth}`}
          tone="success"
          icon={<Icon name="arrow-up" size={18} />}
        />
        <StatCard
          label="Total Expenses"
          value={formatRs(monthlyExpenses)}
          detail={hasFinancialData ? `${burnRate}% of income` : 'No expenses yet'}
          tone={burnRate > 85 ? 'danger' : 'warning'}
          icon={<Icon name="arrow-down" size={18} />}
        />
        <StatCard
          label="Daily Budget Left"
          value={formatRs(dailyBudget)}
          detail={`${daysLeft} days left in month`}
          tone={dailyBudget > 0 ? 'success' : 'danger'}
          icon={<Icon name="bolt" size={18} />}
        />
        <StatCard
          label="Net Position"
          value={formatRs(netPosition)}
          detail={netDetail}
          tone={netTone}
          icon={<Icon name="wallet" size={18} />}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Column: Financial Health & Breakdown */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-base font-bold text-text flex items-center gap-2">
                  <span>Financial Health Center</span>
                  {!hasFinancialData ? (
                    <Badge tone="neutral" size="sm">Awaiting Data</Badge>
                  ) : netPosition >= 0 ? (
                    <Badge tone="success" size="sm" dot>On Track</Badge>
                  ) : (
                    <Badge tone="danger" size="sm" dot>Needs Attention</Badge>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">Automated cashflow forecast & risk assessment</p>
              </div>
              <Link href="/financial">
                <Button variant="secondary" size="sm" iconRight={<Icon name="arrow-right" size={14} />}>
                  Full Details
                </Button>
              </Link>
            </div>

            {/* Health Meter Container */}
            <div className="rounded-2xl p-5 border border-border bg-surface-hover/50">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-muted">Projected Free Cash / Net Buffer</div>
                  <div className={`mt-1 text-3xl font-extrabold tracking-tight num ${
                    !hasFinancialData ? 'text-text' : netPosition >= 0 ? 'text-text' : 'text-danger-text'
                  }`}>
                    {formatRs(netPosition)}
                  </div>
                </div>
                <div className="text-xs font-semibold px-3 py-1 rounded-xl bg-surface border border-border text-text shadow-sm">
                  Burn rate: <span className="font-bold text-primary-text">{burnRate}%</span>
                </div>
              </div>

              {/* Cashflow visual split bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-muted">
                  <span>Spent: <span className="num font-semibold text-text">{formatRs(monthlyExpenses)}</span></span>
                  <span>Remaining: <span className="num font-semibold text-text">{formatRs(Math.max(0, netPosition))}</span></span>
                </div>
                <div className="h-3 w-full bg-border rounded-full overflow-hidden flex shadow-inner">
                  <div className="h-full bg-danger-solid transition-all duration-500" style={{ width: `${Math.min(100, burnRate)}%` }} />
                  <div className="h-full bg-success-solid transition-all duration-500" style={{ width: `${Math.max(0, 100 - burnRate)}%` }} />
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                {!hasFinancialData
                  ? 'Record your income and expenses to view an automated cashflow forecast and risk assessment.'
                  : netPosition >= 0
                  ? 'Your income currently exceeds planned outflows. You have a positive buffer to invest toward savings goals.'
                  : 'Spending currently exceeds incoming revenue for this month. Review non-essential expenses to prevent shortfall.'}
              </p>
            </div>

            {/* Actionable Insights */}
            <div className="mt-5 space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Actionable Insights</div>
              {recommendations.length > 0 ? (
                recommendations.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-surface-hover/70 border border-border text-xs text-text">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-primary-tint text-primary-text flex-shrink-0 mt-0.5 font-bold">i</span>
                    <span className="leading-relaxed flex-1">{item}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-success-tint/40 border border-success-solid/20 text-xs text-success-text">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center bg-success-tint text-success-text flex-shrink-0 font-bold">✓</span>
                  <span>Financial plan is healthy and balanced. Continue tracking daily expenses to maintain momentum.</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Accounts, Reminders & Quick Actions */}
        <div className="space-y-6">
          {/* Connected Accounts Glance */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-text flex items-center gap-2">
                <Icon name="bank" size={16} className="text-primary-text" />
                <span>Connected Accounts</span>
              </div>
              <Link href="/financial" className="text-xs text-primary-text font-semibold hover:underline">
                Manage
              </Link>
            </div>
            {state.bankAccounts.length === 0 ? (
              <div className="text-xs text-muted py-2">
                No bank accounts linked yet.{' '}
                <Link href="/financial" className="text-primary-text hover:underline">Add an account</Link> to track balances.
              </div>
            ) : (
              <div className="space-y-2">
                {state.bankAccounts.slice(0, 3).map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-hover/30">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-text truncate">{acc.name}</div>
                      <div className="text-[11px] text-muted truncate">
                        {acc.bankName} · •••• {acc.accountNumber ? acc.accountNumber.slice(-4) : '----'}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-text num flex-shrink-0">{formatRs(acc.currentBalance)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Next Up Reminders */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-text flex items-center gap-2">
                <Icon name="bell" size={16} className="text-primary-text" />
                <span>Upcoming Reminders</span>
              </div>
              <Badge tone="neutral" size="sm">
                {upNext.length} items
              </Badge>
            </div>

            <div className="space-y-2.5">
              {upNext.length > 0 ? (
                upNext.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/40 hover:bg-surface-hover transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-text truncate">{item.label}</div>
                      <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                        <span>Due:</span>
                        <span className="font-medium text-primary-text">{item.dueDate}</span>
                      </div>
                    </div>
                    <Badge tone="primary" size="sm">Pending</Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No scheduled reminders"
                  helper="Add key bill dates in Settings to get notified."
                  className="py-6"
                />
              )}
            </div>
          </Card>

          {/* Quick Actions Shortcuts */}
          <Card className="p-5">
            <div className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <Icon name="bolt" size={16} className="text-primary-text" />
              <span>Quick Actions</span>
            </div>
            <div className="space-y-2">
              <Link
                href="/financial"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/50 text-xs font-semibold text-text transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-success-tint text-success-text flex items-center justify-center">
                    <Icon name="financial" size={16} />
                  </div>
                  <span>Record Income & Expenses</span>
                </div>
                <Icon name="arrow-right" size={14} className="text-muted group-hover:text-primary-text transition-colors" />
              </Link>

              <Link
                href="/goals"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/50 text-xs font-semibold text-text transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary-text flex items-center justify-center">
                    <Icon name="target" size={16} />
                  </div>
                  <span>Review Savings Goals</span>
                </div>
                <Icon name="arrow-right" size={14} className="text-muted group-hover:text-primary-text transition-colors" />
              </Link>

              <Link
                href="/documents"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/50 text-xs font-semibold text-text transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-surface-hover text-text flex items-center justify-center">
                    <Icon name="documents" size={16} />
                  </div>
                  <span>Manage Document Vault</span>
                </div>
                <Icon name="arrow-right" size={14} className="text-muted group-hover:text-primary-text transition-colors" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
