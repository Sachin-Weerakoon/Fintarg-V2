'use client';
import { useState } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';

type Tab = 'expenses' | 'income' | 'finance' | 'loans' | 'pawned';

const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];

export default function Financial() {
  const [tab, setTab] = useState<Tab>('expenses');
  const { state } = useApp();
  const [month, setMonth] = useState(state.selectedMonth);

  const months = Array.from(new Set(state.expenses.map(e => e.date.slice(0, 7)))).sort().slice(-3);

  const tabOptions: { id: Tab; label: string }[] = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'finance', label: 'Finance Payments' },
    { id: 'loans', label: 'Loans' },
    { id: 'pawned', label: 'Pawned Items' },
  ];

  return (
    <PageContainer>
      {/* Top Header */}
      <PageHeader
        title="Financial Ledger"
        description="Track your cashflow, recurring bills, loans, and assets."
        actions={
          months.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Month:</span>
              <SegmentedTabs
                size="sm"
                options={months.map(m => ({ id: m, label: m }))}
                value={month}
                onChange={setMonth}
              />
            </div>
          )
        }
      />

      {/* Main Ledger Tabs */}
      <SegmentedTabs
        options={tabOptions}
        value={tab}
        onChange={setTab}
        size="md"
      />

      {tab === 'income' && <IncomeTab month={month} />}
      {tab === 'expenses' && <ExpensesTab month={month} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'loans' && <LoansTab />}
      {tab === 'pawned' && <PawnedTab />}
    </PageContainer>
  );
}

function IncomeTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  type IncomeForm = { source: string; type: 'salary' | 'business' | 'other'; amount: string; frequency: 'monthly' | 'weekly' | 'daily' | 'one-time'; date: string };
  const [form, setForm] = useState<IncomeForm>({ source: '', type: 'salary', amount: '', frequency: 'monthly', date: new Date().toISOString().slice(0, 10) });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.source || !form.amount || Number(form.amount) <= 0) {
      setError('Source and amount are required.');
      return;
    }
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
          <div className="font-semibold text-sm text-text">Income sources</div>
          <div className="text-sm text-muted">
            Monthly total: <span className="font-semibold text-text num">{formatRs(totalMonthly)}</span>
          </div>
        </div>
        {state.income.length === 0 ? (
          <EmptyState
            title="No income sources"
            helper="Add your salary or business earnings to get started."
          />
        ) : (
          <div className="space-y-2.5">
            {state.income.map(i => (
              <Card key={i.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-text">{i.source}</div>
                  <div className="text-xs text-muted mt-0.5">{i.type} · {i.frequency} · {i.date}</div>
                </div>
                <div className="font-semibold text-sm text-primary-text num">{formatRs(i.amount)}</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditId(i.id);
                      setForm({ source: i.source, type: i.type, amount: String(i.amount), frequency: i.frequency, date: i.date });
                    }}
                    title="Edit"
                    aria-label="Edit income"
                  >
                    <Icon name="edit" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-text hover:text-danger-text"
                    onClick={() => setDeleteConfirmId(i.id)}
                    title="Delete"
                    aria-label="Delete income"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit income' : 'Add income source'}</h3>
        <div className="space-y-3.5">
          <Field id="income-source" label="Source" error={error}>
            <Input
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              placeholder="e.g. Government Salary, Consulting"
            />
          </Field>
          <Field id="income-type" label="Type">
            <Select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as 'salary' | 'business' | 'other' }))}
            >
              <option value="salary">Salary</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field id="income-amount" label="Amount (Rs.)">
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="50,000"
            />
          </Field>
          <Field id="income-frequency" label="Frequency">
            <Select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="one-time">One-time</option>
            </Select>
          </Field>
          <Field id="income-date" label="Date received">
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Income' : 'Save Income'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({ source: '', type: 'salary', amount: '', frequency: 'monthly', date: new Date().toISOString().slice(0, 10) });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Income Source"
          message="Are you sure you want to remove this income source from your ledger?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_INCOME', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

function ExpensesTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ date: month + '-' + new Date().toISOString().slice(8, 10), category: 'Food', amount: '', note: '', recurring: false });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const monthExp = state.expenses.filter(e => e.date.startsWith(month));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];
  const filtered = monthExp.filter(e => catFilter === 'All' || e.category === catFilter).sort((a, b) => b.date.localeCompare(a.date));

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
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
      <div className="md:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'This month', value: formatRs(monthTotal) },
            { label: 'Total items', value: String(filtered.length) },
            { label: 'Avg / day', value: formatRs(monthTotal / 30) },
          ].map(item => (
            <Card key={item.label} className="text-center p-3">
              <div className="text-xs text-muted mb-0.5">{item.label}</div>
              <div className="font-bold text-sm text-text num">{item.value}</div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Category:</span>
            <Select
              className="!w-auto !py-1 !text-xs"
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
            >
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            helper="Add your first expense for this month to track cash outflow."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th className="text-right">Amount</th>
                    <th className="w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td className="text-muted num">{e.date}</td>
                      <td className="font-medium text-text">{e.category}</td>
                      <td className="text-muted">{e.note || '—'}</td>
                      <td className="text-right font-medium text-text num">{formatRs(e.amount)}</td>
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:text-danger-text !p-1"
                          onClick={() => setDeleteConfirmId(e.id)}
                          aria-label="Delete expense"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit expense' : 'Record Expense'}</h3>
        <div className="space-y-3.5">
          <Field id="expense-date" label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field id="expense-category" label="Category">
            <Select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field id="expense-amount" label="Amount (Rs.)" error={error}>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="2,500"
            />
          </Field>
          <Field id="expense-note" label="Note">
            <Input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Supermarket, Electricity bill"
            />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted">
            <input
              type="checkbox"
              className="rounded border-border text-primary-600 focus:ring-primary-600"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
            />
            <span>Recurring monthly</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Expense' : 'Save Expense'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({ date: month + '-' + new Date().toISOString().slice(8, 10), category: 'Food', amount: '', note: '', recurring: false });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Expense"
          message="Are you sure you want to delete this expense record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_EXPENSE', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

function FinanceTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ lender: '', amount: '', dueDay: '', monthsRemaining: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.lender || !form.amount) return;
    dispatch({
      type: 'ADD_FINANCE_PAYMENT',
      entry: {
        id: 'fp_' + Date.now(),
        lender: form.lender,
        amount: Number(form.amount),
        dueDay: Number(form.dueDay) || 1,
        monthsRemaining: Number(form.monthsRemaining) || 1,
      },
    });
    setForm({ lender: '', amount: '', dueDay: '', monthsRemaining: '' });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-sm mb-3 text-text">Finance payments</h3>
        {state.financePayments.length === 0 ? (
          <EmptyState
            title="No finance payments"
            helper="Add hire purchase or lease payments to track monthly obligations."
          />
        ) : (
          <div className="space-y-2.5">
            {state.financePayments.map(fp => (
              <Card key={fp.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-text">{fp.lender}</div>
                  <div className="text-xs text-muted mt-0.5">Due day {fp.dueDay} · {fp.monthsRemaining} months remaining</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-primary-text num">{formatRs(fp.amount)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-text hover:text-danger-text !p-1.5"
                    onClick={() => setDeleteConfirmId(fp.id)}
                    aria-label="Delete payment"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">Add finance payment</h3>
        <div className="space-y-3.5">
          <Field id="fp-lender" label="Lender / Institution">
            <Input
              value={form.lender}
              onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
              placeholder="e.g. People's Bank, Singer"
            />
          </Field>
          <Field id="fp-amount" label="Monthly Payment (Rs.)">
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="25,000"
            />
          </Field>
          <Field id="fp-dueday" label="Due day of month">
            <Input
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
              placeholder="10"
            />
          </Field>
          <Field id="fp-months" label="Months remaining">
            <Input
              type="number"
              value={form.monthsRemaining}
              onChange={e => setForm(f => ({ ...f, monthsRemaining: e.target.value }))}
              placeholder="18"
            />
          </Field>
          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Payment
          </Button>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Finance Payment"
          message="Are you sure you want to remove this finance payment?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_FINANCE_PAYMENT', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

function LoansTab() {
  const { state, dispatch } = useApp();
  type LoanForm = { lender: string; amount: string; rate: string; method: 'simple' | 'compound'; startDate: string; dueDate: string };
  const [form, setForm] = useState<LoanForm>({
    lender: '',
    amount: '',
    rate: '',
    method: 'simple',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.lender || !form.amount) return;
    const startDate = form.startDate || new Date().toISOString().slice(0, 10);
    const defaultDueDate = new Date();
    defaultDueDate.setFullYear(defaultDueDate.getFullYear() + 1);
    const dueDate = form.dueDate || defaultDueDate.toISOString().slice(0, 10);

    dispatch({
      type: 'ADD_LOAN',
      entry: {
        id: 'ln_' + Date.now(),
        lender: form.lender,
        principal: Number(form.amount),
        rate: Number(form.rate) || 0,
        method: form.method,
        startDate,
        dueDate,
        balance: Number(form.amount),
      },
    });
    setForm({ lender: '', amount: '', rate: '', method: 'simple', startDate: new Date().toISOString().slice(0, 10), dueDate: '' });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-sm mb-3 text-text">Loans</h3>
        {state.loans.length === 0 ? (
          <EmptyState
            title="No loans"
            helper="Add a personal or commercial loan to track balance and interest."
          />
        ) : (
          <div className="space-y-2.5">
            {state.loans.map(ln => (
              <Card key={ln.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-text">{ln.lender}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {ln.method} · {ln.rate}% · Balance <span className="num font-semibold text-text">{formatRs(ln.balance)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-text hover:text-danger-text !p-1.5"
                  onClick={() => setDeleteConfirmId(ln.id)}
                  aria-label="Delete loan"
                >
                  <Icon name="trash" size={14} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">Add loan</h3>
        <div className="space-y-3.5">
          <Field id="loan-lender" label="Lender">
            <Input
              value={form.lender}
              onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
              placeholder="e.g. Commercial Bank, Private Loan"
            />
          </Field>
          <Field id="loan-principal" label="Principal Amount (Rs.)">
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="100,000"
            />
          </Field>
          <Field id="loan-rate" label="Interest rate (%)">
            <Input
              type="number"
              value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
              placeholder="12"
            />
          </Field>
          <Field id="loan-method" label="Method">
            <Select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
            >
              <option value="simple">Simple</option>
              <option value="compound">Compound</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-start" label="Start Date">
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field id="loan-due" label="Due Date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </Field>
          </div>
          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Loan
          </Button>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Loan"
          message="Are you sure you want to remove this loan record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_LOAN', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

function PawnedTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    description: '',
    amountReceived: '',
    interestRate: '',
    nextDue: new Date().toISOString().slice(0, 10),
    redemptionDate: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.description || !form.amountReceived) return;
    const nextDue = form.nextDue || new Date().toISOString().slice(0, 10);
    const defaultRedemption = new Date();
    defaultRedemption.setMonth(defaultRedemption.getMonth() + 6);
    const redemptionDate = form.redemptionDate || defaultRedemption.toISOString().slice(0, 10);

    dispatch({
      type: 'ADD_PAWNED',
      entry: {
        id: 'pw_' + Date.now(),
        description: form.description,
        amountReceived: Number(form.amountReceived),
        interestRate: Number(form.interestRate) || 0,
        nextDue,
        redemptionDate,
      },
    });
    setForm({
      description: '',
      amountReceived: '',
      interestRate: '',
      nextDue: new Date().toISOString().slice(0, 10),
      redemptionDate: '',
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-sm mb-3 text-text">Pawned items</h3>
        {state.pawnedItems.length === 0 ? (
          <EmptyState
            title="No pawned items"
            helper="Track pawned gold items, monthly interest rates, and due dates."
          />
        ) : (
          <div className="space-y-2.5">
            {state.pawnedItems.map(p => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-text">{p.description}</div>
                  <div className="text-xs text-muted mt-0.5">
                    <span className="num font-semibold text-text">{formatRs(p.amountReceived)}</span> · {p.interestRate}% · Due {p.nextDue}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-text hover:text-danger-text !p-1.5"
                  onClick={() => setDeleteConfirmId(p.id)}
                  aria-label="Delete item"
                >
                  <Icon name="trash" size={14} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">Add pawned item</h3>
        <div className="space-y-3.5">
          <Field id="pawn-desc" label="Description">
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Gold chain (22g)"
            />
          </Field>
          <Field id="pawn-amount" label="Amount received (Rs.)">
            <Input
              type="number"
              value={form.amountReceived}
              onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))}
              placeholder="50,000"
            />
          </Field>
          <Field id="pawn-rate" label="Interest rate (% per month)">
            <Input
              type="number"
              value={form.interestRate}
              onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
              placeholder="2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pawn-due" label="Next due date">
              <Input
                type="date"
                value={form.nextDue}
                onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))}
              />
            </Field>
            <Field id="pawn-redemption" label="Redemption date">
              <Input
                type="date"
                value={form.redemptionDate}
                onChange={e => setForm(f => ({ ...f, redemptionDate: e.target.value }))}
              />
            </Field>
          </div>
          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Item
          </Button>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Pawned Item"
          message="Are you sure you want to remove this pawned item record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_PAWNED', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
