'use client';
import { useState, useMemo } from 'react';
import {
  useApp,
  formatRs,
  calcMonthlyExpenses,
  calcMonthlyIncome,
  calcFinancePayments,
  calcDailyExpenseBudget,
} from '@/store';
import { Card } from '@/components/ui/Card';
import { FormCard } from '@/components/ui/FormCard';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PaymentMethodField, PaymentMethod } from '@/components/ui/PaymentMethodField';
import { BankSelect } from '@/components/ui/BankSelect';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { EXPENSE_CATS } from '@/utils/bankData';
import type { ExpenseEntry } from '@/types';

export function ExpensesTab({
  month,
  streamScope = 'all',
  companyId,
}: {
  month: string;
  streamScope?: 'all' | 'salary' | 'business';
  companyId?: string;
}) {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const hasBusiness = state.profile.workMode === 'both' || state.profile.workMode === 'business' || (state.companies && state.companies.length > 0);
  const defaultCompanyId = state.companies[0]?.id || '';

  const [form, setForm] = useState({
    date: month + '-' + new Date().toISOString().slice(8, 10),
    category: 'Food',
    amount: '',
    note: '',
    recurring: false,
    paymentMethod: 'cash' as PaymentMethod,
    bankAccountId: '',
    cardId: '',
    sourceType: (streamScope === 'business' ? 'business' : 'salary') as 'salary' | 'business',
    companyId: (companyId && companyId !== 'all') ? companyId : defaultCompanyId,
    branchId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  // Filter expenses according to streamScope and company filter
  const streamFilteredExpenses = useMemo(() => {
    let list = state.expenses.filter(e => e.date.startsWith(month));
    if (streamScope === 'salary') {
      list = list.filter(e => e.sourceType !== 'business');
    } else if (streamScope === 'business') {
      list = list.filter(e => e.sourceType === 'business');
      if (companyId && companyId !== 'all') {
        list = list.filter(e => e.companyId === companyId);
      }
    }
    return list;
  }, [state.expenses, month, streamScope, companyId]);

  const monthTotal = streamFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const catMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of streamFilteredExpenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return map;
  }, [streamFilteredExpenses]);
  const cats = ['All', ...Object.keys(catMap).sort()];

  const filtered = useMemo(() => {
    return streamFilteredExpenses
      .filter(e => catFilter === 'All' || e.category === catFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [streamFilteredExpenses, catFilter]);

  // Real days-left & daily budget computation
  const totalMonthlyIncome = calcMonthlyIncome(state.income, month, state.employmentProfiles);
  const recurringObligations = calcFinancePayments(state.financePayments);
  const { daysLeft, dailyBudget } = calcDailyExpenseBudget({
    monthlyIncome: totalMonthlyIncome,
    obligations: recurringObligations,
    monthlyExpenses: monthTotal,
    month,
  });

  const companyBranches = useMemo(() => {
    if (!form.companyId) return [];
    return state.businessBranches.filter(b => b.companyId === form.companyId);
  }, [state.businessBranches, form.companyId]);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    const entry: ExpenseEntry = {
      id: editId || 'e_' + Date.now(),
      date: form.date,
      category: form.category,
      amount: Number(form.amount),
      note: form.note,
      recurring: form.recurring,
      paymentMethod: form.paymentMethod,
      bankAccountId: form.bankAccountId || undefined,
      cardId: form.cardId || undefined,
      sourceType: form.sourceType,
      companyId: form.sourceType === 'business' ? (form.companyId || undefined) : undefined,
      branchId: form.sourceType === 'business' ? (form.branchId || undefined) : undefined,
    };

    if (editId) {
      dispatch({ type: 'UPDATE_EXPENSE', entry });
      toast.success('Expense updated');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_EXPENSE', entry });
      toast.success('Expense recorded');
    }
    setForm({
      date: month + '-' + new Date().toISOString().slice(8, 10),
      category: 'Food',
      amount: '',
      note: '',
      recurring: false,
      paymentMethod: 'cash',
      bankAccountId: '',
      cardId: '',
      sourceType: (streamScope === 'business' ? 'business' : 'salary'),
      companyId: (companyId && companyId !== 'all') ? companyId : defaultCompanyId,
      branchId: '',
    });
    setError('');
  };

  const handleEdit = (expense: ExpenseEntry) => {
    setEditId(expense.id);
    setForm({
      date: expense.date,
      category: expense.category,
      amount: String(expense.amount),
      note: expense.note || '',
      recurring: !!expense.recurring,
      paymentMethod: (expense.paymentMethod as PaymentMethod) || 'cash',
      bankAccountId: expense.bankAccountId || '',
      cardId: expense.cardId || '',
      sourceType: (expense.sourceType === 'business' ? 'business' : 'salary'),
      companyId: expense.companyId || defaultCompanyId,
      branchId: expense.branchId || '',
    });
    setError('');
  };

  const handleDelete = async (id: string, amount: number, category: string) => {
    const ok = await confirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete this ${formatRs(amount)} ${category} expense?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_EXPENSE', id });
      toast.success('Expense deleted');
    }
  };

  const columns: Column<ExpenseEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: e => <span className="text-muted num">{e.date}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: e => <span className="font-medium text-text">{e.category}</span>,
    },
    {
      key: 'source',
      header: 'Paid Out From',
      render: e => {
        if (e.sourceType === 'business') {
          const comp = state.companies.find(c => c.id === e.companyId);
          const br = state.businessBranches.find(b => b.id === e.branchId);
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-text bg-primary-tint/30 border border-primary/20 px-2.5 py-0.5 rounded-md">
              <Icon name="bank" size={12} />
              <span className="truncate max-w-[130px]">{comp?.name || 'Business Cash'}</span>
              {br && <span className="text-muted font-normal">· {br.name}</span>}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted bg-surface-hover px-2 py-0.5 rounded-md">
            <Icon name="wallet" size={12} />
            <span>Job Salary</span>
          </span>
        );
      },
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: e => {
        const linkedBank = state.bankAccounts.find(b => b.id === e.bankAccountId);
        return (
          <span className="text-xs text-muted capitalize">
            {(e.paymentMethod || 'cash').replace('_', ' ')}
            {linkedBank && ` (${linkedBank.bankName})`}
          </span>
        );
      },
    },
    {
      key: 'note',
      header: 'Note',
      render: e => <span className="text-muted">{e.note || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: e => <span className="font-medium text-text num">{formatRs(e.amount)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      className: 'w-24',
      render: e => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="!p-1 text-muted hover:text-text"
            onClick={() => handleEdit(e)}
            aria-label="Edit expense"
          >
            <Icon name="edit" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!p-1 text-danger-text hover:bg-danger-tint"
            onClick={() => handleDelete(e.id, e.amount, e.category)}
            aria-label="Delete expense"
          >
            <Icon name="trash" size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* List and Statistics */}
      <div className="lg:col-span-2 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Monthly Outflow"
            value={formatRs(monthTotal)}
            detail={streamScope === 'business' ? 'Business operating expenses' : streamScope === 'salary' ? 'Personal job living costs' : 'Consolidated cash outflow'}
            tone="danger"
            icon={<Icon name="arrow-down" size={18} />}
          />
          <StatCard
            label="Days Left in Month"
            value={`${daysLeft} days`}
            detail="Current billing cycle"
            tone="default"
            icon={<Icon name="calendar" size={18} />}
          />
          <StatCard
            label="Daily Expense Target"
            value={formatRs(dailyBudget)}
            detail="Recommended spending"
            tone="default"
            icon={<Icon name="financial" size={18} />}
          />
        </div>

        {/* Category Breakdown Chips */}
        {cats.length > 2 && (
          <Card className="p-4">
            <div className="text-xs font-semibold text-text uppercase tracking-wider mb-2.5">
              Expense Category Breakdown ({streamFilteredExpenses.length} entries)
            </div>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => {
                const isSelected = catFilter === c;
                const amt = c === 'All' ? monthTotal : (catMap[c] || 0);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-surface hover:bg-surface-hover text-text border border-border'
                    }`}
                  >
                    <span>{c}</span>
                    <span className={`text-[11px] num ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      ({formatRs(amt)})
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={e => e.id}
          emptyState={
            <EmptyState
              title="No expenses recorded"
              helper={streamScope === 'business' ? 'No operating expenses logged for this business stream this month.' : 'Add your first expense for this month to track cash outflow and maintain your budget.'}
            />
          }
        />
      </div>

      {/* Form */}
      <FormCard
        icon="wallet"
        title={editId ? 'Edit Expense' : 'Record Expense'}
        description={editId ? 'Modify this recorded transaction details' : 'Log cash outflow against your monthly budget'}
        badge={editId ? 'Editing' : undefined}
        actions={
          editId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditId(null);
                setForm({
                  date: month + '-' + new Date().toISOString().slice(8, 10),
                  category: 'Food',
                  amount: '',
                  note: '',
                  recurring: false,
                  paymentMethod: 'cash',
                  bankAccountId: '',
                  cardId: '',
                  sourceType: (streamScope === 'business' ? 'business' : 'salary'),
                  companyId: (companyId && companyId !== 'all') ? companyId : defaultCompanyId,
                  branchId: '',
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
        {/* Paid Out From Funding Source Selector */}
        {hasBusiness && (
          <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-3">
            <Field id="expense-source-type" label="Paid Out From / Funding Source">
              <SegmentedTabs
                size="sm"
                options={[
                  { id: 'salary', label: 'Job Salary Cash' },
                  { id: 'business', label: 'Business Cash' },
                ]}
                value={form.sourceType}
                onChange={v => setForm(f => ({ ...f, sourceType: v as any }))}
              />
            </Field>

            {form.sourceType === 'business' && (
              <>
                <Field id="expense-company" label="From Which Business?" required>
                  <Select
                    value={form.companyId}
                    onChange={e => {
                      const cid = e.target.value;
                      setForm(f => ({ ...f, companyId: cid, branchId: '' }));
                    }}
                  >
                    {state.companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>

                {companyBranches.length > 0 && (
                  <Field id="expense-branch" label="Branch / Outlet (Optional)">
                    <Select
                      value={form.branchId}
                      onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                    >
                      <option value="">General Enterprise Overhead</option>
                      {companyBranches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} · {b.location || 'HQ'}</option>
                      ))}
                    </Select>
                  </Field>
                )}
              </>
            )}
          </div>
        )}

        <Field id="expense-date" label="Date" required>
          <DateField
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </Field>
        <Field id="expense-category" label="Category" required>
          <Select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field id="expense-amount" label="Amount (Rs.)" required error={error}>
          <MoneyField
            value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: String(v) }))}
            hasError={!!error}
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
        {form.paymentMethod === 'card' && state.cards.length > 0 && (
          <Field id="expense-card" label="Card">
            <Select
              value={form.cardId}
              onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
            >
              <option value="">Select Card</option>
              {state.cards.map(c => (
                <option key={c.id} value={c.id}>{c.name} (•••• {c.lastFourDigits})</option>
              ))}
            </Select>
          </Field>
        )}
        <Field id="expense-note" label="Note">
          <Input
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Supplier payment, Office electricity, Stock purchase"
          />
        </Field>
        <Checkbox
          label="Recurring monthly obligation"
          checked={form.recurring}
          onChange={checked => setForm(f => ({ ...f, recurring: checked }))}
        />
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1 shadow-sm hover:shadow-primary-500/20"
            iconLeft={<Icon name={editId ? 'check' : 'plus'} size={15} />}
            onClick={submit}
          >
            {editId ? 'Update Expense' : 'Save Expense'}
          </Button>
          {editId && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditId(null);
                setForm({
                  date: month + '-' + new Date().toISOString().slice(8, 10),
                  category: 'Food',
                  amount: '',
                  note: '',
                  recurring: false,
                  paymentMethod: 'cash',
                  bankAccountId: '',
                  cardId: '',
                  sourceType: (streamScope === 'business' ? 'business' : 'salary'),
                  companyId: (companyId && companyId !== 'all') ? companyId : defaultCompanyId,
                  branchId: '',
                });
                setError('');
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </FormCard>
    </div>
  );
}
