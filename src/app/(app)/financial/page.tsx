'use client';
import { useState } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '@/store';

type Tab = 'income' | 'expenses' | 'finance' | 'loans' | 'pawned';

const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];

export default function Financial() {
  const [tab, setTab] = useState<Tab>('expenses');
  const { state, dispatch } = useApp();
  const [month, setMonth] = useState(state.selectedMonth);

  const months = Array.from(new Set(state.expenses.map(e => e.date.slice(0, 7)))).sort().slice(-3);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Month:</span>
        <div className="flex gap-1">
          {months.map(m => (
            <button key={m} onClick={() => setMonth(m)} className="tab-btn" style={{ padding: '4px 12px', fontSize: 12, minHeight: 32, background: month === m ? 'var(--color-primary)' : 'transparent', color: month === m ? '#fff' : 'var(--color-muted)' }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {(['income', 'expenses', 'finance', 'loans', 'pawned'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="text-center py-8"><div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{title}</div><div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{description}</div></div>;
}

function IncomeTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  type IncomeForm = { source: string; type: 'salary' | 'business' | 'other'; amount: string; frequency: 'monthly' | 'weekly' | 'daily' | 'one-time'; date: string };
  const [form, setForm] = useState<IncomeForm>({ source: '', type: 'salary', amount: '', frequency: 'monthly', date: new Date().toISOString().slice(0, 10) });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

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

  const totalMonthly = state.income.reduce((s, i) => {
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
                <button className="btn-ghost text-xs" onClick={() => { setEditId(i.id); setForm({ source: i.source, type: i.type, amount: String(i.amount), frequency: i.frequency, date: i.date }); }} title="Edit">✎</button>
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
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'salary' | 'business' | 'other' }))}>
              <option value="salary">Salary</option><option value="business">Business</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50,000" /></div>
          <div>
            <label className="form-label">Frequency</label>
            <select className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as 'monthly' | 'weekly' | 'daily' | 'one-time' }))}>
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
  const byDay: Record<string, number> = {};
  monthExp.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];
  const filtered = monthExp.filter(e => catFilter === 'All' || e.category === catFilter).sort((a, b) => b.date.localeCompare(a.date));

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
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{ label: 'This month', value: formatRs(monthTotal) }, { label: 'Days left', value: '12' }, { label: 'Avg/day', value: formatRs(monthTotal / 30) }].map(item => (
            <div key={item.label} className="card text-center py-3">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{item.label}</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <select className="form-input w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No expenses" description="Add your first expense to start tracking." />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Category</th><th>Note</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--color-muted)' }}>{e.date}</td>
                    <td className="font-medium" style={{ color: 'var(--color-text)' }}>{e.category}</td>
                    <td style={{ color: 'var(--color-muted)' }}>{e.note}</td>
                    <td className="text-right font-medium" style={{ color: 'var(--color-text)' }}>{formatRs(e.amount)}</td>
                    <td className="text-center">
                      <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_EXPENSE', id: e.id }); }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
          <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="2,500" /></div>
          <div><label className="form-label">Note</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Groceries" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} /><label className="text-xs" style={{ color: 'var(--color-muted)' }}>Recurring monthly</label></div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>{editId ? 'Update' : 'Save expense'}</button>
            {editId && <button className="btn-secondary" onClick={() => { setEditId(null); setForm({ date: month + '-' + new Date().toISOString().slice(8, 10), category: 'Food', amount: '', note: '', recurring: false }); }}>Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ lender: '', amount: '', dueDay: '', monthsRemaining: '' });
  const submit = () => {
    if (!form.lender || !form.amount) return;
    dispatch({ type: 'ADD_FINANCE_PAYMENT', entry: { id: 'fp_' + Date.now(), lender: form.lender, amount: Number(form.amount), dueDay: Number(form.dueDay) || 1, monthsRemaining: Number(form.monthsRemaining) || 1 } });
    setForm({ lender: '', amount: '', dueDay: '', monthsRemaining: '' });
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Finance payments</div>
        {state.financePayments.length === 0 ? <EmptyState title="No finance payments" description="Add hire purchase or loan payments." /> : (
          <div className="space-y-2">
            {state.financePayments.map(fp => (
              <div key={fp.id} className="card flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{fp.lender}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Due day {fp.dueDay} · {fp.monthsRemaining} months left</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{formatRs(fp.amount)}</span>
                  <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_FINANCE_PAYMENT', id: fp.id }); }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add finance payment</div>
        <div className="space-y-3">
          <div><label className="form-label">Lender</label><input className="form-input" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder="People's Bank" /></div>
          <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="25,000" /></div>
          <div><label className="form-label">Due day</label><input className="form-input" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} placeholder="10" /></div>
          <div><label className="form-label">Months remaining</label><input className="form-input" type="number" value={form.monthsRemaining} onChange={e => setForm(f => ({ ...f, monthsRemaining: e.target.value }))} placeholder="18" /></div>
          <button className="btn-primary w-full" onClick={submit}>Save payment</button>
        </div>
      </div>
    </div>
  );
}

function LoansTab() {
  const { state, dispatch } = useApp();
  type LoanForm = { lender: string; amount: string; rate: string; method: 'simple' | 'compound'; startDate: string; dueDate: string };
  const [form, setForm] = useState<LoanForm>({ lender: '', amount: '', rate: '', method: 'simple', startDate: '', dueDate: '' });
  const submit = () => {
    if (!form.lender || !form.amount) return;
    dispatch({ type: 'ADD_LOAN', entry: { id: 'ln_' + Date.now(), lender: form.lender, principal: Number(form.amount), rate: Number(form.rate) || 0, method: form.method, startDate: form.startDate || new Date().toISOString().slice(0, 10), dueDate: form.dueDate || '', balance: Number(form.amount) } });
    setForm({ lender: '', amount: '', rate: '', method: 'simple', startDate: '', dueDate: '' });
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Loans</div>
        {state.loans.length === 0 ? <EmptyState title="No loans" description="Add a loan to track interest and balance." /> : (
          <div className="space-y-2">
            {state.loans.map(ln => (
              <div key={ln.id} className="card flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{ln.lender}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{ln.method} · {ln.rate}% · Balance {formatRs(ln.balance)}</div>
                </div>
                <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete loan?')) dispatch({ type: 'DELETE_LOAN', id: ln.id }); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add loan</div>
        <div className="space-y-3">
          <div><label className="form-label">Lender</label><input className="form-input" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder="Bank" /></div>
          <div><label className="form-label">Principal (Rs.)</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="100,000" /></div>
          <div><label className="form-label">Interest rate (%)</label><input className="form-input" type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="12" /></div>
          <div>
            <label className="form-label">Method</label>
            <select className="form-input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as 'simple' | 'compound' }))}>
              <option value="simple">Simple</option><option value="compound">Compound</option>
            </select>
          </div>
          <button className="btn-primary w-full" onClick={submit}>Save loan</button>
        </div>
      </div>
    </div>
  );
}

function PawnedTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ description: '', amountReceived: '', interestRate: '', nextDue: '', redemptionDate: '' });
  const submit = () => {
    if (!form.description || !form.amountReceived) return;
    dispatch({ type: 'ADD_PAWNED', entry: { id: 'pw_' + Date.now(), description: form.description, amountReceived: Number(form.amountReceived), interestRate: Number(form.interestRate) || 0, nextDue: form.nextDue || new Date().toISOString().slice(0, 10), redemptionDate: form.redemptionDate || '' } });
    setForm({ description: '', amountReceived: '', interestRate: '', nextDue: '', redemptionDate: '' });
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Pawned items</div>
        {state.pawnedItems.length === 0 ? <EmptyState title="No pawned items" description="Track pawned items and interest." /> : (
          <div className="space-y-2">
            {state.pawnedItems.map(p => (
              <div key={p.id} className="card flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.description}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatRs(p.amountReceived)} · {p.interestRate}% · Due {p.nextDue}</div>
                </div>
                <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_PAWNED', id: p.id }); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add pawned item</div>
        <div className="space-y-3">
          <div><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Gold chain" /></div>
          <div><label className="form-label">Amount received (Rs.)</label><input className="form-input" type="number" value={form.amountReceived} onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))} placeholder="50,000" /></div>
          <div><label className="form-label">Interest rate (%)</label><input className="form-input" type="number" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="2" /></div>
          <div><label className="form-label">Next due date</label><input className="form-input" type="date" value={form.nextDue} onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))} /></div>
          <button className="btn-primary w-full" onClick={submit}>Save item</button>
        </div>
      </div>
    </div>
  );
}
