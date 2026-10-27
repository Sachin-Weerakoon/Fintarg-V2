'use client';
import { useMemo, useState } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { FormCard } from '@/components/ui/FormCard';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { BankSelect } from '@/components/ui/BankSelect';
import { Sheet } from '@/components/ui/Sheet';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import type { BankAccount, FinancePayment } from '@/types';
import { getLocalDate } from '@/utils/date';
import { addMonths, monthOf, todayISO, upcomingObligations } from '@/lib/insights';
import { BillsCalendar } from './BillsCalendar';
import { useFieldErrors } from '@/hooks/useFieldErrors';

type FormErrorKey = 'label' | 'chequeNumber' | 'amount' | 'dueDay' | 'nextDueDate' | 'monthsRemaining' | 'bankAccountId';

// Cheques and standing orders are drawn on a current account.
const CHEQUE_ACCOUNT_TYPES: NonNullable<BankAccount['accountType']>[] = ['current', 'checking'];

export function FinanceTab({
  streamScope = 'all',
  companyId,
}: {
  streamScope?: 'all' | 'salary' | 'business';
  companyId?: string;
} = {}) {
  const { state, save } = useApp();
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const isSalaryAndBusiness = state.profile.workMode === 'both';
  const isBusinessOnly = state.profile.workMode === 'business';
  const defaultSourceType: 'salary' | 'business' =
    isBusinessOnly
      ? 'business'
      : streamScope === 'business'
      ? 'business'
      : 'salary';

  const emptyForm = {
    paymentKind: 'instalment' as NonNullable<FinancePayment['paymentKind']>,
    lender: '',
    payee: '',
    chequeNumber: '',
    amount: '',
    dueDay: '',
    nextDueDate: '',
    monthsRemaining: '',
    frequency: 'monthly' as NonNullable<FinancePayment['frequency']>,
    bankAccountId: '',
    status: 'active' as NonNullable<FinancePayment['status']>,
    sourceType: defaultSourceType,
    companyId: companyId && companyId !== 'all' ? companyId : '',
  };
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormErrorKey, string>>>({});

  const updateForm = (patch: Partial<typeof emptyForm>, clears: FormErrorKey[] = []) => {
    setForm(f => ({ ...f, ...patch }));
    if (clears.some(k => errors[k])) {
      setErrors(e => {
        const next = { ...e };
        for (const k of clears) delete next[k];
        return next;
      });
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
  };

  // Bills calendar: 62 days covers the rest of this month and all of next month.
  const today = todayISO();
  const obligations = useMemo(() => upcomingObligations(state, today, 62), [state, today]);
  const [filterKind, setFilterKind] = useState<string>('all');

  // Mark as paid sheet state
  const payErrors = useFieldErrors<'bankAccountId' | 'amount' | 'date'>();
  const [payingPayment, setPayingPayment] = useState<FinancePayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
    date: getLocalDate(),
    note: '',
  });

  const validate = () => {
    const next: Partial<Record<FormErrorKey, string>> = {};
    const kind = form.paymentKind;
    const usesPayee = kind === 'cheque' || kind === 'standing_order';
    if (!(usesPayee ? form.payee : form.lender).trim()) {
      next.label = usesPayee ? 'Enter who this is paid to.' : 'Enter the lender.';
    }
    if (kind === 'cheque' && !form.chequeNumber.trim()) next.chequeNumber = 'Enter the cheque number.';
    if (!(Number(form.amount) > 0)) next.amount = 'Enter an amount greater than zero.';
    const dueDay = Number(form.dueDay);
    if (!form.dueDay || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) next.dueDay = 'Enter a day from 1 to 31.';
    if (!form.nextDueDate) next.nextDueDate = 'Choose the next due date.';
    if (kind !== 'cheque') {
      const months = Number(form.monthsRemaining);
      if (form.monthsRemaining.trim() === '' || !Number.isInteger(months) || months < 0 || months > 1200) {
        next.monthsRemaining = 'Enter the number of months remaining.';
      } else if (months === 0 && form.status === 'active') {
        next.monthsRemaining = 'An active payment needs at least 1 month remaining.';
      }
    }
    if (usesPayee && !form.bankAccountId) next.bankAccountId = 'Select the current account this is drawn from.';
    return next;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const kind = form.paymentKind;
    const usesPayee = kind === 'cheque' || kind === 'standing_order';
    const existing = editId ? state.financePayments.find(f => f.id === editId) : undefined;

    const entry: FinancePayment = {
      id: editId || 'fp_' + Date.now(),
      lender: (usesPayee ? form.payee : form.lender).trim(),
      payee: form.payee.trim() || undefined,
      chequeNumber: kind === 'cheque' ? form.chequeNumber.trim() : undefined,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay),
      nextDueDate: form.nextDueDate,
      // A cheque is a single payment: one left until it is marked paid.
      monthsRemaining: kind === 'cheque' ? (existing?.monthsRemaining ?? 1) : Number(form.monthsRemaining),
      paymentKind: kind,
      frequency: kind === 'cheque' ? 'one-time' : kind === 'standing_order' ? form.frequency : 'monthly',
      bankAccountId: form.bankAccountId || undefined,
      status: form.status,
      sourceType: isBusinessOnly ? 'business' : (!isSalaryAndBusiness ? 'salary' : form.sourceType),
      companyId: (form.sourceType === 'business' || isBusinessOnly) ? (form.companyId || undefined) : undefined,
      payments: existing?.payments || [],
    };

    setSaving(true);
    const ok = await save(editId ? { type: 'UPDATE_FINANCE_PAYMENT', entry } : { type: 'ADD_FINANCE_PAYMENT', entry });
    setSaving(false);
    // On failure the store has already rolled back and shown the server's reason; keep the input.
    if (!ok) return;
    toast.success(editId ? 'Payment updated' : 'Payment recorded');
    resetForm();
  };

  const openPaySheet = (fp: FinancePayment) => {
    setPayingPayment(fp);
    payErrors.reset();
    setPaymentForm({
      amount: String(fp.amount),
      paymentMethod: fp.paymentKind === 'cheque' ? 'cheque' : fp.paymentKind === 'standing_order' ? 'standing_order' : fp.bankAccountId ? 'bank_transfer' : 'cash',
      bankAccountId: fp.bankAccountId || '',
      date: getLocalDate(),
      note: `Installment for ${fp.lender || fp.payee || 'Finance Payment'}`,
    });
  };

  const handleRecordPayment = async () => {
    if (!payingPayment) return;
    const valid = payErrors.check({
      bankAccountId: ['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(paymentForm.paymentMethod) && !paymentForm.bankAccountId
        ? 'Select the account this is paid from.' : undefined,
      amount: Number(paymentForm.amount) > 0 ? undefined : 'Enter the payment amount.',
      date: paymentForm.date ? undefined : 'Choose the payment date.',
    });
    if (!valid) return;

    setSaving(true);
    const ok = await save({
      type: 'MARK_FINANCE_PAYMENT_PAID',
      id: payingPayment.id,
      amount: Number(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      bankAccountId: paymentForm.bankAccountId || null,
      date: paymentForm.date,
      note: paymentForm.note,
    });
    setSaving(false);
    if (!ok) return;

    toast.success(`Payment of ${formatRs(Number(paymentForm.amount))} logged`);
    setPayingPayment(null);
  };

  const handleUndoPayment = async (fpId: string, paymentId: string, amount: number) => {
    const ok = await confirm({
      title: 'Undo Payment',
      message: `Undo payment of ${formatRs(amount)}? Remaining months and status will be restored.`,
      confirmLabel: 'Yes, Undo',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (!ok) return;

    if (!(await save({
      type: 'DELETE_FINANCE_PAYMENT_PAYMENT',
      id: fpId,
      paymentId,
    }))) return;
    toast.success(`Payment of ${formatRs(amount)} undone`);
  };

  const handleDelete = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Finance Payment',
      message: `Are you sure you want to remove payment "${label}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      if (await save({ type: 'DELETE_FINANCE_PAYMENT', id })) toast.success('Payment removed');
    }
  };

  const filteredPayments = useMemo(() => {
    return state.financePayments.filter(f => {
      if (filterKind !== 'all' && (f.paymentKind || 'instalment') !== filterKind) return false;
      const itemSource = f.sourceType || 'salary';
      if (streamScope === 'salary' && itemSource !== 'salary') return false;
      if (streamScope === 'business') {
        if (itemSource !== 'business') return false;
        if (companyId && companyId !== 'all' && f.companyId !== companyId) return false;
      }
      return true;
    });
  }, [state.financePayments, filterKind, streamScope, companyId]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <BillsCalendar obligations={obligations} today={today} maxMonth={addMonths(monthOf(today), 1)} />

        <div className="flex items-center justify-between">
          <SegmentedTabs
            size="sm"
            options={[
              { id: 'all', label: 'All Payments' },
              { id: 'instalment', label: 'Instalments & Leases' },
              { id: 'cheque', label: 'Cheques' },
              { id: 'standing_order', label: 'Standing Orders' },
            ]}
            value={filterKind}
            onChange={setFilterKind}
          />
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            helper="Add hire purchase, lease, cheque, or standing order commitments to plan cashflow."
          />
        ) : (
          <div className="space-y-3">
            {filteredPayments.map(fp => {
              const kind = fp.paymentKind || 'instalment';
              const bank = state.bankAccounts.find(b => b.id === fp.bankAccountId);
              const label = fp.lender || fp.payee || 'Payment';
              const status = fp.status || 'active';
              const statusTone = status === 'completed' || status === 'cleared'
                ? 'success'
                : status === 'cancelled'
                ? 'danger'
                : 'primary';

              const isActive = status === 'active' && fp.monthsRemaining > 0;
              const linkedCompany = fp.companyId ? state.companies.find(c => c.id === fp.companyId) : null;

              return (
                <Card key={fp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-text truncate">{label}</span>
                        {isSalaryAndBusiness && (
                          <Badge tone={fp.sourceType === 'business' ? 'warning' : 'neutral'} size="sm" className="text-[10px]">
                            {fp.sourceType === 'business' ? (linkedCompany ? linkedCompany.name : 'Business') : 'Salary'}
                          </Badge>
                        )}
                        {isBusinessOnly && linkedCompany && (
                          <Badge tone="warning" size="sm" className="text-[10px]">
                            {linkedCompany.name}
                          </Badge>
                        )}
                        <Badge tone={kind === 'cheque' ? 'warning' : kind === 'standing_order' ? 'primary' : 'neutral'} size="sm" className="capitalize text-[10px]">
                          {kind.replace('_', ' ')}
                        </Badge>
                        <Badge tone={statusTone} size="sm" className="capitalize text-[10px]">
                          {status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted mt-1 space-x-1.5">
                        {kind === 'cheque' && fp.chequeNumber && <span>Cheque #{fp.chequeNumber} · </span>}
                        <span>Due: <strong className="text-text">{fp.nextDueDate || `Day ${fp.dueDay}`}</strong></span>
                        {kind !== 'cheque' && (
                          <span>· <strong className="num text-text">{fp.monthsRemaining}</strong> months left</span>
                        )}
                        {bank && <span>· {bank.bankName}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-primary-text num">{formatRs(fp.amount)}</span>
                      {fp.frequency && fp.frequency !== 'monthly' && (
                        <div className="text-[10px] text-muted capitalize">{fp.frequency}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openPaySheet(fp)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditId(fp.id);
                          setErrors({});
                          setForm({
                            paymentKind: fp.paymentKind || 'instalment',
                            lender: fp.lender || '',
                            payee: fp.payee || fp.lender || '',
                            chequeNumber: fp.chequeNumber || '',
                            amount: String(fp.amount),
                            dueDay: String(fp.dueDay),
                            nextDueDate: fp.nextDueDate || '',
                            monthsRemaining: String(fp.monthsRemaining),
                            frequency: fp.frequency === 'one-time' ? 'one-time' : 'monthly',
                            bankAccountId: fp.bankAccountId || '',
                            status: fp.status || 'active',
                            sourceType: fp.sourceType || defaultSourceType,
                            companyId: fp.companyId || '',
                          });
                        }}
                        aria-label="Edit payment"
                      >
                        <Icon name="edit" size={14} />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text !p-1.5"
                      onClick={() => handleDelete(fp.id, label)}
                      aria-label="Delete payment"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>

                  {/* Payment history list */}
                  {fp.payments && fp.payments.length > 0 && (
                    <div className="pt-2 border-t border-border/40 text-xs">
                      <span className="text-[11px] font-semibold text-muted mb-1 block">Payment History:</span>
                      <div className="space-y-1">
                        {fp.payments.slice(-3).reverse().map((pay, idx) => {
                          const payId = pay.id || pay._id || String(idx);
                          return (
                            <div key={idx} className="flex justify-between items-center text-muted text-[11px]">
                              <span>
                                {pay.date}
                                {pay.paymentMethod ? ` (${pay.paymentMethod.replace('_', ' ')})` : ''}
                                {pay.note ? ` - ${pay.note}` : ''}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-success-text num">-{formatRs(pay.amount)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUndoPayment(fp.id, payId, pay.amount)}
                                  className="!p-0.5 h-auto text-muted hover:text-danger-text"
                                  title="Undo payment"
                                  aria-label="Undo payment"
                                >
                                  <Icon name="close" size={12} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <FormCard
        icon="calendar"
        title={editId ? 'Edit Payment' : 'Add Finance Payment'}
        badge={editId ? 'Editing' : undefined}
        actions={
          editId ? (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          ) : undefined
        }
        className="h-fit sticky top-4"
      >
        {isSalaryAndBusiness && (
          <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-3 mb-2">
            <Field id="fp-source-type" label="Payment Source / Obligation For">
              <SegmentedTabs
                size="sm"
                options={[
                  { id: 'salary', label: 'Salary / Personal' },
                  { id: 'business', label: 'Business' },
                ]}
                value={form.sourceType}
                onChange={v => updateForm({ sourceType: v as 'salary' | 'business', companyId: '' })}
              />
            </Field>
            {form.sourceType === 'business' && state.companies.length > 0 && (
              <Field id="fp-company" label="Business Enterprise (Optional)">
                <Select
                  value={form.companyId}
                  onChange={e => updateForm({ companyId: e.target.value })}
                >
                  <option value="">General Business (Unlinked)</option>
                  {state.companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        {isBusinessOnly && state.companies.length > 0 && (
          <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-3 mb-2">
            <Field id="fp-company" label="Business Enterprise (Optional)">
              <Select
                value={form.companyId}
                onChange={e => updateForm({ companyId: e.target.value })}
              >
                <option value="">General Business (Unlinked)</option>
                {state.companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <Field id="fp-kind" label="Payment Type" required>
          <Select
            value={form.paymentKind}
            onChange={e => updateForm(
              { paymentKind: e.target.value as NonNullable<FinancePayment['paymentKind']> },
              ['label', 'chequeNumber', 'monthsRemaining', 'bankAccountId'],
            )}
          >
            <option value="instalment">Hire Purchase</option>
            <option value="lease">Vehicle Lease</option>
            <option value="cheque">Post-Dated Cheque</option>
            <option value="standing_order">Standing Order</option>
          </Select>
        </Field>

        {form.paymentKind === 'cheque' ? (
          <>
            <Field id="fp-payee" label="Payee" required error={errors.label}>
              <Input
                value={form.payee}
                onChange={e => updateForm({ payee: e.target.value, lender: e.target.value }, ['label'])}
                placeholder="e.g. Landlord, Supplier Ltd."
                hasError={Boolean(errors.label)}
              />
            </Field>
            <Field id="fp-chequenum" label="Cheque Number" required error={errors.chequeNumber}>
              <Input
                value={form.chequeNumber}
                onChange={e => updateForm({ chequeNumber: e.target.value }, ['chequeNumber'])}
                placeholder="e.g. 784512"
                hasError={Boolean(errors.chequeNumber)}
              />
            </Field>
          </>
        ) : form.paymentKind === 'standing_order' ? (
          <>
            <Field id="fp-payee" label="Beneficiary" required error={errors.label}>
              <Input
                value={form.payee}
                onChange={e => updateForm({ payee: e.target.value, lender: e.target.value }, ['label'])}
                placeholder="e.g. Insurance Premium, School Fee"
                hasError={Boolean(errors.label)}
              />
            </Field>
            {/* The server advances standing orders monthly, so only these two are supported. */}
            <Field id="fp-freq" label="Frequency" required>
              <Select
                value={form.frequency}
                onChange={e => updateForm({ frequency: e.target.value as NonNullable<FinancePayment['frequency']> })}
              >
                <option value="monthly">Monthly</option>
                <option value="one-time">One-time</option>
              </Select>
            </Field>
          </>
        ) : (
          <Field id="fp-lender" label="Lender" required error={errors.label}>
            <Input
              value={form.lender}
              onChange={e => updateForm({ lender: e.target.value, payee: e.target.value }, ['label'])}
              placeholder="e.g. People's Bank, Singer"
              hasError={Boolean(errors.label)}
            />
          </Field>
        )}

        <Field id="fp-amount" label="Amount" required error={errors.amount}>
          <MoneyField
            value={form.amount}
            onChange={v => updateForm({ amount: String(v) }, ['amount'])}
            placeholder="e.g. 25,000"
            hasError={Boolean(errors.amount)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="fp-dueday" label="Due Day" required error={errors.dueDay}>
            <Input
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={e => updateForm({ dueDay: e.target.value }, ['dueDay'])}
              placeholder="e.g. 10"
              hasError={Boolean(errors.dueDay)}
            />
          </Field>
          <Field id="fp-nextdue" label="Next Due Date" required error={errors.nextDueDate}>
            <DateField
              value={form.nextDueDate}
              onChange={e => {
                const val = e.target.value;
                const day = val ? Number(val.slice(8, 10)) : 0;
                updateForm(
                  { nextDueDate: val, dueDay: day ? String(day) : form.dueDay },
                  day ? ['nextDueDate', 'dueDay'] : ['nextDueDate'],
                );
              }}
              hasError={Boolean(errors.nextDueDate)}
            />
          </Field>
        </div>

        {form.paymentKind !== 'cheque' && (
          <Field id="fp-months" label="Months Remaining" required error={errors.monthsRemaining}>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.monthsRemaining}
              onChange={e => updateForm({ monthsRemaining: e.target.value }, ['monthsRemaining'])}
              placeholder="e.g. 18"
              hasError={Boolean(errors.monthsRemaining)}
            />
          </Field>
        )}

        <BankSelect
          id="fp-bank"
          value={form.bankAccountId}
          onChange={id => updateForm({ bankAccountId: id }, ['bankAccountId'])}
          bankAccounts={state.bankAccounts}
          accountTypes={CHEQUE_ACCOUNT_TYPES}
          placeholder="Select current account"
          label="Linked Current Account"
          required={form.paymentKind === 'cheque' || form.paymentKind === 'standing_order'}
          error={errors.bankAccountId}
        />

        <Field id="fp-status" label="Status" required>
          <Select
            value={form.status}
            onChange={e => updateForm({ status: e.target.value as NonNullable<FinancePayment['status']> }, ['monthsRemaining'])}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cleared">Cleared</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>

        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1 shadow-sm hover:shadow-primary-500/20"
            iconLeft={<Icon name={editId ? 'check' : 'plus'} size={15} />}
            onClick={submit}
            loading={saving}
          >
            {editId ? 'Update Payment' : 'Save Payment'}
          </Button>
          {editId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </FormCard>

      {/* Mark as paid sheet */}
      <Sheet
        isOpen={Boolean(payingPayment)}
        onClose={() => setPayingPayment(null)}
        title="Mark Payment as Paid"
        description={payingPayment ? (payingPayment.lender || payingPayment.payee) : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="pay-method" label="Payment Method">
            <Select
              value={paymentForm.paymentMethod}
              onChange={e => { setPaymentForm(f => ({ ...f, paymentMethod: e.target.value })); payErrors.clear('bankAccountId'); }}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="standing_order">Standing Order</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="debit_card">Debit Card</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </Select>
          </Field>

          {['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(paymentForm.paymentMethod) && (
            <Field id="pay-account" label="Debit Current Account" required error={payErrors.errors.bankAccountId}>
              <Select
                value={paymentForm.bankAccountId}
                onChange={e => { setPaymentForm(f => ({ ...f, bankAccountId: e.target.value })); payErrors.clear('bankAccountId'); }}
              >
                <option value="">Select current account</option>
                {state.bankAccounts
                  .filter(b => b.id === paymentForm.bankAccountId
                    || (!b.isArchived && CHEQUE_ACCOUNT_TYPES.includes(b.accountType || 'savings')))
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} · {b.accountNumber} · {formatRs(b.currentBalance)}
                    </option>
                  ))}
              </Select>
            </Field>
          )}

          <Field id="pay-amount" label="Payment Amount" required error={payErrors.errors.amount}>
            <MoneyField
              value={paymentForm.amount}
              onChange={v => { setPaymentForm(f => ({ ...f, amount: String(v) })); payErrors.clear('amount'); }}
              placeholder="e.g. 25,000"
            />
          </Field>

          <Field id="pay-date" label="Payment Date" required error={payErrors.errors.date}>
            <DateField
              value={paymentForm.date}
              onChange={e => { setPaymentForm(f => ({ ...f, date: e.target.value })); payErrors.clear('date'); }}
            />
          </Field>

          <Field id="pay-note" label="Notes">
            <Input
              value={paymentForm.note}
              onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Monthly installment receipt #541"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordPayment} loading={saving}>
              Confirm Payment
            </Button>
            <Button variant="secondary" onClick={() => setPayingPayment(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
