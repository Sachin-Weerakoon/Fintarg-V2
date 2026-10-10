'use client';
import { useState } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PaymentMethodField, PaymentMethod } from '@/components/ui/PaymentMethodField';
import { BankSelect } from '@/components/ui/BankSelect';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

export function IncomeTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  type IncomeForm = {
    source: string;
    type: 'salary' | 'business' | 'other';
    amount: string;
    frequency: 'monthly' | 'weekly' | 'daily' | 'one-time';
    date: string;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
  };
  const [form, setForm] = useState<IncomeForm>({
    source: '',
    type: 'salary',
    amount: '',
    frequency: 'monthly',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!form.source || !form.amount || Number(form.amount) <= 0) {
      setError('Source and amount are required.');
      return;
    }
    const entry = {
      source: form.source,
      type: form.type,
      amount: Number(form.amount),
      frequency: form.frequency,
      date: form.date,
      paymentMethod: form.paymentMethod,
      bankAccountId: form.bankAccountId || undefined,
    };
    if (editId) {
      dispatch({ type: 'UPDATE_INCOME', entry: { ...entry, id: editId } });
      toast.success('Income source updated');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_INCOME', entry: { ...entry, id: 'i_' + Date.now() } });
      toast.success('Income source added');
    }
    setForm({
      source: '',
      type: 'salary',
      amount: '',
      frequency: 'monthly',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      bankAccountId: '',
    });
    setError('');
  };

  const handleDelete = async (id: string, source: string) => {
    const ok = await confirm({
      title: 'Delete Income Source',
      message: `Are you sure you want to remove "${source}" from your ledger?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_INCOME', id });
      toast.success('Income source deleted');
    }
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
            helper="Add your salary or business earnings to calculate monthly budgets and free cash."
          />
        ) : (
          <div className="space-y-2.5">
            {state.income.map(i => {
              const linkedBank = state.bankAccounts.find(b => b.id === i.bankAccountId);
              return (
                <Card key={i.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text">{i.source}</div>
                    <div className="text-xs text-muted mt-0.5">
                      <span className="capitalize">{i.type}</span> · <span className="capitalize">{i.frequency}</span> · {i.date}
                      {linkedBank && ` · ${linkedBank.bankName}`}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-primary-text num">{formatRs(i.amount)}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditId(i.id);
                        setForm({
                          source: i.source,
                          type: i.type,
                          amount: String(i.amount),
                          frequency: i.frequency,
                          date: i.date,
                          paymentMethod: i.paymentMethod || 'bank_transfer',
                          bankAccountId: i.bankAccountId || '',
                        });
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
                      onClick={() => handleDelete(i.id, i.source)}
                      title="Delete"
                      aria-label="Delete income"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
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
            <MoneyField
              value={form.amount}
              onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
              placeholder="50,000"
            />
          </Field>
          <PaymentMethodField
            value={form.paymentMethod}
            onChange={method => setForm(f => ({ ...f, paymentMethod: method }))}
          />
          <BankSelect
            value={form.bankAccountId}
            onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
            bankAccounts={state.bankAccounts}
            label="Deposited to Account (optional)"
          />
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
            <DateField
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
                  setForm({
                    source: '',
                    type: 'salary',
                    amount: '',
                    frequency: 'monthly',
                    date: new Date().toISOString().slice(0, 10),
                    paymentMethod: 'bank_transfer',
                    bankAccountId: '',
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
