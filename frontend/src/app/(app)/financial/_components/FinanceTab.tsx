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
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { BankSelect } from '@/components/ui/BankSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { FinancePayment } from '@/types';

export function FinanceTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    paymentKind: 'instalment' as NonNullable<FinancePayment['paymentKind']>,
    lender: '',
    payee: '',
    chequeNumber: '',
    amount: '',
    dueDay: '',
    monthsRemaining: '',
    frequency: 'monthly' as NonNullable<FinancePayment['frequency']>,
    bankAccountId: '',
    status: 'active' as NonNullable<FinancePayment['status']>,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    const label = form.paymentKind === 'cheque' || form.paymentKind === 'standing_order'
      ? form.payee
      : form.lender;
    if (!label) return;

    const entry: FinancePayment = {
      id: editId || 'fp_' + Date.now(),
      lender: label,
      payee: form.payee || undefined,
      chequeNumber: form.chequeNumber || undefined,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay) || 1,
      monthsRemaining: Number(form.monthsRemaining) || 1,
      paymentKind: form.paymentKind,
      frequency: form.frequency,
      bankAccountId: form.bankAccountId || undefined,
      status: form.status,
    };

    if (editId) {
      dispatch({ type: 'UPDATE_FINANCE_PAYMENT', entry });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_FINANCE_PAYMENT', entry });
    }

    setForm({
      paymentKind: 'instalment',
      lender: '',
      payee: '',
      chequeNumber: '',
      amount: '',
      dueDay: '',
      monthsRemaining: '',
      frequency: 'monthly',
      bankAccountId: '',
      status: 'active',
    });
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
          <div className="space-y-2.5">
            {filteredPayments.map(fp => {
              const kind = fp.paymentKind || 'instalment';
              const bank = state.bankAccounts.find(b => b.id === fp.bankAccountId);
              return (
                <Card key={fp.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text truncate">{fp.lender || fp.payee}</span>
                      <Badge tone={kind === 'cheque' ? 'warning' : kind === 'standing_order' ? 'primary' : 'neutral'} size="sm" className="capitalize text-[10px]">
                        {kind.replace('_', ' ')}
                      </Badge>
                      {fp.status && fp.status !== 'active' && (
                        <Badge tone={fp.status === 'cleared' ? 'success' : 'danger'} size="sm" className="capitalize text-[10px]">
                          {fp.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {kind === 'cheque' && fp.chequeNumber && `Cheque #${fp.chequeNumber} · `}
                      Due day {fp.dueDay}
                      {kind !== 'cheque' && ` · ${fp.monthsRemaining} months remaining`}
                      {bank && ` · ${bank.bankName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-primary-text num">{formatRs(fp.amount)}</span>
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
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="25,000"
            />
          </Field>
          <Field id="fp-dueday" label="Due Day of Month">
            <Input
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
              placeholder="10"
            />
          </Field>

          {form.paymentKind !== 'cheque' && (
            <Field id="fp-months" label="Months Remaining">
              <Input
                type="number"
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

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Finance Payment"
          message="Are you sure you want to remove this finance payment?"
          confirmLabel="Yes, Delete"
          cancelLabel="No, Keep"
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
