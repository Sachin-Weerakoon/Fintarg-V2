'use client';
import { useState, useMemo } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { FormCard } from '@/components/ui/FormCard';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
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
import { fetchLoanPayoff } from '@/services/storeApi';
import type { Loan } from '@/types';
import { getLocalDate } from '@/utils/date';
import { useFieldErrors } from '@/hooks/useFieldErrors';

const BANK_METHODS = ['bank_transfer', 'cheque', 'standing_order', 'debit_card'];

export function LoansTab({
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
  const defaultSourceType: 'salary' | 'business' = isBusinessOnly ? 'business' : (streamScope === 'business' ? 'business' : 'salary');

  const [form, setForm] = useState({
    lender: '',
    amount: '',
    rate: '12',
    method: 'reducing_balance' as 'reducing_balance' | 'simple' | 'compound',
    interestBasis: 'annual' as 'annual' | 'monthly',
    tenureMonths: '12',
    startDate: getLocalDate(),
    dueDate: '',
    sourceType: defaultSourceType,
    companyId: companyId && companyId !== 'all' ? companyId : '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const loanErrors = useFieldErrors<'lender' | 'amount' | 'rate' | 'tenureMonths' | 'startDate' | 'dueDate'>();
  const repayErrors = useFieldErrors<'bankAccountId' | 'amount' | 'date'>();

  // Repayment sheet state
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    date: getLocalDate(),
    note: '',
    paymentMethod: 'cash',
    bankAccountId: '',
  });

  // Amortization sheet state
  const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);

  const filteredLoans = useMemo(() => {
    let list = state.loans;
    if (streamScope === 'salary') {
      list = list.filter(l => l.sourceType !== 'business');
    } else if (streamScope === 'business') {
      list = list.filter(l => l.sourceType === 'business');
      if (companyId && companyId !== 'all') {
        list = list.filter(l => l.companyId === companyId);
      }
    }
    return list;
  }, [state.loans, streamScope, companyId]);

  // Summary calculations
  const totalPrincipal = filteredLoans.reduce((s, l) => s + l.principal, 0);
  const totalBalance = filteredLoans.reduce((s, l) => s + l.balance, 0);
  const totalMonthlyEMI = filteredLoans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);

  // Live loan calculator preview
  const previewPrincipal = Number(form.amount) || 0;
  const previewRate = Number(form.rate) || 0;
  const previewTenure = Number(form.tenureMonths) || 12;
  const liveCalc = useMemo(() => {
    if (previewPrincipal <= 0) return null;
    return calculateLoan(previewPrincipal, previewRate, previewTenure, form.method, form.interestBasis);
  }, [previewPrincipal, previewRate, previewTenure, form.method, form.interestBasis]);

  const submit = async () => {
    const rateValue = Number(form.rate);
    const tenureValue = Number(form.tenureMonths);
    const valid = loanErrors.check({
      lender: form.lender.trim() ? undefined : 'Enter the lender.',
      amount: Number(form.amount) > 0 ? undefined : 'Enter the principal amount.',
      rate: form.rate.trim() !== '' && rateValue >= 0 && rateValue <= 1000 ? undefined : 'Enter an interest rate from 0 to 1000.',
      tenureMonths: Number.isInteger(tenureValue) && tenureValue >= 1 && tenureValue <= 600 ? undefined : 'Enter 1 to 600 months.',
      startDate: form.startDate ? undefined : 'Choose the start date.',
      dueDate: form.dueDate && form.startDate && form.dueDate < form.startDate ? 'Due date cannot be before the start date.' : undefined,
    });
    if (!valid) return;
    const principal = Number(form.amount);
    const rate = rateValue;
    const tenure = tenureValue;
    const calc = calculateLoan(principal, rate, tenure, form.method, form.interestBasis);

    const startDate = form.startDate;
    const defaultDue = new Date(startDate);
    defaultDue.setMonth(defaultDue.getMonth() + tenure);
    const dueDate = form.dueDate || defaultDue.toISOString().slice(0, 10);

    const existingLoan = editId ? state.loans.find(l => l.id === editId) : null;
    const totalRepaid = existingLoan ? (existingLoan.repayments || []).reduce((s, r) => s + r.amount, 0) : 0;
    const newBalance = existingLoan ? Math.max(0, principal - totalRepaid) : principal;

    const entry: Loan = {
      id: editId || 'ln_' + Date.now(),
      lender: form.lender.trim(),
      principal,
      rate,
      method: form.method,
      interestBasis: form.interestBasis,
      tenureMonths: tenure,
      startDate,
      dueDate,
      balance: newBalance,
      monthlyPayment: calc.monthlyPayment,
      totalInterest: calc.totalInterest,
      sourceType: isBusinessOnly ? 'business' : (!isSalaryAndBusiness ? 'salary' : form.sourceType),
      companyId: (form.sourceType === 'business' || isBusinessOnly) ? (form.companyId || undefined) : undefined,
      repayments: existingLoan?.repayments || [],
    };

    setSaving(true);
    const ok = await save(editId ? { type: 'UPDATE_LOAN', entry } : { type: 'ADD_LOAN', entry });
    setSaving(false);
    // On failure the store has already rolled back and shown the server's reason; keep the input.
    if (!ok) return;
    toast.success(editId ? 'Loan record updated' : 'Loan record added');
    setEditId(null);

    loanErrors.reset();
    setForm({
      lender: '',
      amount: '',
      rate: '12',
      method: 'reducing_balance',
      interestBasis: 'annual',
      tenureMonths: '12',
      startDate: getLocalDate(),
      dueDate: '',
      sourceType: defaultSourceType,
      companyId: companyId && companyId !== 'all' ? companyId : '',
    });
  };

  const handleRecordRepayment = async () => {
    if (!repayingLoan) return;
    const valid = repayErrors.check({
      bankAccountId: BANK_METHODS.includes(repaymentForm.paymentMethod) && !repaymentForm.bankAccountId
        ? 'Select the account this is paid from.' : undefined,
      amount: Number(repaymentForm.amount) > 0 ? undefined : 'Enter the repayment amount.',
      date: repaymentForm.date ? undefined : 'Choose the payment date.',
    });
    if (!valid) return;
    setSaving(true);
    const ok = await save({
      type: 'RECORD_LOAN_REPAYMENT',
      id: repayingLoan.id,
      amount: Number(repaymentForm.amount),
      note: repaymentForm.note,
      date: repaymentForm.date,
      paymentMethod: repaymentForm.paymentMethod,
      bankAccountId: repaymentForm.bankAccountId || null,
    });
    setSaving(false);
    if (!ok) return;
    toast.success(`Repayment of ${formatRs(Number(repaymentForm.amount))} logged`);
    setRepayingLoan(null);
    setRepaymentForm({
      amount: '',
      date: getLocalDate(),
      note: '',
      paymentMethod: 'cash',
      bankAccountId: '',
    });
  };

  const handleUndoRepayment = async (loanId: string, repaymentId: string, amount: number) => {
    const ok = await confirm({
      title: 'Undo Repayment',
      message: `Undo repayment of ${formatRs(amount)}? Account balance and loan balance will be restored.`,
      confirmLabel: 'Yes, Undo',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (!ok) return;
    if (!(await save({
      type: 'DELETE_LOAN_REPAYMENT',
      id: loanId,
      repaymentId,
    }))) return;
    toast.success(`Repayment of ${formatRs(amount)} undone`);
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
      if (await save({ type: 'DELETE_LOAN', id })) toast.success('Loan record deleted');
    }
  };

  const amortizationSchedule: AmortizationRow[] = useMemo(() => {
    if (!amortizingLoan) return [];
    return calculateAmortizationSchedule(
      amortizingLoan.principal,
      amortizingLoan.rate || 0,
      amortizingLoan.tenureMonths || 12,
      amortizingLoan.interestBasis || 'annual'
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
          label="Monthly Outflow"
          value={formatRs(totalMonthlyEMI)}
          tone="warning"
          icon={<Icon name="calendar" size={18} />}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-sm text-text">Loans & Mortgages</h3>
          {filteredLoans.length === 0 ? (
            <EmptyState
              title="No active loans"
              helper={streamScope === 'business' ? 'No business loans recorded for this filter.' : 'Add personal, business, or bank loans to calculate amortization and log repayments.'}
            />
          ) : (
            <div className="space-y-3">
              {filteredLoans.map(ln => {
                const paidAmount = ln.principal - ln.balance;
                const progressPct = ln.principal > 0 ? Math.min(100, Math.round((paidAmount / ln.principal) * 100)) : 0;
                const linkedCompany = ln.companyId ? state.companies.find(c => c.id === ln.companyId) : null;
                return (
                  <Card key={ln.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-text">{ln.lender}</span>
                        {isSalaryAndBusiness && (
                          <Badge tone={ln.sourceType === 'business' ? 'warning' : 'neutral'} size="sm">
                            {ln.sourceType === 'business' ? (linkedCompany ? linkedCompany.name : 'Business') : 'Salary'}
                          </Badge>
                        )}
                        {isBusinessOnly && linkedCompany && (
                          <Badge tone="warning" size="sm">
                            {linkedCompany.name}
                          </Badge>
                        )}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          Principal <span className="font-semibold num text-text">{formatRs(ln.principal)}</span> · {ln.rate}% ({ln.interestBasis || 'annual'}) · {ln.method === 'simple' ? 'Flat' : 'Reducing Balance'} · {ln.tenureMonths || 12}M
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRepayingLoan(ln);
                            repayErrors.reset();
                            setRepaymentForm({
                              amount: '',
                              date: getLocalDate(),
                              note: '',
                              paymentMethod: 'cash',
                              bankAccountId: '',
                            });
                          }}
                        >
                          Log Repayment
                        </Button>
                        {ln.balance > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const today = getLocalDate();
                              // Settlement includes interest accrued since the last installment, which only the server knows exactly.
                              let settlementAmount = ln.balance;
                              try {
                                settlementAmount = (await fetchLoanPayoff(ln.id, today)).payoffAmount;
                              } catch {
                                toast.error('Could not fetch the exact settlement amount; using the outstanding balance instead');
                              }
                              setRepayingLoan(ln);
                              repayErrors.reset();
                            repayErrors.reset();
                              setRepaymentForm({
                                amount: String(settlementAmount),
                                date: today,
                                note: 'Full payoff / Early settlement',
                                paymentMethod: 'cash',
                                bankAccountId: '',
                              });
                            }}
                          >
                            Settle Loan
                          </Button>
                        )}
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
                          {ln.repayments.slice(-3).reverse().map((r, idx) => {
                            const repId = r.id || r._id || '';
                            return (
                              <div key={idx} className="flex justify-between items-center text-muted text-[11px]">
                                <span>
                                  {r.date} {r.note ? `· ${r.note}` : ''}
                                  {r.paymentMethod && r.paymentMethod !== 'cash' ? ` (${r.paymentMethod.replace('_', ' ')})` : ''}
                                  {r.principal !== undefined && r.interest !== undefined ? ` [P: ${formatRs(r.principal)} | I: ${formatRs(r.interest)}]` : ''}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-success-text num">-{formatRs(r.amount)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUndoRepayment(ln.id, repId, r.amount)}
                                      className="!p-0.5 h-auto text-muted hover:text-danger-text"
                                      title="Undo repayment"
                                      aria-label="Undo repayment"
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

        {/* Add Loan Form */}
        <FormCard
          icon="financial"
          title={editId ? 'Edit Loan' : 'Add Loan'}
          badge={editId ? 'Editing' : undefined}
          actions={
            editId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null);
                  loanErrors.reset();
                  setForm({
                    lender: '',
                    amount: '',
                    rate: '',
                    interestBasis: 'annual',
                    tenureMonths: '12',
                    method: 'reducing_balance',
                    startDate: getLocalDate(),
                    dueDate: '',
                    sourceType: defaultSourceType,
                    companyId: companyId && companyId !== 'all' ? companyId : '',
                  });
                }}
              >
                Cancel
              </Button>
            ) : undefined
          }
          className="h-fit sticky top-4"
        >
          {isSalaryAndBusiness && (
            <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-3 mb-2">
              <Field id="loan-source-type" label="Loan Purpose / Funds Source">
                <SegmentedTabs
                  size="sm"
                  options={[
                    { id: 'salary', label: 'Salary / Personal' },
                    { id: 'business', label: 'Business' },
                  ]}
                  value={form.sourceType}
                  onChange={v => setForm(f => ({ ...f, sourceType: v as 'salary' | 'business', companyId: '' }))}
                />
              </Field>
              {form.sourceType === 'business' && state.companies.length > 0 && (
                <Field id="loan-company" label="Business Enterprise (Optional)">
                  <Select
                    value={form.companyId}
                    onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
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
              <Field id="loan-company" label="Business Enterprise (Optional)">
                <Select
                  value={form.companyId}
                  onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                >
                  <option value="">General Business (Unlinked)</option>
                  {state.companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <Field id="loan-lender" label="Lender" required error={loanErrors.errors.lender}>
            <Input
              value={form.lender}
              onChange={e => { setForm(f => ({ ...f, lender: e.target.value })); loanErrors.clear('lender'); }}
              placeholder="e.g. Commercial Bank, Mortgage Ltd."
            />
          </Field>
          <Field id="loan-principal" label="Principal Amount" required error={loanErrors.errors.amount}>
            <MoneyField
              value={form.amount}
              onChange={v => { setForm(f => ({ ...f, amount: String(v) })); loanErrors.clear('amount'); }}
              placeholder="e.g. 1,000,000"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-rate" label="Interest Rate %" required error={loanErrors.errors.rate}>
              <Input
                type="number"
                step="0.1"
                value={form.rate}
                onChange={e => { setForm(f => ({ ...f, rate: e.target.value })); loanErrors.clear('rate'); }}
                placeholder="e.g. 12"
              />
            </Field>
            <Field id="loan-basis" label="Interest Basis" required>
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
            <Field id="loan-tenure" label="Tenure in Months" required error={loanErrors.errors.tenureMonths}>
              <Input
                type="number"
                value={form.tenureMonths}
                onChange={e => { setForm(f => ({ ...f, tenureMonths: e.target.value })); loanErrors.clear('tenureMonths'); }}
                placeholder="e.g. 12"
              />
            </Field>
            <Field id="loan-method" label="Method" required>
              <Select
                value={form.method}
                onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
              >
                <option value="reducing_balance">Reducing Balance</option>
                <option value="simple">Simple</option>
                <option value="compound">Compound</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-start" label="Start Date" required error={loanErrors.errors.startDate}>
              <DateField
                value={form.startDate}
                onChange={e => { setForm(f => ({ ...f, startDate: e.target.value })); loanErrors.clear('startDate', 'dueDate'); }}
              />
            </Field>
            <Field id="loan-due" label="Due Date" error={loanErrors.errors.dueDate}>
              <DateField
                value={form.dueDate}
                onChange={e => { setForm(f => ({ ...f, dueDate: e.target.value })); loanErrors.clear('dueDate'); }}
              />
            </Field>
          </div>

          {/* Live Loan Calculation Box */}
          {liveCalc && (
            <div className="p-3.5 rounded-xl bg-primary-tint/25 dark:bg-primary-tint/15 border border-primary-500/30 text-xs space-y-2">
              <div className="font-semibold text-text flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary-text font-bold">
                  <Icon name="bolt" size={14} />
                  <span>Calculated Projections</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-primary-text bg-primary-500/10 px-1.5 py-0.5 rounded">
                  Amortized
                </span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Monthly EMI:</span>
                <span className="font-bold text-text num text-sm">{formatRs(liveCalc.monthlyPayment)}</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Total Interest:</span>
                <span className="font-semibold text-text num">{formatRs(liveCalc.totalInterest)}</span>
              </div>
              <div className="flex justify-between items-center text-muted border-t border-primary-500/15 pt-1.5">
                <span className="font-semibold text-text">Total Outflow:</span>
                <span className="font-bold text-primary-text num text-sm">{formatRs(liveCalc.totalPayment)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              className="flex-1 shadow-sm hover:shadow-primary-500/20"
              iconLeft={<Icon name={editId ? 'check' : 'plus'} size={15} />}
              onClick={submit}
              loading={saving}
            >
              {editId ? 'Update Loan' : 'Save Loan Record'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  loanErrors.reset();
                  setForm({
                    lender: '',
                    amount: '',
                    rate: '',
                    interestBasis: 'annual',
                    tenureMonths: '12',
                    method: 'reducing_balance',
                    startDate: getLocalDate(),
                    dueDate: '',
                    sourceType: defaultSourceType,
                    companyId: companyId && companyId !== 'all' ? companyId : '',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </FormCard>
      </div>

      {/* Repayment Sheet */}
      <Sheet
        isOpen={Boolean(repayingLoan)}
        onClose={() => setRepayingLoan(null)}
        title="Record Loan Repayment"
        description={repayingLoan ? repayingLoan.lender : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="repay-method" label="Payment Method">
            <Select
              value={repaymentForm.paymentMethod}
              onChange={e => { setRepaymentForm(f => ({ ...f, paymentMethod: e.target.value })); repayErrors.clear('bankAccountId'); }}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="standing_order">Standing Order</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          {['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(repaymentForm.paymentMethod) && (
            <Field id="repay-account" label="Debit Bank Account" required error={repayErrors.errors.bankAccountId}>
              <Select
                value={repaymentForm.bankAccountId}
                onChange={e => { setRepaymentForm(f => ({ ...f, bankAccountId: e.target.value })); repayErrors.clear('bankAccountId'); }}
              >
                <option value="">Select Account...</option>
                {state.bankAccounts.filter(b => !b.isArchived).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} · {b.accountNumber} · {formatRs(b.currentBalance)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field id="repay-amount" label="Repayment Amount" required error={repayErrors.errors.amount}>
            <MoneyField
              value={repaymentForm.amount}
              onChange={v => { setRepaymentForm(f => ({ ...f, amount: String(v) })); repayErrors.clear('amount'); }}
              placeholder="e.g. 25,000"
            />
          </Field>
          <Field id="repay-date" label="Payment Date" required error={repayErrors.errors.date}>
            <DateField
              value={repaymentForm.date}
              onChange={e => { setRepaymentForm(f => ({ ...f, date: e.target.value })); repayErrors.clear('date'); }}
            />
          </Field>
          <Field id="repay-note" label="Notes">
            <Input
              value={repaymentForm.note}
              onChange={e => setRepaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Regular monthly installment"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordRepayment} loading={saving}>
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
