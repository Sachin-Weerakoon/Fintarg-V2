'use client';
import { useState, useMemo } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  calculateLoan,
  calculateAmortizationSchedule,
  AmortizationRow,
} from '@/utils/loanMath';
import type { Loan } from '@/types';

export function LoansTab() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({
    lender: '',
    amount: '',
    rate: '12',
    method: 'reducing_balance' as 'reducing_balance' | 'simple' | 'compound',
    interestBasis: 'annual' as 'annual' | 'monthly',
    tenureMonths: '12',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  });
  const [editId, setEditId] = useState<string | null>(null);

  // Repayment sheet state
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  // Amortization sheet state
  const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);

  // Summary calculations
  const totalPrincipal = state.loans.reduce((s, l) => s + l.principal, 0);
  const totalBalance = state.loans.reduce((s, l) => s + l.balance, 0);
  const totalMonthlyEMI = state.loans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);

  // Live loan calculator preview
  const previewPrincipal = Number(form.amount) || 0;
  const previewRate = Number(form.rate) || 0;
  const previewTenure = Number(form.tenureMonths) || 12;
  const liveCalc = useMemo(() => {
    if (previewPrincipal <= 0) return null;
    const effectiveRate = form.interestBasis === 'monthly' ? previewRate * 12 : previewRate;
    return calculateLoan(previewPrincipal, effectiveRate, previewTenure, form.method);
  }, [previewPrincipal, previewRate, previewTenure, form.method, form.interestBasis]);

  const submit = () => {
    if (!form.lender || !form.amount) return;
    const principal = Number(form.amount);
    const rate = Number(form.rate) || 0;
    const tenure = Number(form.tenureMonths) || 12;
    const effectiveRate = form.interestBasis === 'monthly' ? rate * 12 : rate;
    const calc = calculateLoan(principal, effectiveRate, tenure, form.method);

    const startDate = form.startDate || new Date().toISOString().slice(0, 10);
    const defaultDue = new Date(startDate);
    defaultDue.setMonth(defaultDue.getMonth() + tenure);
    const dueDate = form.dueDate || defaultDue.toISOString().slice(0, 10);

    const entry: Loan = {
      id: editId || 'ln_' + Date.now(),
      lender: form.lender,
      principal,
      rate,
      method: form.method,
      interestBasis: form.interestBasis,
      tenureMonths: tenure,
      startDate,
      dueDate,
      balance: principal,
      monthlyPayment: calc.monthlyPayment,
      totalInterest: calc.totalInterest,
      repayments: [],
    };

    if (editId) {
      dispatch({ type: 'UPDATE_LOAN', entry });
      toast.success('Loan record updated');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_LOAN', entry });
      toast.success('Loan record added');
    }

    setForm({
      lender: '',
      amount: '',
      rate: '12',
      method: 'reducing_balance',
      interestBasis: 'annual',
      tenureMonths: '12',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
    });
  };

  const handleRecordRepayment = () => {
    if (!repayingLoan || !repaymentForm.amount || Number(repaymentForm.amount) <= 0) return;
    dispatch({
      type: 'RECORD_LOAN_REPAYMENT',
      id: repayingLoan.id,
      amount: Number(repaymentForm.amount),
      note: repaymentForm.note,
      date: repaymentForm.date,
    });
    toast.success(`Repayment of ${formatRs(Number(repaymentForm.amount))} logged`);
    setRepayingLoan(null);
    setRepaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  const handleDelete = async (id: string, lender: string) => {
    const ok = await confirm({
      title: 'Delete Loan',
      message: `Are you sure you want to remove the loan record for "${lender}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_LOAN', id });
      toast.success('Loan record deleted');
    }
  };

  const amortizationSchedule: AmortizationRow[] = useMemo(() => {
    if (!amortizingLoan) return [];
    const effectiveRate = amortizingLoan.interestBasis === 'monthly'
      ? (amortizingLoan.rate || 0) * 12
      : amortizingLoan.rate || 0;
    return calculateAmortizationSchedule(
      amortizingLoan.principal,
      effectiveRate,
      amortizingLoan.tenureMonths || 12
    );
  }, [amortizingLoan]);

  return (
    <div className="space-y-6">
      {/* Top Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total Borrowed"
          value={formatRs(totalPrincipal)}
          tone="default"
          icon={<Icon name="financial" size={18} />}
        />
        <StatCard
          label="Outstanding Balance"
          value={formatRs(totalBalance)}
          tone="danger"
          icon={<Icon name="arrow-down" size={18} />}
        />
        <StatCard
          label="Monthly Outflow (EMI)"
          value={formatRs(totalMonthlyEMI)}
          tone="warning"
          icon={<Icon name="calendar" size={18} />}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-sm text-text">Loans & Mortgages</h3>
          {state.loans.length === 0 ? (
            <EmptyState
              title="No active loans"
              helper="Add personal, business, or bank loans to calculate amortization and log repayments."
            />
          ) : (
            <div className="space-y-3">
              {state.loans.map(ln => {
                const paidAmount = ln.principal - ln.balance;
                const progressPct = ln.principal > 0 ? Math.min(100, Math.round((paidAmount / ln.principal) * 100)) : 0;
                return (
                  <Card key={ln.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-text">{ln.lender}</div>
                        <div className="text-xs text-muted mt-0.5">
                          Principal <span className="font-semibold num text-text">{formatRs(ln.principal)}</span> · {ln.rate}% ({ln.interestBasis || 'annual'}) · {ln.tenureMonths || 12}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted">Remaining Balance</div>
                        <div className="text-base font-bold text-primary-text num">{formatRs(ln.balance)}</div>
                      </div>
                    </div>

                    <ProgressBar value={paidAmount} max={ln.principal} tone="primary" size="sm" />
                    <div className="flex justify-between text-xs text-muted">
                      <span>{progressPct}% repaid ({formatRs(paidAmount)})</span>
                      <span>Due: {ln.dueDate}</span>
                    </div>

                    {ln.monthlyPayment && (
                      <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border flex items-center justify-between text-xs">
                        <span className="text-muted">Calculated Monthly EMI:</span>
                        <span className="font-bold text-text num">{formatRs(ln.monthlyPayment)}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRepayingLoan(ln);
                            setRepaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
                          }}
                        >
                          Log Repayment
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAmortizingLoan(ln)}
                        >
                          Amortization Schedule
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:text-danger-text !p-1.5"
                          onClick={() => handleDelete(ln.id, ln.lender)}
                          aria-label="Delete loan"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Previous Repayments list */}
                    {ln.repayments && ln.repayments.length > 0 && (
                      <div className="pt-2 border-t border-border/40 text-xs">
                        <span className="text-[11px] font-semibold text-muted mb-1 block">Recent Repayments:</span>
                        <div className="space-y-1">
                          {ln.repayments.slice(-3).reverse().map((r, idx) => (
                            <div key={idx} className="flex justify-between text-muted text-[11px]">
                              <span>{r.date} {r.note ? `· ${r.note}` : ''}</span>
                              <span className="font-medium text-success-text num">-{formatRs(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Loan Form */}
        <Card className="p-5 h-fit">
          <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit loan' : 'Add Loan'}</h3>
          <div className="space-y-3.5">
            <Field id="loan-lender" label="Lender / Institution">
              <Input
                value={form.lender}
                onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                placeholder="e.g. Commercial Bank, Mortgage"
              />
            </Field>
            <Field id="loan-principal" label="Principal Amount (Rs.)">
              <MoneyField
                value={form.amount}
                onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
                placeholder="1,000,000"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="loan-rate" label="Interest rate (%)">
                <Input
                  type="number"
                  step="0.1"
                  value={form.rate}
                  onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                  placeholder="12"
                />
              </Field>
              <Field id="loan-basis" label="Interest Basis">
                <Select
                  value={form.interestBasis}
                  onChange={e => setForm(f => ({ ...f, interestBasis: e.target.value as any }))}
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="loan-tenure" label="Tenure (Months)">
                <Input
                  type="number"
                  value={form.tenureMonths}
                  onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))}
                  placeholder="12"
                />
              </Field>
              <Field id="loan-method" label="Method">
                <Select
                  value={form.method}
                  onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
                >
                  <option value="reducing_balance">Reducing Balance</option>
                  <option value="simple">Simple / Flat</option>
                  <option value="compound">Compound</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="loan-start" label="Start Date">
                <DateField
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </Field>
              <Field id="loan-due" label="Due Date (optional)">
                <DateField
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </Field>
            </div>

            {/* Live Loan Calculation Box */}
            {liveCalc && (
              <div className="p-3 rounded-xl bg-surface-hover/70 border border-primary-500/30 text-xs space-y-1.5">
                <div className="font-semibold text-text flex items-center gap-1.5">
                  <Icon name="check" size={14} className="text-primary-text" />
                  <span>Loan Projection</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Monthly EMI:</span>
                  <span className="font-bold text-text num">{formatRs(liveCalc.monthlyPayment)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Total Interest:</span>
                  <span className="font-semibold text-text num">{formatRs(liveCalc.totalInterest)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Total Payable:</span>
                  <span className="font-bold text-primary-text num">{formatRs(liveCalc.totalPayment)}</span>
                </div>
              </div>
            )}

            <Button variant="primary" className="w-full pt-1" onClick={submit}>
              Save Loan
            </Button>
          </div>
        </Card>
      </div>

      {/* Repayment Sheet */}
      <Sheet
        isOpen={Boolean(repayingLoan)}
        onClose={() => setRepayingLoan(null)}
        title="Record Loan Repayment"
        description={repayingLoan ? `Log a payment for ${repayingLoan.lender}` : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="repay-amount" label="Repayment Amount (Rs.)">
            <MoneyField
              value={repaymentForm.amount}
              onChange={v => setRepaymentForm(f => ({ ...f, amount: String(v) }))}
              placeholder="e.g. 25,000"
            />
          </Field>
          <Field id="repay-date" label="Payment Date">
            <DateField
              value={repaymentForm.date}
              onChange={e => setRepaymentForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field id="repay-note" label="Notes (optional)">
            <Input
              value={repaymentForm.note}
              onChange={e => setRepaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Regular monthly installment"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordRepayment}>
              Save Repayment
            </Button>
            <Button variant="secondary" onClick={() => setRepayingLoan(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Amortization Schedule Sheet */}
      <Sheet
        isOpen={Boolean(amortizingLoan)}
        onClose={() => setAmortizingLoan(null)}
        title="Amortization Schedule"
        description={amortizingLoan ? `${amortizingLoan.lender} · ${formatRs(amortizingLoan.principal)} at ${amortizingLoan.rate}%` : ''}
      >
        <div className="overflow-x-auto max-h-[60vh] mt-2">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>M#</th>
                <th className="text-right">Payment</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Interest</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {amortizationSchedule.map(row => (
                <tr key={row.month}>
                  <td className="text-muted num">#{row.month}</td>
                  <td className="text-right font-medium text-text num">{formatRs(row.payment)}</td>
                  <td className="text-right text-success-text num">{formatRs(row.principal)}</td>
                  <td className="text-right text-danger-text num">{formatRs(row.interest)}</td>
                  <td className="text-right font-bold text-text num">{formatRs(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>
    </div>
  );
}
