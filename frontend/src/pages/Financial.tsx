import React, { useState } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '../store';
import type { ExpenseEntry, IncomeEntry, Loan } from '../types';

type Tab = 'income' | 'expenses' | 'finance' | 'loans' | 'pawned';

const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];

const MONTHS = ['2026-07', '2026-08', '2026-09'];
const MONTH_LABELS: Record<string, string> = { '2026-07': 'Jul 2026', '2026-08': 'Aug 2026', '2026-09': 'Sep 2026' };

export default function Financial() {
  const [tab, setTab] = useState<Tab>('expenses');
  const { state } = useApp();
  const [month, setMonth] = useState(state.selectedMonth);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Financial Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track your cashflow, recurring bills, loans, and assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Month:</span>
          <div className="inline-flex p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
            {MONTHS.map(m => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  month === m
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {MONTH_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 w-fit">
        {(['income', 'expenses', 'finance', 'loans', 'pawned'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn !py-2 !px-4 !text-xs font-semibold rounded-xl${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'finance' ? 'Finance payments' : t === 'pawned' ? 'Pawned items' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'income' && <IncomeTab month={month} />}
      {tab === 'expenses' && <ExpensesTab month={month} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'loans' && <LoansTab />}
      {tab === 'pawned' && <PawnedTab />}
    </div>
  );
}

function IncomeTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ source: '', type: 'salary' as IncomeEntry['type'], amount: '', frequency: 'monthly' as IncomeEntry['frequency'], date: new Date().toISOString().slice(0, 10) });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const monthlyIncome = state.income.filter(i => i.frequency !== 'one-time' || i.date.startsWith(month));

  const startEdit = (e: IncomeEntry) => {
    setEditId(e.id);
    setForm({ source: e.source, type: e.type, amount: String(e.amount), frequency: e.frequency, date: e.date });
  };

  const submit = () => {
    if (!form.source || !form.amount || Number(form.amount) <= 0) { setError('Source and amount are required.'); return; }
    const entry = { source: form.source, type: form.type, amount: Number(form.amount), frequency: form.frequency, date: form.date };
    if (editId) {
      dispatch({ type: 'UPDATE_INCOME', entry: { ...entry, id: editId } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_INCOME', entry: { ...entry, id: 'i_' + Date.now() } });
    }
    setForm({ source: '', type: 'salary', amount: '', frequency: 'monthly', date: new Date().toISOString().slice(0, 10) });
    setError('');
  };

  const totalMonthly = monthlyIncome.reduce((s, i) => {
    if (i.frequency === 'monthly') return s + i.amount;
    if (i.frequency === 'weekly') return s + i.amount * 4;
    if (i.frequency === 'daily') return s + i.amount * 30;
    if (i.frequency === 'one-time' && i.date.startsWith(month)) return s + i.amount;
    return s;
  }, 0);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Income sources</div>
          <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Monthly total: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(totalMonthly)}</span></div>
        </div>
        {state.income.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>Add your salary to get started.</p>
        ) : (
          <div className="space-y-2">
            {state.income.map(i => (
              <div key={i.id} className="card flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{i.source}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{i.type} · {i.frequency} · {i.date}</div>
                </div>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{formatRs(i.amount)}</div>
                <button className="btn-ghost text-xs" onClick={() => startEdit(i)} title="Edit">✎</button>
                <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete this income entry?')) dispatch({ type: 'DELETE_INCOME', id: i.id }); }} title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit income' : 'Add income source'}</div>
        {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="space-y-3">
          <div><label className="form-label">Source</label><input className="form-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Government Salary" /></div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as IncomeEntry['type'] }))}>
              <option value="salary">Salary</option><option value="business">Business</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50,000" /></div>
          <div>
            <label className="form-label">Frequency</label>
            <select className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as IncomeEntry['frequency'] }))}>
              <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option><option value="one-time">One-time</option>
            </select>
          </div>
          <div><label className="form-label">Date received</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>{editId ? 'Update' : 'Save income'}</button>
            {editId && <button className="btn-secondary" onClick={() => { setEditId(null); setForm({ source: '', type: 'salary', amount: '', frequency: 'monthly', date: new Date().toISOString().slice(0, 10) }); }}>Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpensesTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ date: month + '-' + new Date().toISOString().slice(8, 10), category: 'Food', amount: '', note: '', recurring: false });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const monthExp = state.expenses.filter(e => e.date.startsWith(month));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);

  // Daily totals
  const byDay: Record<string, number> = {};
  monthExp.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
  const weeklyTotal = Object.entries(byDay)
    .filter(([d]) => {
      const dayOfMonth = new Date(d).getDate();
      const now = new Date();
      const weekStart = now.getDate() - now.getDay();
      return dayOfMonth >= weekStart && dayOfMonth <= weekStart + 6;
    })
    .reduce((s, [, v]) => s + v, 0);
  const todayTotal = byDay[new Date().toISOString().slice(0, 10)] || 0;

  // Category breakdown
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];

  const filtered = monthExp.filter(e => catFilter === 'All' || e.category === catFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const startEdit = (e: ExpenseEntry) => {
    setEditId(e.id);
    setForm({ date: e.date, category: e.category, amount: String(e.amount), note: e.note, recurring: e.recurring });
  };

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('Amount must be greater than zero.'); return; }
    const entry = { ...form, amount: Number(form.amount) };
    if (editId) {
      dispatch({ type: 'UPDATE_EXPENSE', entry: { ...entry, id: editId } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_EXPENSE', entry: { ...entry, id: 'e_' + Date.now() } });
    }
    setForm({ date: month + '-' + new Date().toISOString().slice(8, 10), category: 'Food', amount: '', note: '', recurring: false });
    setError('');
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        {/* Totals strip */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Today', value: todayTotal },
            { label: 'This week', value: weeklyTotal },
            { label: 'This month', value: monthTotal },
          ].map(t => (
            <div key={t.label} className="card text-center py-3">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t.label}</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{formatRs(t.value)}</div>
            </div>
          ))}
        </div>

        {/* Category filter + breakdown */}
        <div className="card mb-4 p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className="tab-btn" style={{ padding: '4px 10px', fontSize: 12, minHeight: 28,
                  background: catFilter === c ? 'var(--color-primary)' : 'transparent',
                  color: catFilter === c ? '#fff' : 'var(--color-muted)' }}>
                {c} {catMap[c] ? `(${catMap[c].toLocaleString()})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses table */}
        <div className="card overflow-hidden p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Note</th>
                <th className="text-right">Amount (Rs.)</th><th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--color-muted)' }}>{e.date.slice(5)}</td>
                  <td className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {e.category}
                    {e.recurring && <span className="ml-1 text-xs" style={{ color: 'var(--color-primary)' }}>↻</span>}
                  </td>
                  <td style={{ color: 'var(--color-muted)' }}>{e.note}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--color-text)' }}>{e.amount.toLocaleString()}</td>
                  <td className="text-center">
                    <button className="btn-ghost text-xs mr-1" onClick={() => startEdit(e)} title="Edit">✎</button>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete this expense?')) dispatch({ type: 'DELETE_EXPENSE', id: e.id }); }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-6 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No expenses for this filter.</div>}
          <div className="px-4 py-3 text-right text-sm font-semibold border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            Showing {filtered.length} of {monthExp.length} entries — Month total {formatRs(monthTotal)}
          </div>
        </div>
      </div>

      {/* Add / edit form */}
      <div className="card h-fit">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit expense' : 'Add expense'}</div>
        {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="space-y-3">
          <div><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div>
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="1,000" /></div>
          <div><label className="form-label">Note</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Dinner" /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} /> Recurring monthly ↻
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>{editId ? 'Update' : 'Save expense'}</button>
            {editId && <button className="btn-secondary" onClick={() => { setEditId(null); setForm({ date: month + '-01', category: 'Food', amount: '', note: '', recurring: false }); }}>Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ lender: '', amount: '', dueDay: '10', monthsRemaining: '12' });
  const [error, setError] = useState('');
  const total = state.financePayments.reduce((s, f) => s + f.amount, 0);

  const submit = () => {
    if (!form.lender || !form.amount || Number(form.amount) <= 0) { setError('All fields required, amount > 0.'); return; }
    dispatch({ type: 'ADD_FINANCE_PAYMENT', entry: { id: 'fp_' + Date.now(), lender: form.lender, amount: Number(form.amount), dueDay: Number(form.dueDay), monthsRemaining: Number(form.monthsRemaining) } });
    setForm({ lender: '', amount: '', dueDay: '10', monthsRemaining: '12' });
    setError('');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Finance payments</div>
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Total/mo: <strong style={{ color: 'var(--color-text)' }}>{formatRs(total)}</strong></span>
        </div>
        {state.financePayments.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>No finance payments added.</p>
        ) : (
          <div className="space-y-2">
            {state.financePayments.map(fp => (
              <div key={fp.id} className="card flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{fp.lender}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Due day {fp.dueDay} · {fp.monthsRemaining} months left</div>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(fp.amount)}<span className="text-xs font-normal text-muted">/mo</span></div>
                <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete this payment?')) dispatch({ type: 'DELETE_FINANCE_PAYMENT', id: fp.id }); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card h-fit">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add finance payment</div>
        {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="space-y-3">
          <div><label className="form-label">Lender</label><input className="form-input" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder="People's Bank" /></div>
          <div><label className="form-label">Monthly amount (Rs.)</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><label className="form-label">Due day of month</label><input className="form-input" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} /></div>
          <div><label className="form-label">Months remaining</label><input className="form-input" type="number" min="1" value={form.monthsRemaining} onChange={e => setForm(f => ({ ...f, monthsRemaining: e.target.value }))} /></div>
          <button className="btn-primary w-full" onClick={submit}>Save payment</button>
        </div>
      </div>
    </div>
  );
}

function LoansTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ lender: '', principal: '', rate: '', method: 'simple' as Loan['method'], startDate: new Date().toISOString().slice(0, 10), dueDate: '' });
  const [repayAmounts, setRepayAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const submit = () => {
    if (!form.lender || !form.principal || Number(form.principal) <= 0) { setError('Lender and principal required.'); return; }
    const principal = Number(form.principal);
    dispatch({ type: 'ADD_LOAN', entry: { id: 'l_' + Date.now(), lender: form.lender, principal, rate: Number(form.rate) || 0, method: form.method, startDate: form.startDate, dueDate: form.dueDate, balance: principal } });
    setForm({ lender: '', principal: '', rate: '', method: 'simple', startDate: new Date().toISOString().slice(0, 10), dueDate: '' });
    setError('');
  };

  const recordRepayment = (id: string) => {
    const amt = Number(repayAmounts[id]);
    if (!amt || amt <= 0) return;
    if (confirm(`Record repayment of ${formatRs(amt)}?`)) {
      dispatch({ type: 'RECORD_LOAN_REPAYMENT', id, amount: amt });
      setRepayAmounts(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Loans</div>
        {state.loans.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>No loans recorded.</p>
        ) : (
          <div className="space-y-3">
            {state.loans.map(l => {
              const interest = l.method === 'compound'
                ? Math.round(l.balance * (Math.pow(1 + l.rate / 100, 1) - 1))
                : Math.round(l.balance * l.rate / 100);
              const paidPct = l.balance > 0 ? Math.round(((l.principal - l.balance) / l.principal) * 100) : 100;
              return (
                <div key={l.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{l.lender}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{l.rate}% {l.method} · started {l.startDate}</div>
                    </div>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete loan?')) dispatch({ type: 'DELETE_LOAN', id: l.id }); }}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-xs" style={{ color: 'var(--color-muted)' }}>Balance </span><span className="font-semibold">{formatRs(l.balance)}</span></div>
                    <div><span className="text-xs" style={{ color: 'var(--color-muted)' }}>Monthly interest </span><span className="font-semibold" style={{ color: 'var(--color-warning)' }}>{formatRs(interest)}</span></div>
                  </div>
                  {l.principal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                        <span>Repaid</span><span>{paidPct}%</span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${paidPct}%`, background: 'var(--color-success)' }} /></div>
                    </div>
                  )}
                  {/* Record repayment */}
                  {l.balance > 0 && (
                    <div className="flex gap-2 mt-2">
                      <input
                        className="form-input flex-1"
                        type="number"
                        placeholder="Repayment (Rs.)"
                        value={repayAmounts[l.id] || ''}
                        onChange={e => setRepayAmounts(p => ({ ...p, [l.id]: e.target.value }))}
                      />
                      <button className="btn-primary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => recordRepayment(l.id)}>Record</button>
                    </div>
                  )}
                  {l.balance === 0 && <span className="badge-success">Paid off</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="card h-fit">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add loan</div>
        {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="space-y-3">
          <div><label className="form-label">Lender</label><input className="form-input" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} /></div>
          <div><label className="form-label">Principal (Rs.)</label><input className="form-input" type="number" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} /></div>
          <div><label className="form-label">Interest rate (%/month)</label><input className="form-input" type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
          <div>
            <label className="form-label">Method</label>
            <select className="form-input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as Loan['method'] }))}>
              <option value="simple">Simple interest</option><option value="compound">Compound interest</option>
            </select>
          </div>
          <div><label className="form-label">Start date</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><label className="form-label">Due date</label><input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          <button className="btn-primary w-full" onClick={submit}>Save loan</button>
        </div>
      </div>
    </div>
  );
}

function PawnedTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ description: '', amountReceived: '', interestRate: '', nextDue: '', redemptionDate: '' });
  const [error, setError] = useState('');

  const submit = () => {
    if (!form.description || !form.amountReceived || Number(form.amountReceived) <= 0) { setError('Description and amount required.'); return; }
    dispatch({ type: 'ADD_PAWNED', entry: { id: 'p_' + Date.now(), description: form.description, amountReceived: Number(form.amountReceived), interestRate: Number(form.interestRate) || 0, nextDue: form.nextDue, redemptionDate: form.redemptionDate } });
    setForm({ description: '', amountReceived: '', interestRate: '', nextDue: '', redemptionDate: '' });
    setError('');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Pawned items</div>
        {state.pawnedItems.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>No pawned items.</p>
        ) : (
          <div className="space-y-3">
            {state.pawnedItems.map(p => {
              const interest = Math.round(p.amountReceived * p.interestRate / 100);
              const daysUntilDue = p.nextDue ? Math.round((new Date(p.nextDue).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.description}</div>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_PAWNED', id: p.id }); }}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span style={{ color: 'var(--color-muted)' }}>Received </span><span className="font-medium">{formatRs(p.amountReceived)}</span></div>
                    <div><span style={{ color: 'var(--color-muted)' }}>Interest/mo </span><span className="font-semibold" style={{ color: 'var(--color-warning)' }}>{formatRs(interest)}</span></div>
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Next due </span>
                      <span className="font-medium" style={{ color: daysUntilDue !== null && daysUntilDue <= 7 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {p.nextDue || '—'}{daysUntilDue !== null && daysUntilDue >= 0 && ` (${daysUntilDue}d)`}
                      </span>
                    </div>
                    <div><span style={{ color: 'var(--color-muted)' }}>Redemption </span><span className="font-medium">{p.redemptionDate || '—'}</span></div>
                  </div>
                  <button
                    className="btn-secondary text-xs w-full"
                    style={{ fontSize: 12, padding: '6px' }}
                    onClick={() => { if (confirm('Record interest payment for this month?')) dispatch({ type: 'RECORD_PAWN_PAYMENT', id: p.id }); }}
                  >
                    Record interest payment ({formatRs(interest)})
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="card h-fit">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add pawned item</div>
        {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="space-y-3">
          <div><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Gold chain (22g)" /></div>
          <div><label className="form-label">Amount received (Rs.)</label><input className="form-input" type="number" value={form.amountReceived} onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))} /></div>
          <div><label className="form-label">Interest rate (%/month)</label><input className="form-input" type="number" step="0.01" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} /></div>
          <div><label className="form-label">Next interest due</label><input className="form-input" type="date" value={form.nextDue} onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))} /></div>
          <div><label className="form-label">Redemption date</label><input className="form-input" type="date" value={form.redemptionDate} onChange={e => setForm(f => ({ ...f, redemptionDate: e.target.value }))} /></div>
          <button className="btn-primary w-full" onClick={submit}>Save pawned item</button>
        </div>
      </div>
    </div>
  );
}
