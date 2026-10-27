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
import { getLocalDate, isInRange, type DateRange } from '@/utils/date';
import { calcIncomeForRange } from '@/lib/money';
import { useFieldErrors } from '@/hooks/useFieldErrors';

export function IncomeTab({
  range,
  streamScope = 'all',
  companyId: _companyId,
}: {
  range: DateRange;
  streamScope?: 'all' | 'salary' | 'business';
  companyId?: string;
}) {
  const { state, save } = useApp();
  const [saving, setSaving] = useState(false);
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

  const isSalaryAndBusiness = state.profile.workMode === 'both';
  const isBusinessOnly = state.profile.workMode === 'business';
  const isSalaryOnly = !isSalaryAndBusiness && !isBusinessOnly;

  const defaultType: 'salary' | 'business' | 'other' = isBusinessOnly ? 'business' : (streamScope === 'business' ? 'business' : 'salary');

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
  const { errors, check, clear, reset: resetErrors } = useFieldErrors<'source' | 'amount' | 'date' | 'bankAccountId'>();

  const submit = async () => {
    const valid = check({
      source: form.source.trim() ? undefined : 'Enter where this income comes from.',
      amount: Number(form.amount) > 0 ? undefined : 'Enter an amount greater than zero.',
      date: form.date ? undefined : 'Choose the date.',
      // Mirrors the server rule: bank-backed methods must name the account they land in.
      bankAccountId: ['bank_transfer', 'cheque', 'standing_order'].includes(form.paymentMethod) && !form.bankAccountId
        ? 'Select the bank account this is paid into.' : undefined,
    });
    if (!valid) return;
    const effectiveType = isSalaryOnly && form.type === 'business' ? 'salary' : (isBusinessOnly && form.type === 'salary' ? 'business' : form.type);
    const entry = {
      source: form.source.trim(),
      type: effectiveType,
      amount: Number(form.amount),
      frequency: form.frequency,
      date: form.date,
      paymentMethod: form.paymentMethod,
      bankAccountId: form.bankAccountId || undefined,
    };
    setSaving(true);
    const ok = await save(editId
      ? { type: 'UPDATE_INCOME', entry: { ...entry, id: editId } }
      : { type: 'ADD_INCOME', entry: { ...entry, id: 'i_' + Date.now() } });
    setSaving(false);
    // On failure the store has already rolled back and shown the server's reason; keep the input.
    if (!ok) return;
    toast.success(editId ? 'Income source updated' : 'Income source added');
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
    resetErrors();
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
      if (await save({ type: 'DELETE_INCOME', id })) toast.success('Income source deleted');
    }
  };

  // Recurring sources always apply; one-time income only shows when dated inside the range.
  const streamFilteredIncome = useMemo(() => {
    return state.income.filter(i => {
      if (i.frequency === 'one-time' && !isInRange(i.date, range)) return false;
      if (isSalaryOnly) return i.type === 'salary' || i.type === 'other';
      if (isBusinessOnly) return i.type === 'business' || i.type === 'other';
      if (streamScope === 'salary') return i.type === 'salary' || i.type === 'other';
      if (streamScope === 'business') return i.type === 'business';
      return true;
    });
  }, [state.income, streamScope, range, isSalaryOnly, isBusinessOnly]);

  const rangeTotal = useMemo(
    () => calcIncomeForRange(streamFilteredIncome, range, state.employmentProfiles),
    [streamFilteredIncome, range, state.employmentProfiles],
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm text-text">
            {isSalaryOnly ? 'Income & Inflows' : isBusinessOnly ? 'Business Operating Inflows' : (streamScope === 'business' ? 'Business Inflows' : streamScope === 'salary' ? 'Job Salary Inflows' : 'Consolidated Inflow Sources')}
          </div>
          <div className="text-sm text-muted">
            Total: <span className="font-semibold text-text num">{formatRs(rangeTotal)}</span>
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
                        resetErrors();
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
                resetErrors();
              }}
            >
              Cancel
            </Button>
          ) : undefined
        }
        className="h-fit sticky top-4"
      >
        <Field id="income-source" label="Source" required error={errors.source}>
          <Input
            value={form.source}
            onChange={e => {
              setForm(f => ({ ...f, source: e.target.value }));
              clear('source');
            }}
            hasError={Boolean(errors.source)}
            placeholder={streamScope === 'business' ? 'e.g. Client retainer, Wholesale sales' : 'e.g. Tech Corp Salary, Freelance'}
          />
        </Field>
        {isSalaryAndBusiness && (
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
        )}
        {isBusinessOnly && (
          <Field id="income-type" label="Stream Type" required>
            <Select
              value={form.type === 'salary' ? 'business' : form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            >
              <option value="business">Business Inflow</option>
              <option value="other">Other Inflow</option>
            </Select>
          </Field>
        )}
        {isSalaryOnly && (
          <Field id="income-type" label="Stream Type" required>
            <Select
              value={form.type === 'business' ? 'salary' : form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            >
              <option value="salary">Job Salary</option>
              <option value="other">Other Inflow</option>
            </Select>
          </Field>
        )}
        <Field id="income-amount" label="Amount" required error={errors.amount}>
          <MoneyField
            value={form.amount}
            onChange={v => {
              setForm(f => ({ ...f, amount: String(v) }));
              clear('amount');
            }}
            hasError={Boolean(errors.amount)}
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
        <Field id="income-date" label="Date" required error={errors.date}>
          <DateField
            value={form.date}
            onChange={e => {
              setForm(f => ({ ...f, date: e.target.value }));
              clear('date');
            }}
            hasError={Boolean(errors.date)}
          />
        </Field>
        <PaymentMethodField
          value={form.paymentMethod}
          onChange={method => {
            setForm(f => ({ ...f, paymentMethod: method }));
            clear('bankAccountId');
          }}
        />
        {['bank_transfer', 'cheque', 'standing_order'].includes(form.paymentMethod) && (
          <BankSelect
            value={form.bankAccountId}
            onChange={id => {
              setForm(f => ({ ...f, bankAccountId: id }));
              clear('bankAccountId');
            }}
            bankAccounts={state.bankAccounts}
            required
            error={errors.bankAccountId}
          />
        )}
        <Button
          variant="primary"
          className="w-full mt-2 shadow-sm hover:shadow-primary-500/20"
          iconLeft={<Icon name={editId ? 'check' : 'plus'} size={15} />}
          onClick={submit}
          loading={saving}
        >
          {editId ? 'Update Income Source' : 'Save Income Source'}
        </Button>
      </FormCard>
    </div>
  );
}
