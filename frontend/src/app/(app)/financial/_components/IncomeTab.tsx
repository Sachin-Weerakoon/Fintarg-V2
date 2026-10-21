'use client';
import { useState, useMemo } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { FormCard } from '@/components/ui/FormCard';
import { Button } from '@/components/ui/Button';
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
import { getLocalDate } from '@/utils/date';

export function IncomeTab({
  month,
  streamScope = 'all',
  companyId: _companyId,
}: {
  month: string;
  streamScope?: 'all' | 'salary' | 'business';
  companyId?: string;
}) {
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

  const defaultType: 'salary' | 'business' | 'other' = streamScope === 'business' ? 'business' : 'salary';

  const [form, setForm] = useState<IncomeForm>({
    source: '',
    type: defaultType,
    amount: '',
    frequency: 'monthly',
    date: getLocalDate(),
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
      type: defaultType,
      amount: '',
      frequency: 'monthly',
      date: getLocalDate(),
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

  const streamFilteredIncome = useMemo(() => {
    return state.income.filter(i => {
      if (streamScope === 'salary') return i.type === 'salary' || i.type === 'other';
      if (streamScope === 'business') return i.type === 'business';
      return true;
    });
  }, [state.income, streamScope]);

  const totalMonthly = useMemo(() => {
    return streamFilteredIncome.reduce((s, i) => {
      if (i.frequency === 'monthly') return s + i.amount;
      if (i.frequency === 'weekly') return s + i.amount * 4;
      if (i.frequency === 'daily') return s + i.amount * 30;
      if (i.frequency === 'one-time' && i.date.startsWith(month)) return s + i.amount;
      return s;
    }, 0);
  }, [streamFilteredIncome, month]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm text-text">
            {streamScope === 'business' ? 'Business Operating Inflows' : streamScope === 'salary' ? 'Job Salary Inflows' : 'Consolidated Inflow Sources'}
          </div>
          <div className="text-sm text-muted">
            Monthly total: <span className="font-semibold text-text num">{formatRs(totalMonthly)}</span>
          </div>
        </div>
        {streamFilteredIncome.length === 0 ? (
          <EmptyState
            title="No income sources"
            helper={streamScope === 'business' ? 'No business revenue or operating inflow sources logged.' : 'Add your salary or business earnings to calculate monthly budgets and free cash.'}
          />
        ) : (
          <div className="space-y-2.5">
            {streamFilteredIncome.map(i => {
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

      <FormCard
        icon="arrow-up"
        title={editId ? 'Edit Income' : 'Record Income'}
        description={editId ? 'Update this income source details' : 'Log an earnings stream or salary credit for this month'}
        badge={editId ? 'Editing' : undefined}
        actions={
          editId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditId(null);
                setForm({
                  source: '',
                  type: defaultType,
                  amount: '',
                  frequency: 'monthly',
                  date: getLocalDate(),
                  paymentMethod: 'bank_transfer',
                  bankAccountId: '',
                });
                setError('');
              }}
            >
              Cancel
            </Button>
          ) : undefined
        }
        className="h-fit sticky top-4"
      >
        <Field id="income-source" label="Source" required error={error}>
          <Input
            value={form.source}
            onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            placeholder={streamScope === 'business' ? 'e.g. Client retainer, Wholesale sales' : 'e.g. Tech Corp Salary, Freelance'}
          />
        </Field>
        <Field id="income-type" label="Stream Type" required>
          <Select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
          >
            <option value="salary">Job Salary</option>
            <option value="business">Business Inflow</option>
            <option value="other">Other Inflow</option>
          </Select>
        </Field>
        <Field id="income-amount" label="Amount (Rs.)" required>
          <MoneyField
            value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
          />
        </Field>
        <Field id="income-frequency" label="Frequency" required>
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
        <Field id="income-date" label="Date" required>
          <DateField
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
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
        <Button
          variant="primary"
          className="w-full mt-2 shadow-sm hover:shadow-primary-500/20"
          iconLeft={<Icon name={editId ? 'check' : 'plus'} size={15} />}
          onClick={submit}
        >
          {editId ? 'Update Income Source' : 'Save Income Source'}
        </Button>
      </FormCard>
    </div>
  );
}
