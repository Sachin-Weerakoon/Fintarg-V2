'use client';
import Link from 'next/link';
import { useApp, calcMonthlyIncome, calcMonthlyExpenses, formatRs } from '@/store';

function MetricCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const toneMap = {
    default: { background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.18)', color: 'var(--color-text)' },
    success: { background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.22)', color: 'var(--color-text)' },
    warning: { background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.22)', color: 'var(--color-text)' },
    danger: { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.22)', color: 'var(--color-text)' },
  };

  return (
    <div className="rounded-2xl p-4" style={toneMap[tone]}>
      <div className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted)' }}>{label}</div>
      <div className="mt-3 text-2xl font-semibold" style={{ color: toneMap[tone].color }}>{value}</div>
      <div className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>{detail}</div>
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
    ...(state.income.length === 0 ? ['Add your main income source so the dashboard can project cash flow.'] : []),
    ...(state.expenses.length === 0 ? ['Add regular expenses to track your monthly burn.'] : []),
    ...(state.savingsGoals.length === 0 ? ['Create a savings goal to turn your plan into action.'] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-5">
        <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Good morning</div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Here is what needs your attention today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Income" value={formatRs(monthlyIncome)} detail={`for ${selectedMonth}`} tone="success" />
        <MetricCard label="Expenses" value={formatRs(monthlyExpenses)} detail={`for ${selectedMonth}`} tone="warning" />
        <MetricCard label="Net" value={formatRs(netPosition)} detail={netPosition >= 0 ? 'positive cash flow' : 'watch spending'} tone={netPosition >= 0 ? 'success' : 'danger'} />
        <MetricCard label="Goals" value={String(activeGoals)} detail={activeGoals === 0 ? 'all goals covered' : 'goals still in progress'} tone={activeGoals === 0 ? 'success' : 'default'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Overview</div>
              <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Your month at a glance</div>
            </div>
            <Link href="/financial" className="btn-primary">Open financials</Link>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(15, 163, 177, 0.08)', border: '1px solid rgba(15, 163, 177, 0.18)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Financial health</div>
              <div className="mt-2 text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(netPosition)}</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                {netPosition >= 0 ? 'This month is currently ahead of your planned spending.' : 'This month is running under your current plan and needs attention.'}
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.map(item => (
                  <div key={item} className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', color: 'var(--color-text)' }}>
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-3 text-sm" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--color-text)' }}>
                Your financial picture looks healthy. Keep momentum by reviewing your plans and reminders.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Next up</div>
            <div className="mt-3 space-y-3">
              {upNext.length > 0 ? upNext.map(item => (
                <div key={item.id} className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)' }}>
                  <div style={{ color: 'var(--color-text)' }}>{item.label}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{item.dueDate}</div>
                </div>
              )) : (
                <div className="text-sm" style={{ color: 'var(--color-muted)' }}>No reminders yet. This is a good time to add a few key dates.</div>
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Quick actions</div>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/financial" className="btn-secondary text-center">Add income or expenses</Link>
              <Link href="/goals" className="btn-secondary text-center">Review savings goals</Link>
              <Link href="/documents" className="btn-secondary text-center">Upload documents</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
