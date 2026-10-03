import React, { useState } from 'react';
import { useApp, formatRs, calcAnalysis, calcExpensesByCategory } from '../store';

type Workspace = 'personal' | 'combined' | string;

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const hasSalary = state.profile.workMode !== 'business';
  const hasBusiness = state.profile.workMode !== 'salary';
  const [workspace, setWorkspace] = useState<Workspace>(hasSalary ? 'personal' : state.companies[0]?.id || 'personal');
  const selectedBusiness = state.companies.find(company => company.id === workspace);

  const workspaces = [
    ...(hasSalary ? [{ id: 'personal', label: 'Personal' }] : []),
    ...(hasBusiness ? state.companies.map(company => ({ id: company.id, label: company.name })) : []),
    ...(state.profile.workMode === 'both' ? [{ id: 'combined', label: 'Combined' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Good morning, {state.profile.name || 'Kasun'}</div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Here is what needs your attention today.</p>
      </div>
      <WorkspaceSwitcher items={workspaces} value={workspace} onChange={setWorkspace} />
      {workspace === 'personal' && <PersonalDashboard />}
      {workspace === 'combined' && <CombinedDashboard />}
      {selectedBusiness && <BusinessHome companyId={selectedBusiness.id} />}
    </div>
  );
}

function WorkspaceSwitcher({ items, value, onChange }: { items: { id: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="workspace-switcher mb-6" aria-label="Workspace">
      {items.map(item => (
        <button key={item.id} className={value === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>{item.label}</button>
      ))}
    </div>
  );
}

function PersonalDashboard() {
  const { state, dispatch } = useApp();
  const [paid, setPaid] = useState<string[]>([]);
  const analysis = calcAnalysis(state, state.selectedMonth);
  const salary = state.employmentProfiles.reduce((sum, job) => sum + job.monthlyGross, 0);
  const deductions = state.employmentProfiles.reduce((sum, job) => sum + job.monthlyDeductions, 0);
  const daysLeft = 12;
  const safeToSpend = Math.max(0, Math.round((salary - deductions - analysis.financePayments - analysis.livingExpenses - analysis.savingsTarget) / daysLeft));
  const forecast = salary - deductions - analysis.totalOutflow;
  const categories = calcExpensesByCategory(state.expenses, state.selectedMonth);
  const budgets = [
    ['Rent', 15000], ['Food', 14000], ['Transport', 6000], ['Utilities', 6000], ['Medical', 4000], ['Personal', 5000],
  ] as const;
  const obligations = [
    ...state.financePayments.map(item => ({ id: item.id, label: `${item.lender} finance payment`, due: `Sep ${item.dueDay}`, amount: item.amount })),
    ...state.pawnedItems.map(item => ({ id: item.id, label: `Pawn interest · ${item.description}`, due: 'Oct 5', amount: Math.round(item.amountReceived * item.interestRate / 100) })),
    { id: 'electricity', label: 'Electricity bill', due: 'Sep 30', amount: 4500 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="hero-stat md:col-span-2">
          <div className="text-sm font-medium text-white/75">Safe to spend today</div>
          <div className="text-3xl md:text-4xl font-bold text-white mt-2">{formatRs(safeToSpend)}</div>
          <div className="text-sm text-white/75 mt-2">After bills, loans, savings, and 12 days left</div>
        </div>
        <div className="card">
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Payday countdown</div>
          <div className="text-3xl font-bold mt-3" style={{ color: 'var(--color-primary)' }}>12 days</div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Payday is September 25</div>
          <div className="progress-track mt-4"><div className="progress-fill" style={{ width: '61%' }} /></div>
        </div>
      </div>

      <div className={`forecast-card ${forecast < 0 ? 'is-behind' : ''}`}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{forecast < 0 ? '↓ Shortfall forecast' : '✓ Month-end forecast'}</div>
          <div className="text-2xl font-bold mt-1" style={{ color: forecast < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {forecast < 0 ? `Shortfall ${formatRs(Math.abs(forecast))}` : `You will have ${formatRs(forecast)} left`}
          </div>
        </div>
        {forecast < 0 && <button className="btn-primary" onClick={() => dispatch({ type: 'ADD_LOAN_FROM_SHORTFALL', amount: Math.abs(forecast), month: state.selectedMonth })}>Record as loan</button>}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Bills and obligations</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Tap a bill when it is paid</div>
            </div>
            <span className="badge-warning">! {obligations.filter(item => !paid.includes(item.id)).length} due</span>
          </div>
          <div className="space-y-2">
            {obligations.length === 0 ? (
              <EmptyState title="No upcoming bills" description="New reminders will appear here." />
            ) : obligations.map(item => {
              const isPaid = paid.includes(item.id);
              return (
                <button key={item.id} className="check-row" onClick={() => setPaid(current => isPaid ? current.filter(id => id !== item.id) : [...current, item.id])}>
                  <span className={`check-box ${isPaid ? 'checked' : ''}`}>{isPaid ? '✓' : ''}</span>
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.label}</span>
                    <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{item.due} · {isPaid ? 'Paid' : 'Reminder on'}</span>
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(item.amount)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Monthly income</div>
          <div className="space-y-3">
            {state.income.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.source}</div>
                  <div className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>{item.frequency}</div>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(item.amount)}</div>
              </div>
            ))}
          </div>
          <button className="btn-secondary w-full mt-5" onClick={() => dispatch({ type: 'SET_PAGE', page: 'financial' })}>Add overtime, bonus, or side income</button>
        </section>
      </div>

      <section className="card">
        <div className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Budget by category</div>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {budgets.map(([label, limit]) => {
            const spent = categories[label] || 0;
            const percent = Math.min(100, Math.round((spent / limit) * 100));
            const behind = spent > limit;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--color-text)' }}>{label}</span>
                  <span style={{ color: behind ? 'var(--color-danger)' : 'var(--color-muted)' }}>{behind ? '! Over limit · ' : ''}{formatRs(spent)} / {formatRs(limit)}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%`, background: behind ? 'var(--color-danger)' : undefined }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="badge-success">✓ Recommended</span>
          <div className="font-semibold mt-3" style={{ color: 'var(--color-text)' }}>Build an emergency fund</div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Start with three months of essential expenses: {formatRs(180000)}.</p>
        </div>
        <button className="btn-primary" onClick={() => dispatch({ type: 'SET_PAGE', page: 'goals' })}>Use this goal</button>
      </section>
    </div>
  );
}

function BusinessHome({ companyId }: { companyId: string }) {
  const { state, dispatch } = useApp();
  const company = state.companies.find(item => item.id === companyId)!;
  const branches = state.businessBranches.filter(branch => branch.companyId === companyId);
  const totals = branches.map(branch => {
    const revenue = branch.entries.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    const costs = branch.entries.filter(entry => entry.type !== 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    return { branch, revenue, costs, profit: revenue - costs, progress: Math.round((revenue / branch.monthlyTarget) * 100) };
  }).sort((a, b) => b.progress - a.progress);
  const revenue = totals.reduce((sum, item) => sum + item.revenue, 0);
  const costs = totals.reduce((sum, item) => sum + item.costs, 0);
  const target = branches.reduce((sum, branch) => sum + branch.monthlyTarget, 0);
  const projection = Math.round(revenue * 3.9);
  const behind = projection < target;

  return (
    <div className="space-y-5">
      <div className="hero-stat">
        <div className="text-sm text-white/75">This month’s profit · {company.name}</div>
        <div className="text-3xl md:text-4xl font-bold text-white mt-2">{formatRs(revenue - costs)}</div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/15">
          <div><div className="text-xs text-white/70">Revenue</div><div className="font-semibold text-white">{formatRs(revenue)}</div></div>
          <div><div className="text-xs text-white/70">Costs</div><div className="font-semibold text-white">{formatRs(costs)}</div></div>
        </div>
      </div>
      <ProjectionCard actual={revenue} projected={projection} target={target} behind={behind} reason={behind ? `${totals.at(-1)?.branch.name || 'One branch'} is down 18% vs last month` : 'All branches are meeting their daily pace'} />
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Branch ranking</div>
          <button className="btn-ghost" onClick={() => dispatch({ type: 'SET_PAGE', page: 'advanced' })}>Manage branches</button>
        </div>
        <div className="space-y-3">
          {totals.map((item, index) => (
            <div key={item.branch.id} className="branch-rank">
              <span className="rank-number">{index + 1}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.branch.name}</span>
                <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{formatRs(item.revenue)} revenue · {formatRs(item.profit)} profit</span>
              </span>
              <StatusChip progress={item.progress} />
            </div>
          ))}
        </div>
      </div>
      <button className="btn-primary w-full md:w-auto" onClick={() => dispatch({ type: 'SET_PAGE', page: 'advanced' })}>Open business workspace</button>
    </div>
  );
}

function CombinedDashboard() {
  const { state, dispatch } = useApp();
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawAmount, setDrawAmount] = useState('');
  const [companyId, setCompanyId] = useState(state.companies[0]?.id || '');
  const analysis = calcAnalysis(state, state.selectedMonth);
  const salary = state.employmentProfiles.reduce((sum, job) => sum + job.monthlyGross - job.monthlyDeductions, 0);
  const draws = state.ownerDraws.filter(draw => draw.date.startsWith(state.selectedMonth)).reduce((sum, draw) => sum + draw.amount, 0);
  const net = salary + draws - analysis.livingExpenses - analysis.financePayments - analysis.savingsTarget;
  const totalIncome = Math.max(1, salary + draws);
  const saveDraw = () => {
    if (Number(drawAmount) <= 0 || !companyId) return;
    dispatch({ type: 'ADD_OWNER_DRAW', entry: { id: 'draw_' + Date.now(), companyId, amount: Number(drawAmount), date: '2026-09-28' } });
    setDrawAmount('');
    setDrawOpen(false);
  };
  const breakdown = [
    ['Salary', salary], ['Business draws', draws], ['Personal expenses', -analysis.livingExpenses], ['Loans', -analysis.financePayments], ['Savings', -analysis.savingsTarget],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="hero-stat">
        <div className="text-sm text-white/75">Monthly net position</div>
        <div className="text-3xl md:text-4xl font-bold text-white mt-2">{formatRs(net)}</div>
        <div className="text-sm text-white/75 mt-2">{net >= 0 ? '✓ On track after expenses, loans, and savings' : '↓ Behind after planned outflows'}</div>
      </div>
      <div className="card">
        <div className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Where your personal income comes from</div>
        <div className="stacked-bar">
          <span style={{ width: `${(salary / totalIncome) * 100}%` }} />
          <span style={{ width: `${(draws / totalIncome) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-5 mt-3 text-sm" style={{ color: 'var(--color-muted)' }}>
          <span>Salary {formatRs(salary)}</span><span>Business draws {formatRs(draws)}</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {breakdown.map(([label, value]) => (
          <button key={label} className="card text-left">
            <span className="text-xs block" style={{ color: 'var(--color-muted)' }}>{label}</span>
            <span className="text-base font-semibold block mt-1" style={{ color: value < 0 ? 'var(--color-text)' : 'var(--color-primary)' }}>{formatRs(value)}</span>
          </button>
        ))}
      </div>
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Move business money to personal</div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Use an owner’s draw so money is counted once and business accounts stay separate.</p>
        </div>
        <button className="btn-primary" onClick={() => setDrawOpen(true)}>Record owner’s draw</button>
      </div>
      <div className="card">
        <div className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Combined goals</div>
        <div className="space-y-4">
          <GoalRow tag="Personal" title="Emergency fund" value={40} />
          <GoalRow tag="Business" title="Lanka Bakes monthly revenue" value={64} />
          <GoalRow tag="Both" title="Increase total net income" value={72} />
        </div>
      </div>
      {drawOpen && (
        <div className="modal-overlay" onClick={() => setDrawOpen(false)}>
          <div className="quick-sheet" onClick={event => event.stopPropagation()}>
            <div className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Record owner’s draw</div>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-muted)' }}>This becomes personal income and reduces available business cash.</p>
            <label className="form-label">From business</label>
            <select className="form-input mb-4" value={companyId} onChange={event => setCompanyId(event.target.value)}>
              {state.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <label className="form-label">Amount</label>
            <div className="money-input"><span>Rs.</span><input inputMode="numeric" autoFocus value={drawAmount} onChange={event => setDrawAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
            <button className="btn-primary w-full mt-5" onClick={saveDraw}>Move to personal income</button>
            <button className="btn-ghost w-full mt-2" onClick={() => setDrawOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectionCard({ actual, projected, target, behind, reason }: { actual: number; projected: number; target: number; behind: boolean; reason: string }) {
  const max = Math.max(projected, target, 1);
  return (
    <div className={`card projection-card ${behind ? 'is-behind' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={behind ? 'badge-danger' : 'badge-success'}>{behind ? '↓ Behind target' : '✓ On track'}</span>
          <div className="font-semibold mt-3" style={{ color: 'var(--color-text)' }}>At this pace you will reach {formatRs(projected)} of your {formatRs(target)} monthly target</div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{reason}</p>
        </div>
      </div>
      <div className="mini-chart mt-5" aria-label="Actual, projected, and target chart">
        <span className="actual" style={{ height: `${Math.max(8, actual / max * 100)}%` }}><i>Actual</i></span>
        <span className="projected" style={{ height: `${projected / max * 100}%` }}><i>Projected</i></span>
        <span className="target" style={{ height: `${target / max * 100}%` }}><i>Target</i></span>
      </div>
    </div>
  );
}

function StatusChip({ progress }: { progress: number }) {
  if (progress >= 75) return <span className="badge-success">✓ On track</span>;
  if (progress >= 45) return <span className="badge-warning">! At risk</span>;
  return <span className="badge-danger">↓ Behind</span>;
}

function GoalRow({ tag, title, value }: { tag: string; title: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 mb-2">
        <span className="text-sm" style={{ color: 'var(--color-text)' }}><span className="badge-muted mr-2">{tag}</span>{title}</span>
        <strong className="text-sm" style={{ color: 'var(--color-primary)' }}>{value}%</strong>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="text-center py-8"><div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{title}</div><div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{description}</div></div>;
}
