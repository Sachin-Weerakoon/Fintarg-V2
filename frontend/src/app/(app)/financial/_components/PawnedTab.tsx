'use client';
import { useState } from 'react';
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
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import type { PawnedItem } from '@/types';

export function PawnedTab() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({
    description: '',
    ticketNumber: '',
    amountReceived: '',
    interestRate: '',
    nextDue: new Date().toISOString().slice(0, 10),
    redemptionDate: '',
  });

  // Payment sheet state
  const [payingPawn, setPayingPawn] = useState<PawnedItem | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: 'interest' as 'interest' | 'part_principal' | 'redemption',
    paymentMethod: 'cash',
    bankAccountId: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const submit = () => {
    if (!form.description || !form.amountReceived) return;
    const nextDue = form.nextDue || new Date().toISOString().slice(0, 10);
    const defaultRedemption = new Date();
    defaultRedemption.setMonth(defaultRedemption.getMonth() + 6);
    const redemptionDate = form.redemptionDate || defaultRedemption.toISOString().slice(0, 10);

    const amount = Number(form.amountReceived);
    dispatch({
      type: 'ADD_PAWNED',
      entry: {
        id: 'pw_' + Date.now(),
        description: form.description,
        ticketNumber: form.ticketNumber.trim(),
        amountReceived: amount,
        principalOutstanding: amount,
        interestPaid: 0,
        interestRate: Number(form.interestRate) || 0,
        nextDue,
        redemptionDate,
        status: 'active',
        payments: [],
      },
    });
    toast.success('Pawned item recorded');
    setForm({
      description: '',
      ticketNumber: '',
      amountReceived: '',
      interestRate: '',
      nextDue: new Date().toISOString().slice(0, 10),
      redemptionDate: '',
    });
  };

  const openPaymentSheet = (
    pawn: PawnedItem,
    type: 'interest' | 'part_principal' | 'redemption' = 'interest'
  ) => {
    const principal = pawn.principalOutstanding !== undefined ? pawn.principalOutstanding : pawn.amountReceived;
    let initialAmount = '';
    if (type === 'interest') {
      const monthlyInt = Math.max(1, Math.round(principal * (pawn.interestRate / 100) / 12));
      initialAmount = String(monthlyInt);
    } else if (type === 'redemption') {
      initialAmount = String(principal);
    }

    setPayingPawn(pawn);
    setPaymentForm({
      amount: initialAmount,
      paymentType: type,
      paymentMethod: 'cash',
      bankAccountId: '',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
  };

  const handlePaymentTypeChange = (newType: 'interest' | 'part_principal' | 'redemption') => {
    if (!payingPawn) return;
    const principal = payingPawn.principalOutstanding !== undefined ? payingPawn.principalOutstanding : payingPawn.amountReceived;
    let newAmount = paymentForm.amount;
    if (newType === 'interest') {
      const monthlyInt = Math.max(1, Math.round(principal * (payingPawn.interestRate / 100) / 12));
      newAmount = String(monthlyInt);
    } else if (newType === 'redemption') {
      newAmount = String(principal);
    } else if (newType === 'part_principal') {
      newAmount = '';
    }
    setPaymentForm(f => ({ ...f, paymentType: newType, amount: newAmount }));
  };

  const handleRecordPayment = () => {
    if (!payingPawn || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    const isBankMethod = ['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(paymentForm.paymentMethod);
    if (isBankMethod && !paymentForm.bankAccountId) {
      toast.error('Please select a bank account for this payment method');
      return;
    }

    dispatch({
      type: 'RECORD_PAWN_PAYMENT',
      id: payingPawn.id,
      amount: Number(paymentForm.amount),
      paymentType: paymentForm.paymentType,
      paymentMethod: paymentForm.paymentMethod,
      bankAccountId: paymentForm.bankAccountId || null,
      date: paymentForm.date,
      note: paymentForm.note,
    });

    const typeLabel = paymentForm.paymentType === 'interest' ? 'Interest' : paymentForm.paymentType === 'redemption' ? 'Redemption' : 'Part-principal';
    toast.success(`${typeLabel} payment of ${formatRs(Number(paymentForm.amount))} logged`);
    setPayingPawn(null);
  };

  const handleUndoPayment = async (pawnId: string, paymentId: string, amount: number) => {
    const ok = await confirm({
      title: 'Undo Payment',
      message: `Undo pawn payment of ${formatRs(amount)}? Outstanding principal / interest will be restored.`,
      confirmLabel: 'Yes, Undo',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (!ok) return;

    dispatch({
      type: 'DELETE_PAWN_PAYMENT',
      id: pawnId,
      paymentId,
    });
    toast.success(`Payment of ${formatRs(amount)} undone`);
  };

  const handleDelete = async (id: string, description: string) => {
    const ok = await confirm({
      title: 'Delete Pawned Item',
      message: `Are you sure you want to remove the record for "${description}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_PAWNED', id });
      toast.success('Pawned item record deleted');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-sm mb-3 text-text">Pawned items</h3>
        {state.pawnedItems.length === 0 ? (
          <EmptyState
            title="No pawned items"
            helper="Track pawned gold items, monthly interest rates, and redemption deadlines."
          />
        ) : (
          <div className="space-y-3">
            {state.pawnedItems.map(p => {
              const status = p.status || 'active';
              const principalOutstanding = p.principalOutstanding !== undefined ? p.principalOutstanding : p.amountReceived;
              const interestPaid = p.interestPaid || 0;
              const statusTone = status === 'redeemed' ? 'success' : status === 'forfeited' ? 'danger' : 'primary';

              return (
                <Card key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text">{p.description}</span>
                        {p.ticketNumber && (
                          <span className="text-[11px] font-mono text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
                            #{p.ticketNumber}
                          </span>
                        )}
                        <Badge tone={statusTone} size="sm">
                          {status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted mt-1 space-x-2">
                        <span>Original: <strong className="num text-text">{formatRs(p.amountReceived)}</strong></span>
                        <span>·</span>
                        <span>Rate: <strong className="num text-text">{p.interestRate}%/mo</strong></span>
                        <span>·</span>
                        <span>Due: <strong className="text-text">{p.nextDue}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted">Principal Due</div>
                      <div className="text-sm font-bold text-text num">{formatRs(principalOutstanding)}</div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border flex items-center justify-between text-xs">
                    <span className="text-muted">Total Interest Paid:</span>
                    <span className="font-bold text-success-text num">{formatRs(interestPaid)}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {status === 'active' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openPaymentSheet(p, 'interest')}
                          >
                            Pay Interest
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openPaymentSheet(p, 'part_principal')}
                          >
                            Pay Principal
                          </Button>
                          {principalOutstanding > 0 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openPaymentSheet(p, 'redemption')}
                            >
                              Redeem Item
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text !p-1.5"
                      onClick={() => handleDelete(p.id, p.description)}
                      aria-label="Delete item"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>

                  {/* Recent Payments History */}
                  {p.payments && p.payments.length > 0 && (
                    <div className="pt-2 border-t border-border/40 text-xs">
                      <span className="text-[11px] font-semibold text-muted mb-1 block">Payment History:</span>
                      <div className="space-y-1">
                        {p.payments.slice(-3).reverse().map((pay, idx) => {
                          const payId = pay.id || pay._id || String(idx);
                          return (
                            <div key={idx} className="flex justify-between items-center text-muted text-[11px]">
                              <span>
                                {pay.date} · <span className="font-medium text-text capitalize">{pay.paymentType.replace('_', ' ')}</span>
                                {pay.paymentMethod && pay.paymentMethod !== 'cash' ? ` (${pay.paymentMethod.replace('_', ' ')})` : ''}
                                {pay.note ? ` - ${pay.note}` : ''}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-success-text num">{formatRs(pay.amount)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUndoPayment(p.id, payId, pay.amount)}
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
        icon="financial"
        title="Add Pawned Item"
        description="Track pawn receipts, advance amounts, monthly rates, and redemption dates"
        className="h-fit sticky top-4"
      >
        <Field id="pawn-desc" label="Description" required>
          <Input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Gold chain (22g), Sovereign coin"
          />
        </Field>
        <Field id="pawn-ticket" label="Ticket / Receipt # (optional)">
          <Input
            value={form.ticketNumber}
            onChange={e => setForm(f => ({ ...f, ticketNumber: e.target.value }))}
            placeholder="e.g. TKT-90412"
          />
        </Field>
        <Field id="pawn-amount" label="Amount received (Rs.)" required>
          <MoneyField
            value={form.amountReceived}
            onChange={v => setForm(f => ({ ...f, amountReceived: String(v) }))}
            placeholder="50,000"
          />
        </Field>
        <Field id="pawn-rate" label="Interest rate (% per month)" required>
          <Input
            type="number"
            step="0.1"
            value={form.interestRate}
            onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
            placeholder="2.0"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="pawn-due" label="Next due date" required>
            <DateField
              value={form.nextDue}
              onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))}
            />
          </Field>
          <Field id="pawn-redemption" label="Redemption date">
            <DateField
              value={form.redemptionDate}
              onChange={e => setForm(f => ({ ...f, redemptionDate: e.target.value }))}
            />
          </Field>
        </div>
        <div className="pt-2">
          <Button
            variant="primary"
            className="w-full shadow-sm hover:shadow-primary-500/20"
            iconLeft={<Icon name="plus" size={15} />}
            onClick={submit}
          >
            Save Pawned Item
          </Button>
        </div>
      </FormCard>

      {/* Payment Sheet */}
      <Sheet
        isOpen={Boolean(payingPawn)}
        onClose={() => setPayingPawn(null)}
        title="Record Pawn Payment"
        description={payingPawn ? `Payment for ${payingPawn.description}` : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="pawn-pay-type" label="Payment Type">
            <Select
              value={paymentForm.paymentType}
              onChange={e => handlePaymentTypeChange(e.target.value as any)}
            >
              <option value="interest">Interest Payment</option>
              <option value="part_principal">Part-Principal Payment</option>
              <option value="redemption">Full Redemption (Settle Principal)</option>
            </Select>
          </Field>
          <Field id="pawn-pay-method" label="Payment Method">
            <Select
              value={paymentForm.paymentMethod}
              onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="standing_order">Standing Order</option>
              <option value="cheque">Cheque</option>
              <option value="debit_card">Debit Card</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          {['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(paymentForm.paymentMethod) && (
            <Field id="pawn-pay-account" label="Debit Bank Account">
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
          <Field id="pawn-pay-amount" label="Payment Amount (Rs.)">
            <MoneyField
              value={paymentForm.amount}
              onChange={v => setPaymentForm(f => ({ ...f, amount: String(v) }))}
              placeholder="e.g. 5,000"
            />
          </Field>
          <Field id="pawn-pay-date" label="Payment Date">
            <DateField
              value={paymentForm.date}
              onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field id="pawn-pay-note" label="Notes (optional)">
            <Input
              value={paymentForm.note}
              onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Monthly interest receipt #123"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordPayment}>
              Save Payment
            </Button>
            <Button variant="secondary" onClick={() => setPayingPawn(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
