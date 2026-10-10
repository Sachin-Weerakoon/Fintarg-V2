'use client';
import { useState } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

export function PawnedTab() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({
    description: '',
    amountReceived: '',
    interestRate: '',
    nextDue: new Date().toISOString().slice(0, 10),
    redemptionDate: '',
  });

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
    toast.success('Pawned item recorded');
    setForm({
      description: '',
      amountReceived: '',
      interestRate: '',
      nextDue: new Date().toISOString().slice(0, 10),
      redemptionDate: '',
    });
  };

  const handlePayInterest = (id: string, description: string) => {
    dispatch({ type: 'RECORD_PAWN_PAYMENT', id });
    toast.success(`Interest payment recorded for "${description}"`);
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
          <div className="space-y-2.5">
            {state.pawnedItems.map(p => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-text">{p.description}</div>
                  <div className="text-xs text-muted mt-0.5">
                    <span className="num font-semibold text-text">{formatRs(p.amountReceived)}</span> · {p.interestRate}% / mo · Due {p.nextDue}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePayInterest(p.id, p.description)}
                  >
                    Pay Interest
                  </Button>
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
            <MoneyField
              value={form.amountReceived}
              onChange={v => setForm(f => ({ ...f, amountReceived: String(v) }))}
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
          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Item
          </Button>
        </div>
      </Card>
    </div>
  );
}
