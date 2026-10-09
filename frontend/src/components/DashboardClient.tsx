'use client';
import Link from 'next/link';
import { useApp, calcMonthlyIncome, calcMonthlyExpenses, formatRs } from '@/store';

interface MetricProps {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
}

function MetricCard({ label, value, detail, tone = 'default', icon }: MetricProps) {
  const toneStyles = {
    default: {
      border: 'border-slate-200/80 dark:border-slate-800',
      iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      valueColor: 'text-slate-900 dark:text-slate-100',
      tagBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
    success: {
      border: 'border-emerald-200/60 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      tagBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40',
    },
    warning: {
      border: 'border-amber-200/60 dark:border-amber-900/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
      tagBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40',
    },
    danger: {
      border: 'border-rose-200/60 dark:border-rose-900/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
      tagBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40',
    },
  };

  const style = toneStyles[tone];

  return (
    <div className={`card p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.border}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.iconBg}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-bold tracking-tight ${style.valueColor}`}>{value}</div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${style.tagBg}`}>{detail}</span>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const { state } = useApp();
  const selectedMonth = state.selectedMonth || new Date().toISOString().slice(0, 7);
  const monthlyIncome = calcMonthlyIncome(state.income, selectedMonth);
  const monthlyExpenses = calcMonthlyExpenses(state.expenses, selectedMonth);
  const netPosition = monthlyIncome - monthlyExpenses;
  const activeGoals = state.savingsGoals.filter(goal => goal.savedAmount < goal.monthlyTarget).length;
  const upNext = state.reminders.slice(0, 3);
  const recommendations = [
    ...(state.income.length === 0 ? ['Add your primary income source to project monthly cash flow and buffer.'] : []),
    ...(state.expenses.length === 0 ? ['Record your recurring expenses to monitor daily and monthly burn rate.'] : []),
    ...(state.savingsGoals.length === 0 ? ['Set up a savings target to track your progress toward financial freedom.'] : []),
  ];

  const burnRate = monthlyIncome > 0 ? Math.min(100, Math.round((monthlyExpenses / monthlyIncome) * 100)) : 0;
  const userName = state.profile.name || 'Kasun';

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
            <span>Finance Dashboard</span>
            <span>•</span>
            <span>{selectedMonth}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-slate-100">
            Good morning, {userName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Here is your financial pulse and priority items for this month.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/financial" className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Record Entry</span>
          </Link>
          <Link href="/analysis" className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      {/* Primary Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Income"
          value={formatRs(monthlyIncome)}
          detail={`for ${selectedMonth}`}
          tone="success"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
        />
        <MetricCard
          label="Total Expenses"
          value={formatRs(monthlyExpenses)}
          detail={`${burnRate}% of income`}
          tone={burnRate > 85 ? 'danger' : 'warning'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>}
        />
        <MetricCard
          label="Net Position"
          value={formatRs(netPosition)}
          detail={netPosition >= 0 ? 'Surplus buffer' : 'Deficit shortfall'}
          tone={netPosition >= 0 ? 'success' : 'danger'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
        />
        <MetricCard
          label="Active Goals"
          value={String(activeGoals)}
          detail={activeGoals === 0 ? 'All covered' : 'In progress'}
          tone={activeGoals === 0 ? 'success' : 'default'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Column: Financial Health & Breakdown */}
        <div className="space-y-6">
          <div className="card p-6 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Financial Health Center</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${netPosition >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {netPosition >= 0 ? 'On Track' : 'Needs Attention'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated cashflow forecast & risk assessment</p>
              </div>
              <Link href="/financial" className="btn-secondary !text-xs !py-1.5 !px-3">
                Full Details →
              </Link>
            </div>

            {/* Health Meter Container */}
            <div className="rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-blue-500/[0.04]">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Projected Free Cash / Net Buffer</div>
                  <div className={`mt-1 text-3xl font-extrabold tracking-tight ${netPosition >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatRs(netPosition)}
                  </div>
                </div>
                <div className="text-xs font-semibold px-3 py-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-sm">
                  Burn rate: <span className="font-bold text-cyan-600 dark:text-cyan-400">{burnRate}%</span>
                </div>
              </div>

              {/* Cashflow visual split bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>Spent: {formatRs(monthlyExpenses)}</span>
                  <span>Remaining: {formatRs(Math.max(0, netPosition))}</span>
                </div>
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500" style={{ width: `${Math.min(100, burnRate)}%` }} />
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all duration-500" style={{ width: `${Math.max(0, 100 - burnRate)}%` }} />
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {netPosition >= 0
                  ? 'Your income currently exceeds planned outflows. You have a positive buffer to invest toward savings goals.'
                  : 'Spending currently exceeds incoming revenue for this month. Review non-essential expenses to prevent shortfall.'}
              </p>
            </div>

            {/* Smart Suggestions */}
            <div className="mt-5 space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actionable Insights</div>
              {recommendations.length > 0 ? (
                recommendations.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5 font-bold">i</span>
                    <span className="leading-relaxed flex-1">{item}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0 font-bold">✓</span>
                  <span>Financial plan is healthy and balanced. Continue tracking daily expenses to maintain momentum.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Reminders & Quick Actions */}
        <div className="space-y-6">
          {/* Next Up Reminders */}
          <div className="card p-5 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Upcoming Reminders</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {upNext.length} items
              </span>
            </div>

            <div className="space-y-2.5">
              {upNext.length > 0 ? (
                upNext.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-850 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Due:</span>
                        <span className="font-medium text-cyan-600 dark:text-cyan-400">{item.dueDate}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/40 dark:border-cyan-800/40 flex-shrink-0">
                      Pending
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">No scheduled reminders. Add key bill dates in Settings.</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="card p-5 border-slate-200/80 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Quick Actions</span>
            </div>
            <div className="space-y-2">
              <Link
                href="/financial"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  </div>
                  <span>Record Income & Expenses</span>
                </div>
                <span className="text-slate-400 group-hover:text-cyan-600 transition-colors">→</span>
              </Link>

              <Link
                href="/goals"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/></svg>
                  </div>
                  <span>Review Savings Goals</span>
                </div>
                <span className="text-slate-400 group-hover:text-cyan-600 transition-colors">→</span>
              </Link>

              <Link
                href="/documents"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  </div>
                  <span>Manage Document Vault</span>
                </div>
                <span className="text-slate-400 group-hover:text-cyan-600 transition-colors">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
