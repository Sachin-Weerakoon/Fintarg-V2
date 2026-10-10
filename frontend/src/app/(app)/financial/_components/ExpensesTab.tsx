'use client';
import { useState, useMemo } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PaymentMethodField, PaymentMethod } from '@/components/ui/PaymentMethodField';
import { BankSelect } from '@/components/ui/BankSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import { EXPENSE_CATS } from '@/utils/bankData';

export function ExpensesTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    date: month + '-' + new Date().toISOString().slice(8, 10),
    category: 'Food',
    amount: '',
    note: '',
    recurring: false,
    paymentMethod: 'cash' as PaymentMethod,
    bankAccountId: '',
    cardId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const monthExp = state.expenses.filter(e => e.date.startsWith(month));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];
  const filtered = monthExp
    .filter(e => catFilter === 'All' || e.category === catFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Real days-left & daily budget computation
  const [yearStr, monthStr] = month.split('-');
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const isCurrentMonth = Number(yearStr) === currentYear && Number(monthStr) === currentMonthNum;
  const daysInMonth = new Date(Number(yearStr) || currentYear, Number(monthStr) || currentMonthNum, 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate() + 1) : daysInMonth;

  const totalMonthlyIncome = state.income.reduce((s, i) => {
    if (i.frequency === 'monthly') return s + i.amount;
    if (i.frequency === 'weekly') return s + i.amount * 4;
    if (i.frequency === 'daily') return s + i.amount * 30;
    return s;
  }, 0);
  const recurringObligations = state.financePayments.reduce((s, f) => s + f.amount, 0);
  const remainingBudget = Math.max(0, totalMonthlyIncome - recurringObligations - monthTotal);
  const dailyBudget = Math.round(remainingBudget / daysLeft);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    const entry = {
      ...form,
      amount: Number(form.amount),
      bankAccountId: form.bankAccountId || undefined,
      cardId: form.cardId || undefined,
    };
    if (editId) {
      dispatch({ type: 'UPDATE_EXPENSE', entry: { ...entry, id: editId } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_EXPENSE', entry: { ...entry, id: 'e_' + Date.now() } });
    }
    setForm({
      date: month + '-' + new Date().toISOString().slice(8, 10),
      category: 'Food',
      amount: '',
      note: '',
      recurring: false,
      paymentMethod: 'cash',
      bankAccountId: '',
      cardId: '',
    });
    setError('');
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">This Month</div>
            <div className="font-bold text-sm text-text num">{formatRs(monthTotal)}</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">Days Remaining</div>
            <div className="font-bold text-sm text-primary-text num">{daysLeft} days</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">Daily Budget Left</div>
            <div className="font-bold text-sm text-success-text num">{formatRs(dailyBudget)} / day</div>
          </Card>
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
          <div className="text-xs text-muted">
            {filtered.length} entries recorded
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            helper="Add your first expense for this month to track cash outflow and maintain daily budget."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Payment Method</th>
                    <th>Note</th>
                    <th className="text-right">Amount</th>
                    <th className="w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const linkedBank = state.bankAccounts.find(b => b.id === e.bankAccountId);
                    return (
                      <tr key={e.id}>
                        <td className="text-muted num">{e.date}</td>
                        <td className="font-medium text-text">{e.category}</td>
                        <td>
                          <span className="text-xs text-muted capitalize">
                            {(e.paymentMethod || 'cash').replace('_', ' ')}
                            {linkedBank && ` (${linkedBank.bankName})`}
                          </span>
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Form */}
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
          <PaymentMethodField
            value={form.paymentMethod}
            onChange={method => setForm(f => ({ ...f, paymentMethod: method }))}
          />
          {['bank_transfer', 'cheque', 'standing_order'].includes(form.paymentMethod) && (
            <BankSelect
              value={form.bankAccountId}
              onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
              bankAccounts={state.bankAccounts}
            />
          )}
          {form.paymentMethod === 'card' && state.cards.length > 0 && (
            <Field id="expense-card" label="Card">
              <Select
                value={form.cardId}
                onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
              >
                <option value="">Select Card</option>
                {state.cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (•••• {c.lastFourDigits})</option>
                ))}
              </Select>
            </Field>
          )}
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
                  setForm({
                    date: month + '-' + new Date().toISOString().slice(8, 10),
                    category: 'Food',
                    amount: '',
                    note: '',
                    recurring: false,
                    paymentMethod: 'cash',
                    bankAccountId: '',
                    cardId: '',
                  });
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
          confirmLabel="Yes, Delete"
          cancelLabel="No, Keep"
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
