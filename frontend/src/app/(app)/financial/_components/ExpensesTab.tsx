'use client';
import { useState, useMemo } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '@/store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PaymentMethodField, PaymentMethod } from '@/components/ui/PaymentMethodField';
import { BankSelect } from '@/components/ui/BankSelect';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { EXPENSE_CATS } from '@/utils/bankData';
import type { ExpenseEntry } from '@/types';

export function ExpensesTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

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

  const monthExp = state.expenses.filter(e => e.date.startsWith(month));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];
  const filtered = useMemo(() => {
    return monthExp
      .filter(e => catFilter === 'All' || e.category === catFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthExp, catFilter]);

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
      toast.success('Expense updated');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_EXPENSE', entry: { ...entry, id: 'e_' + Date.now() } });
      toast.success('Expense recorded');
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

  const handleEdit = (expense: ExpenseEntry) => {
    setEditId(expense.id);
    setForm({
      date: expense.date,
      category: expense.category,
      amount: String(expense.amount),
      note: expense.note || '',
      recurring: !!expense.recurring,
      paymentMethod: (expense.paymentMethod as PaymentMethod) || 'cash',
      bankAccountId: expense.bankAccountId || '',
      cardId: expense.cardId || '',
    });
    setError('');
  };

  const handleDelete = async (id: string, category: string, amount: number) => {
    const ok = await confirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete this ${formatRs(amount)} ${category} expense?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_EXPENSE', id });
      toast.success('Expense deleted');
    }
  };

  const columns: Column<ExpenseEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: e => <span className="text-muted num">{e.date}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: e => <span className="font-medium text-text">{e.category}</span>,
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: e => {
        const linkedBank = state.bankAccounts.find(b => b.id === e.bankAccountId);
        return (
          <span className="text-xs text-muted capitalize">
            {(e.paymentMethod || 'cash').replace('_', ' ')}
            {linkedBank && ` (${linkedBank.bankName})`}
          </span>
        );
      },
    },
    {
      key: 'note',
      header: 'Note',
      render: e => <span className="text-muted">{e.note || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: e => <span className="font-medium text-text num">{formatRs(e.amount)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      className: 'w-24',
      render: e => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="!p-1 text-muted hover:text-text"
            onClick={() => handleEdit(e)}
            aria-label="Edit expense"
          >
            <Icon name="edit" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-text hover:text-danger-text !p-1"
            onClick={() => handleDelete(e.id, e.category, e.amount)}
            aria-label="Delete expense"
          >
            <Icon name="trash" size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        {/* Metric Cards with StatCard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="This Month"
            value={formatRs(monthTotal)}
            tone="danger"
            icon={<Icon name="arrow-down" size={18} />}
          />
          <StatCard
            label="Days Remaining"
            value={`${daysLeft} days`}
            tone="default"
            icon={<Icon name="calendar" size={18} />}
          />
          <StatCard
            label="Daily Budget Left"
            value={`${formatRs(dailyBudget)} / day`}
            tone="success"
            icon={<Icon name="wallet" size={18} />}
          />
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

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={e => e.id}
          emptyState={
            <EmptyState
              title="No expenses recorded"
              helper="Add your first expense for this month to track cash outflow and maintain daily budget."
            />
          }
        />
      </div>

      {/* Form */}
      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit expense' : 'Record Expense'}</h3>
        <div className="space-y-3.5">
          <Field id="expense-date" label="Date">
            <DateField
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
            <MoneyField
              value={form.amount}
              onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
              hasError={!!error}
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
          <Checkbox
            label="Recurring monthly"
            checked={form.recurring}
            onChange={checked => setForm(f => ({ ...f, recurring: checked }))}
          />
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
    </div>
  );
}
