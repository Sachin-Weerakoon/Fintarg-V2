'use client';
import { useState } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
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
import type { FinancePayment } from '@/types';

export function FinanceTab() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({
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
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>('all');

  // Mark as paid sheet state
  const [payingPayment, setPayingPayment] = useState<FinancePayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    const label = form.paymentKind === 'cheque' || form.paymentKind === 'standing_order'
      ? form.payee
      : form.lender;
    if (!label) return;

    let derivedDueDay = Number(form.dueDay);
    if (!derivedDueDay && form.nextDueDate) {
      derivedDueDay = Number(form.nextDueDate.slice(8, 10)) || 1;
    }
    if (!derivedDueDay) derivedDueDay = 1;

    const entry: FinancePayment = {
      id: editId || 'fp_' + Date.now(),
      lender: label,
      payee: form.payee || undefined,
      chequeNumber: form.chequeNumber || undefined,
      amount: Number(form.amount),
      dueDay: derivedDueDay,
      nextDueDate: form.nextDueDate || undefined,
      monthsRemaining: Number(form.monthsRemaining) || 0,
      paymentKind: form.paymentKind,
      frequency: form.frequency,
      bankAccountId: form.bankAccountId || undefined,
      status: form.status,
      payments: editId ? (state.financePayments.find(f => f.id === editId)?.payments || []) : [],
    };

    if (editId) {
      dispatch({ type: 'UPDATE_FINANCE_PAYMENT', entry });
      toast.success('Payment updated');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_FINANCE_PAYMENT', entry });
      toast.success('Payment recorded');
    }

    setForm({
      paymentKind: 'instalment',
      lender: '',
      payee: '',
      chequeNumber: '',
      amount: '',
      dueDay: '',
      nextDueDate: '',
      monthsRemaining: '',
      frequency: 'monthly',
      bankAccountId: '',
      status: 'active',
    });
  };

  const openPaySheet = (fp: FinancePayment) => {
    setPayingPayment(fp);
    setPaymentForm({
      amount: String(fp.amount),
      paymentMethod: fp.paymentKind === 'cheque' ? 'cheque' : fp.paymentKind === 'standing_order' ? 'standing_order' : fp.bankAccountId ? 'bank_transfer' : 'cash',
      bankAccountId: fp.bankAccountId || '',
      date: new Date().toISOString().slice(0, 10),
      note: `Installment for ${fp.lender || fp.payee || 'Finance Payment'}`,
    });
  };

  const handleRecordPayment = () => {
    if (!payingPayment || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const isBankMethod = ['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(paymentForm.paymentMethod);
    if (isBankMethod && !paymentForm.bankAccountId) {
      toast.error('Please select a bank account for this payment method');
      return;
    }

    dispatch({
      type: 'MARK_FINANCE_PAYMENT_PAID',
      id: payingPayment.id,
      amount: Number(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      bankAccountId: paymentForm.bankAccountId || null,
      date: paymentForm.date,
      note: paymentForm.note,
    });

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

    dispatch({
      type: 'DELETE_FINANCE_PAYMENT_PAYMENT',
      id: fpId,
      paymentId,
    });
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
      dispatch({ type: 'DELETE_FINANCE_PAYMENT', id });
      toast.success('Payment removed');
    }
  };

  const filteredPayments = state.financePayments.filter(f => {
    if (filterKind === 'all') return true;
    return (f.paymentKind || 'instalment') === filterKind;
  });

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
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
                : status === 'pending'
                ? 'warning'
                : 'primary';

              const isActive = status === 'active' && fp.monthsRemaining > 0;

              return (
                <Card key={fp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text truncate">{label}</span>
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
                          setForm({
                            paymentKind: fp.paymentKind || 'instalment',
                            lender: fp.lender || '',
                            payee: fp.payee || fp.lender || '',
                            chequeNumber: fp.chequeNumber || '',
                            amount: String(fp.amount),
                            dueDay: String(fp.dueDay),
                            nextDueDate: fp.nextDueDate || '',
                            monthsRemaining: String(fp.monthsRemaining),
                            frequency: fp.frequency || 'monthly',
                            bankAccountId: fp.bankAccountId || '',
                            status: fp.status || 'active',
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

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit Payment' : 'Add Finance Payment'}</h3>
        <div className="space-y-3.5">
          <Field id="fp-kind" label="Payment Type">
            <Select
              value={form.paymentKind}
              onChange={e => setForm(f => ({ ...f, paymentKind: e.target.value as any }))}
            >
              <option value="instalment">Hire Purchase / Instalment</option>
              <option value="lease">Vehicle Lease</option>
              <option value="cheque">Post-Dated Cheque</option>
              <option value="standing_order">Standing Order</option>
            </Select>
          </Field>

          {form.paymentKind === 'cheque' ? (
            <>
              <Field id="fp-payee" label="Payee">
                <Input
                  value={form.payee}
                  onChange={e => setForm(f => ({ ...f, payee: e.target.value, lender: e.target.value }))}
                  placeholder="e.g. Landlord, Supplier Ltd."
                />
              </Field>
              <Field id="fp-chequenum" label="Cheque Number">
                <Input
                  value={form.chequeNumber}
                  onChange={e => setForm(f => ({ ...f, chequeNumber: e.target.value }))}
                  placeholder="e.g. 784512"
                />
              </Field>
            </>
          ) : form.paymentKind === 'standing_order' ? (
            <>
              <Field id="fp-payee" label="Beneficiary / Payee">
                <Input
                  value={form.payee}
                  onChange={e => setForm(f => ({ ...f, payee: e.target.value, lender: e.target.value }))}
                  placeholder="e.g. Insurance Premium, School Fee"
                />
              </Field>
              <Field id="fp-freq" label="Frequency">
                <Select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </Select>
              </Field>
            </>
          ) : (
            <Field id="fp-lender" label="Lender / Institution">
              <Input
                value={form.lender}
                onChange={e => setForm(f => ({ ...f, lender: e.target.value, payee: e.target.value }))}
                placeholder="e.g. People's Bank, Singer"
              />
            </Field>
          )}

          <Field id="fp-amount" label="Amount (Rs.)">
            <MoneyField
              value={form.amount}
              onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
              placeholder="25,000"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="fp-dueday" label="Due Day (1-31)">
              <Input
                type="number"
                min="1"
                max="31"
                value={form.dueDay}
                onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                placeholder="10"
              />
            </Field>
            <Field id="fp-nextdue" label="Next Due Date">
              <DateField
                value={form.nextDueDate}
                onChange={e => {
                  const val = e.target.value;
                  const day = val ? Number(val.slice(8, 10)) : '';
                  setForm(f => ({ ...f, nextDueDate: val, dueDay: day ? String(day) : f.dueDay }));
                }}
              />
            </Field>
          </div>

          {form.paymentKind !== 'cheque' && (
            <Field id="fp-months" label="Months Remaining">
              <Input
                type="number"
                min="0"
                value={form.monthsRemaining}
                onChange={e => setForm(f => ({ ...f, monthsRemaining: e.target.value }))}
                placeholder="18"
              />
            </Field>
          )}

          <BankSelect
            value={form.bankAccountId}
            onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
            bankAccounts={state.bankAccounts}
            label="Linked Bank Account"
          />

          <Field id="fp-status" label="Status">
            <Select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Payment' : 'Save Payment'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    paymentKind: 'instalment',
                    lender: '',
                    payee: '',
                    chequeNumber: '',
                    amount: '',
                    dueDay: '',
                    nextDueDate: '',
                    monthsRemaining: '',
                    frequency: 'monthly',
                    bankAccountId: '',
                    status: 'active',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Mark as paid sheet */}
      <Sheet
        isOpen={Boolean(payingPayment)}
        onClose={() => setPayingPayment(null)}
        title="Mark Payment as Paid"
        description={payingPayment ? `Record installment payment for ${payingPayment.lender || payingPayment.payee}` : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="pay-method" label="Payment Method">
            <Select
              value={paymentForm.paymentMethod}
              onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
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
            <Field id="pay-account" label="Debit Bank Account">
              <Select
                value={paymentForm.bankAccountId}
                onChange={e => setPaymentForm(f => ({ ...f, bankAccountId: e.target.value }))}
              >
                <option value="">Select Account...</option>
                {state.bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber} ({formatRs(b.currentBalance)})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field id="pay-amount" label="Payment Amount (Rs.)">
            <MoneyField
              value={paymentForm.amount}
              onChange={v => setPaymentForm(f => ({ ...f, amount: String(v) }))}
              placeholder="e.g. 25,000"
            />
          </Field>

          <Field id="pay-date" label="Payment Date">
            <DateField
              value={paymentForm.date}
              onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>

          <Field id="pay-note" label="Notes (optional)">
            <Input
              value={paymentForm.note}
              onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Monthly installment receipt #541"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordPayment}>
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
