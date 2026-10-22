'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useApp,
  formatRs,
  calcAnalysis,
  calcPersonalSpent,
  getDaysInMonth,
  calcTotalSavingsTarget,
  validateGoalPace,
  calcDailyPersonalAllowance,
} from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FormCard } from '@/components/ui/FormCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { SegmentedTabs, type TabOption } from '@/components/ui/SegmentedTabs';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import type { SavingsGoal } from '@/types';
import { getLocalDate } from '@/utils/date';

type GoalDomain = 'personal' | 'business' | 'branch';

function GoalsContent() {
  const _router = useRouter();
  const searchParams = useSearchParams();

  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const [month, setMonth] = useSelectedMonth();

  const hasBusiness =
    state.profile.plan === 'business' ||
    state.profile.workMode !== 'salary' ||
    (state.companies && state.companies.length > 0) ||
    (state.businessBranches && state.businessBranches.length > 0);

  // Domain Switcher State
  const urlDomain = searchParams.get('domain') as GoalDomain | null;
  const initialDomain: GoalDomain = (['personal', 'business', 'branch'] as GoalDomain[]).includes(urlDomain as any)
    ? (urlDomain as GoalDomain)
    : 'personal';
  const [domain, setDomain] = useState<GoalDomain>(hasBusiness ? initialDomain : 'personal');

  // Company and Branch Selectors
  const urlCompanyId = searchParams.get('companyId');
  const urlBranchId = searchParams.get('branchId');

  const [selectedCompanyId, setSelectedCompanyId] = useState(
    urlCompanyId && state.companies.some(c => c.id === urlCompanyId)
      ? urlCompanyId
      : state.companies[0]?.id || ''
  );

  const selectedCompany = state.companies.find(c => c.id === selectedCompanyId) || state.companies[0];
  const companyBranches = state.businessBranches.filter(b => b.companyId === (selectedCompany?.id || selectedCompanyId));

  const [selectedBranchId, setSelectedBranchId] = useState(
    urlBranchId && companyBranches.some(b => b.id === urlBranchId)
      ? urlBranchId
      : companyBranches[0]?.id || ''
  );

  const selectedBranch = companyBranches.find(b => b.id === selectedBranchId) || companyBranches[0];

  const handleCompanySelect = (newCoId: string) => {
    setSelectedCompanyId(newCoId);
    const firstBr = state.businessBranches.find(b => b.companyId === newCoId);
    if (firstBr) setSelectedBranchId(firstBr.id);
  };

  // Goals categorized by domain
  const personalGoals = useMemo(
    () => state.savingsGoals.filter(g => !g.scope || g.scope === 'personal'),
    [state.savingsGoals]
  );

  const businessGoals = useMemo(
    () => state.savingsGoals.filter(g => g.scope === 'business' && (!g.companyId || g.companyId === selectedCompany?.id)),
    [state.savingsGoals, selectedCompany?.id]
  );

  const branchGoals = useMemo(
    () => state.savingsGoals.filter(g => g.scope === 'branch' && (!g.branchId || g.branchId === selectedBranch?.id)),
    [state.savingsGoals, selectedBranch?.id]
  );

  // Goal Creation Form State
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    dailyAmount: '',
    targetType: 'reserve',
    companyId: '',
    branchId: '',
  });
  const [goalError, setGoalError] = useState('');

  // Contribution Form State per Goal
  const [saving, setSaving] = useState<Record<string, { amount: string; date: string; note: string; debitAccount?: boolean; paymentMethod?: string; bankAccountId?: string }>>({});
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ dailyAmount: '' });

  // Inline Corporate Revenue Target Editing
  const [editingCompTarget, setEditingCompTarget] = useState(false);
  const [compTargetInput, setCompTargetInput] = useState(String(selectedCompany?.monthlyRevenueTarget || ''));

  useEffect(() => {
    setCompTargetInput(String(selectedCompany?.monthlyRevenueTarget || ''));
  }, [selectedCompany?.id, selectedCompany?.monthlyRevenueTarget]);

  const handleSaveCompanyTarget = () => {
    if (!selectedCompany) return;
    const val = Number(compTargetInput) || 0;
    dispatch({
      type: 'UPDATE_COMPANY',
      entry: {
        ...selectedCompany,
        monthlyRevenueTarget: val,
        annualRevenueTarget: val * 12,
      },
    });
    setEditingCompTarget(false);
    toast.success('Corporate monthly revenue target updated.');
  };

  // Inline Branch Revenue Target Editing
  const [editingBranchTarget, setEditingBranchTarget] = useState(false);
  const [branchTargetInput, setBranchTargetInput] = useState(String(selectedBranch?.monthlyTarget || ''));

  useEffect(() => {
    setBranchTargetInput(String(selectedBranch?.monthlyTarget || ''));
  }, [selectedBranch?.id, selectedBranch?.monthlyTarget]);

  const handleSaveBranchTarget = () => {
    if (!selectedBranch) return;
    const val = Number(branchTargetInput) || 0;
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: {
        ...selectedBranch,
        monthlyTarget: val,
        annualTarget: val * 12,
      },
    });
    setEditingBranchTarget(false);
    toast.success('Branch monthly target updated.');
  };

  // Delete Goal Action
  const handleDeleteGoal = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Financial Goal',
      message: `Are you sure you want to delete goal "${name}"? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_GOAL', id });
      toast.success(`Goal "${name}" deleted`);
    }
  };

  const daysInMonth = getDaysInMonth(month);
  const a = calcAnalysis(state, month);
  const { freeCash } = a;

  // Personal spending
  const personalSpent = calcPersonalSpent(state.expenses, month);
  const budget = state.personalSpendingBudget;
  const personalRemaining = budget - personalSpent;
  const personalPct = budget > 0 ? (personalSpent / budget) * 100 : 0;
  const personalAllowance = calcDailyPersonalAllowance({ personalBudget: budget, personalSpent, month });

  // Debounced personal budget editing
  const [budgetInput, setBudgetInput] = useState(String(state.personalSpendingBudget || 0));

  useEffect(() => {
    setBudgetInput(String(state.personalSpendingBudget || 0));
  }, [state.personalSpendingBudget]);

  useEffect(() => {
    const val = Number(budgetInput) || 0;
    if (val === state.personalSpendingBudget) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_PERSONAL_SPENDING_BUDGET', budget: val, month });
    }, 400);
    return () => clearTimeout(timer);
  }, [budgetInput, dispatch, month, state.personalSpendingBudget]);

  // Personal multi-goal feasibility
  const totalSavingsTarget = calcTotalSavingsTarget(personalGoals, month);
  const savingsExceedsCash = totalSavingsTarget > freeCash;

  // Corporate Revenue Performance
  const companyRevenue = useMemo(() => {
    if (!selectedCompany) return 0;
    return companyBranches
      .flatMap(b => b.entries)
      .filter(e => e.type === 'revenue' && e.date.startsWith(month))
      .reduce((s, e) => s + e.amount, 0);
  }, [companyBranches, month, selectedCompany]);

  const companyMonthlyTarget = selectedCompany?.monthlyRevenueTarget || 0;
  const companyTargetPct = companyMonthlyTarget > 0 ? Math.min(100, Math.round((companyRevenue / companyMonthlyTarget) * 100)) : 0;

  // Branch Revenue Performance & Run-Rate
  const branchRevenue = useMemo(() => {
    if (!selectedBranch) return 0;
    return (selectedBranch.entries || [])
      .filter(e => e.type === 'revenue' && e.date.startsWith(month))
      .reduce((s, e) => s + e.amount, 0);
  }, [selectedBranch, month]);

  const branchMonthlyTarget = selectedBranch?.monthlyTarget || 0;
  const branchTargetPct = branchMonthlyTarget > 0 ? Math.min(100, Math.round((branchRevenue / branchMonthlyTarget) * 100)) : 0;

  const todayDate = new Date();
  const currentDay = todayDate.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const branchShortfall = Math.max(0, branchMonthlyTarget - branchRevenue);
  const requiredDailyPace = Math.ceil(branchShortfall / daysRemaining);
  const currentDailyPace = currentDay > 0 ? Math.round(branchRevenue / currentDay) : 0;
  const branchPacingStatus =
    branchMonthlyTarget === 0
      ? 'no-target'
      : branchRevenue >= branchMonthlyTarget
      ? 'achieved'
      : currentDailyPace >= requiredDailyPace
      ? 'on-track'
      : 'behind';

  // Auto calculate daily amount
  const autoDaily = useMemo(() => {
    if (goalForm.targetAmount && goalForm.targetDate) {
      const diffMs = new Date(goalForm.targetDate).getTime() - new Date().getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return Math.ceil(Number(goalForm.targetAmount) / diffDays);
    }
    return null;
  }, [goalForm.targetAmount, goalForm.targetDate]);

  // Submit Goal
  const submitGoal = () => {
    if (!goalForm.name.trim()) {
      setGoalError('Goal name is required.');
      return;
    }
    const daily = Number(goalForm.dailyAmount) || autoDaily || 0;
    if (daily <= 0 && (!goalForm.targetAmount || Number(goalForm.targetAmount) <= 0)) {
      setGoalError('Please enter either a daily amount or target amount with date.');
      return;
    }
    const calculatedDaily = daily > 0 ? daily : Math.ceil(Number(goalForm.targetAmount) / 365);
    const monthly = calculatedDaily * daysInMonth;
    const targetAmt = goalForm.targetAmount ? Number(goalForm.targetAmount) : monthly * 12;

    const goalId = 'g_' + Date.now();
    dispatch({
      type: 'ADD_GOAL',
      entry: {
        id: goalId,
        name: goalForm.name.trim(),
        dailyAmount: calculatedDaily,
        monthlyTarget: monthly,
        targetAmount: targetAmt,
        targetDate: goalForm.targetDate || undefined,
        endDate: goalForm.targetDate || getLocalDate(),
        savedAmount: 0,
        contributions: [],
        scope: domain,
        companyId: domain === 'business' ? (goalForm.companyId || selectedCompany?.id) : domain === 'branch' ? (selectedBranch?.companyId || selectedCompany?.id) : undefined,
        branchId: domain === 'branch' ? (goalForm.branchId || selectedBranch?.id) : undefined,
        targetType: (domain !== 'personal' ? (goalForm.targetType || 'reserve') : 'savings') as SavingsGoal['targetType'],
      },
    });

    if (goalForm.targetDate) {
      dispatch({
        type: 'ADD_REMINDER',
        entry: {
          id: 'rem_g_' + Date.now(),
          type: 'custom',
          relatedId: goalId,
          label: `${domain === 'business' ? 'Enterprise' : domain === 'branch' ? 'Branch' : 'Personal'} Goal Target: ${goalForm.name} (Target: ${formatRs(targetAmt)})`,
          dueDate: goalForm.targetDate,
          channel: 'in-app',
          status: 'pending',
        },
      });
    }

    const domainLabel = domain === 'business' ? 'Business corporate goal' : domain === 'branch' ? 'Branch outlet goal' : 'Savings goal';
    toast.success(`${domainLabel} "${goalForm.name}" created! Target deadline reminder scheduled.`);
    setGoalForm({
      name: '',
      targetAmount: '',
      targetDate: '',
      dailyAmount: '',
      targetType: 'reserve',
      companyId: '',
      branchId: '',
    });
    setGoalError('');
    setShowAddGoal(false);
  };

  // Add Contribution
  const addContribution = (goalId: string) => {
    const s = saving[goalId];
    if (!s || !s.amount || Number(s.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const isBankMethod = s.debitAccount && ['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(s.paymentMethod || 'cash');
    if (isBankMethod && !s.bankAccountId) {
      toast.error('Please select a bank account to debit');
      return;
    }
    dispatch({
      type: 'ADD_SAVING_CONTRIBUTION',
      goalId,
      amount: Number(s.amount),
      date: s.date || getLocalDate(),
      note: s.note,
      debitAccount: s.debitAccount,
      paymentMethod: s.paymentMethod || 'cash',
      bankAccountId: s.bankAccountId || null,
    });
    toast.success(`Logged contribution of ${formatRs(Number(s.amount))}`);
    setSaving(prev => ({
      ...prev,
      [goalId]: {
        amount: '',
        date: getLocalDate(),
        note: '',
        debitAccount: false,
        paymentMethod: 'cash',
        bankAccountId: '',
      },
    }));
  };

  const handleUndoContribution = async (goalId: string, contributionId: string, amount: number) => {
    const ok = await confirm({
      title: 'Undo Contribution',
      message: `Undo savings contribution of ${formatRs(amount)}? Saved balance and debited account balance will be restored.`,
      confirmLabel: 'Yes, Undo',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (!ok) return;
    dispatch({
      type: 'DELETE_SAVING_CONTRIBUTION',
      goalId,
      contributionId,
    });
    toast.success(`Contribution of ${formatRs(amount)} undone`);
  };

  const submitAdjust = (goalId: string) => {
    const daily = Number(adjustForm.dailyAmount);
    if (!daily || daily <= 0) return;
    dispatch({ type: 'UPDATE_GOAL', id: goalId, dailyAmount: daily, monthlyTarget: daily * daysInMonth });
    setAdjusting(null);
  };

  // Domain options
  const domainTabs: TabOption<GoalDomain>[] = [
    {
      id: 'personal',
      label: 'Personal Financial Goals',
      icon: <Icon name="user" size={14} />,
      badge: personalGoals.length > 0 ? `${personalGoals.length}` : undefined,
    },
    {
      id: 'business',
      label: 'Business Goals',
      icon: <Icon name="briefcase" size={14} />,
      badge: businessGoals.length > 0 ? `${businessGoals.length}` : undefined,
    },
    {
      id: 'branch',
      label: 'Branch Goals',
      icon: <Icon name="bank" size={14} />,
      badge: branchGoals.length > 0 ? `${branchGoals.length}` : undefined,
    },
  ];

  return (
    <PageContainer>
      {/* Header row */}
      <PageHeader
        eyebrow={domain === 'business' ? 'Enterprise' : domain === 'branch' ? 'Outlet' : 'Personal Finance'}
        title={domain === 'business' ? 'Corporate Business Goals' : domain === 'branch' ? 'Branch Outlet Goals' : 'Savings & Goals'}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker value={month} onChange={setMonth} size="sm" />
            {domain === 'personal' ? (
              <div className="text-xs px-3 py-1.5 rounded-xl border border-border bg-surface-hover flex items-center gap-2">
                <span className="text-muted font-medium">Free cash:</span>
                <span className={`font-bold num ${freeCash < 0 ? 'text-danger-text' : 'text-text'}`}>
                  {formatRs(freeCash)}
                </span>
                {savingsExceedsCash && <Badge tone="danger" size="sm">Exceeds cash</Badge>}
              </div>
            ) : domain === 'business' ? (
              <div className="text-xs px-3 py-1.5 rounded-xl border border-border bg-surface-hover flex items-center gap-2">
                <span className="text-muted font-medium">{month} Revenue:</span>
                <span className="font-bold text-success-text num">{formatRs(companyRevenue)}</span>
              </div>
            ) : (
              <div className="text-xs px-3 py-1.5 rounded-xl border border-border bg-surface-hover flex items-center gap-2">
                <span className="text-muted font-medium">{selectedBranch?.name || 'Branch'} Sales:</span>
                <span className="font-bold text-success-text num">{formatRs(branchRevenue)}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={16} />}
              onClick={() => {
                setGoalForm(f => ({
                  ...f,
                  companyId: selectedCompany?.id || '',
                  branchId: selectedBranch?.id || '',
                }));
                setShowAddGoal(v => !v);
              }}
            >
              {domain === 'business' ? 'New Business Goal' : domain === 'branch' ? 'New Branch Goal' : 'New Goal'}
            </Button>
          </div>
        }
      />

      {/* Domain Scope Bar */}
      {hasBusiness && (
        <div className="mb-6">
          <SegmentedTabs
            options={domainTabs}
            value={domain}
            onChange={d => {
              setDomain(d);
              setShowAddGoal(false);
            }}
          />
        </div>
      )}

      {/* Add Goal Form Drawer */}
      {showAddGoal && (
        <FormCard
          icon="target"
          title={
            domain === 'business'
              ? `Create Corporate Business Goal — ${selectedCompany?.name || 'Enterprise'}`
              : domain === 'branch'
              ? `Create Branch Outlet Goal — ${selectedBranch?.name || 'Operating Unit'}`
              : 'Create New Savings Goal'
          }
          actions={
            <Button variant="ghost" size="sm" onClick={() => setShowAddGoal(false)}>
              Cancel
            </Button>
          }
          className="mb-6"
        >
          {goalError && (
            <div className="text-xs mb-3 text-danger-text font-medium bg-danger-tint/60 dark:bg-danger-tint/20 border border-danger-solid/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>⚠</span>
              <span>{goalError}</span>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {domain === 'business' && state.companies.length > 1 && (
              <Field id="goal-company" label="Enterprise Company">
                <Select
                  value={goalForm.companyId || selectedCompany?.id || ''}
                  onChange={e => setGoalForm(f => ({ ...f, companyId: e.target.value }))}
                >
                  {state.companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {domain === 'branch' && (
              <Field id="goal-branch" label="Target Branch">
                <Select
                  value={goalForm.branchId || selectedBranch?.id || ''}
                  onChange={e => setGoalForm(f => ({ ...f, branchId: e.target.value }))}
                >
                  {companyBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.location || 'HQ'}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {domain !== 'personal' && (
              <Field id="goal-cat-type" label="Goal Classification">
                <Select
                  value={goalForm.targetType}
                  onChange={e => setGoalForm(f => ({ ...f, targetType: e.target.value }))}
                >
                  <option value="reserve">Cash Reserve & Tax Buffer</option>
                  <option value="expansion">Facility & Business Expansion</option>
                  <option value="revenue">Commercial Revenue Milestone</option>
                  <option value="profit">Retained Surplus Target</option>
                  <option value="other">General Operational Goal</option>
                </Select>
              </Field>
            )}

            <Field id="goal-name" label={domain === 'business' ? 'Corporate Goal Title' : domain === 'branch' ? 'Branch Goal Title' : 'Goal Name'} required>
              <Input
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                placeholder={
                  domain === 'business'
                    ? 'e.g. Corporate Tax Buffer, Delivery Fleet CapEx, Annual Reserve'
                    : domain === 'branch'
                    ? 'e.g. Store Renovation, POS Terminal Upgrade, Festival Sales Milestone'
                    : 'e.g. Emergency Fund, New Vehicle, Vacation'
                }
              />
            </Field>

            <Field id="goal-targetamt" label="Target Total Amount" required>
              <MoneyField
                value={goalForm.targetAmount}
                onChange={v => setGoalForm(f => ({ ...f, targetAmount: String(v) }))}
                placeholder={domain !== 'personal' ? '1,500,000' : '500,000'}
              />
            </Field>

            <Field id="goal-targetdate" label="Target Completion Date">
              <DateField
                value={goalForm.targetDate}
                onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </Field>

            <Field id="goal-daily" label={domain !== 'personal' ? 'Daily Run-Rate Target (Optional)' : 'Daily Target Amount (Rs.)'}>
              <MoneyField
                value={goalForm.dailyAmount || (autoDaily ? String(autoDaily) : '')}
                onChange={v => setGoalForm(f => ({ ...f, dailyAmount: String(v) }))}
                placeholder={autoDaily ? String(autoDaily) : '5,000'}
              />
              {(goalForm.dailyAmount || autoDaily) && (
                <p className="text-[11px] mt-1.5 font-medium text-primary-text">
                  Monthly target pace: <span className="font-bold num">{formatRs((Number(goalForm.dailyAmount) || autoDaily || 0) * 30)}</span>
                </p>
              )}
            </Field>
          </div>
          <div className="flex gap-2.5 mt-5">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={15} />}
              onClick={submitGoal}
            >
              Create {domain === 'business' ? 'Business Goal' : domain === 'branch' ? 'Branch Goal' : 'Goal'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAddGoal(false)}>
              Cancel
            </Button>
          </div>
        </FormCard>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* DOMAIN 1: PERSONAL GOALS                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {domain === 'personal' && (
        <div className="space-y-6">
          {/* Personal Spending Budget Card */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-sm text-text">Monthly Personal Spending Budget</h3>
                <p className="text-xs text-muted">
                  Personal living expenses for {month}
                </p>
              </div>
              <Badge tone={personalPct >= 100 ? 'danger' : personalPct >= 80 ? 'warning' : 'primary'} size="sm">
                {personalPct >= 100 ? 'Over budget' : `${Math.round(personalPct)}% spent`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                <Field id="personal-budget" label="Budget" className="mb-0">
                  <Input
                    id="personal-budget"
                    className="w-full"
                    type="number"
                    min="0"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                  />
                </Field>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                <div className="text-[11px] text-muted mb-0.5">Actual spent</div>
                <div className="text-base sm:text-lg font-bold text-text num">{formatRs(personalSpent)}</div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                <div className="text-[11px] text-muted mb-0.5">Remaining</div>
                <div className={`text-base sm:text-lg font-bold num ${personalRemaining < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                  {formatRs(personalRemaining)}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                <div className="text-[11px] text-muted mb-0.5">Daily allowance</div>
                <div className="text-base sm:text-lg font-bold text-text num">{formatRs(personalAllowance.dailyAllowance)} / day</div>
              </div>
            </div>

            <ProgressBar
              value={personalSpent}
              max={budget || 1}
              tone={personalPct >= 100 ? 'danger' : personalPct >= 80 ? 'warning' : 'primary'}
              size="md"
            />

            {personalPct >= 80 && (
              <p className={`text-xs mt-2 font-medium ${personalPct >= 100 ? 'text-danger-text' : 'text-warning-text'}`}>
                ⚠ {Math.round(personalPct)}% of personal spending budget used
                {personalPct >= 100 && ' — over budget!'}
              </p>
            )}
          </Card>

          {/* Goal Milestones & System Reminders Banner */}
          {personalGoals.length > 0 && (
            <Card className="p-4 border border-primary-500/25 bg-primary-tint/25">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="bell" size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text flex items-center gap-2">
                      <span>Personal Goal Milestones & Notification Reminders</span>
                      <Badge tone={savingsExceedsCash ? 'warning' : 'success'} size="sm">
                        {savingsExceedsCash ? 'Exceeds Free Cash' : 'On Track'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Active target of <span className="font-bold text-text num">{formatRs(personalGoals.reduce((s, g) => s + g.dailyAmount, 0))}</span>/day across {personalGoals.length} savings goals ({formatRs(totalSavingsTarget)}/mo). Target reminders are synced to your notifications.
                    </p>
                  </div>
                </div>
                <Link href="/settings" className="shrink-0 self-end sm:self-center">
                  <Button variant="ghost" size="sm" className="text-primary-text hover:text-primary-text text-xs">
                    View In Settings →
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Personal Goals list */}
          {personalGoals.length === 0 ? (
            <EmptyState
              icon={<Icon name="target" size={24} />}
              title="No personal savings goals yet"
              helper="Create your first goal to set daily targets and track monthly progress."
              cta={
                <Button variant="primary" size="sm" onClick={() => setShowAddGoal(true)}>
                  Create First Goal
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {personalGoals.map(goal => (
                <GoalCardItem
                  key={goal.id}
                  goal={goal}
                  freeCash={freeCash}
                  otherGoalsTarget={personalGoals.filter(g => g.id !== goal.id).reduce((s, g) => s + g.monthlyTarget, 0)}
                  daysInMonth={daysInMonth}
                  saving={saving}
                  setSaving={setSaving}
                  adjusting={adjusting}
                  setAdjusting={setAdjusting}
                  adjustForm={adjustForm}
                  setAdjustForm={setAdjustForm}
                  onAddContribution={addContribution}
                  onUndoContribution={handleUndoContribution}
                  onDeleteGoal={handleDeleteGoal}
                  onSubmitAdjust={submitAdjust}
                  bankAccounts={state.bankAccounts}
                  dispatch={dispatch}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* DOMAIN 2: BUSINESS GOALS (COMPANY LEVEL)                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {domain === 'business' && (
        <div className="space-y-6">
          {/* Company Selector Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                <Icon name="briefcase" size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text">Enterprise Company:</span>
                  {state.companies.length > 1 ? (
                    <Select
                      value={selectedCompanyId}
                      onChange={e => handleCompanySelect(e.target.value)}
                      className="!py-1 !text-xs font-semibold"
                    >
                      {state.companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.brNumber ? `(${c.brNumber})` : ''}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="font-bold text-sm text-text">{selectedCompany?.name || 'Main Enterprise'}</span>
                  )}
                  {selectedCompany?.brNumber && (
                    <Badge tone="neutral" size="sm">BR: {selectedCompany.brNumber}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {companyBranches.length} operating outlet(s) linked to this corporate entity
                </div>
              </div>
            </div>

            <Link href={`/analysis?scope=company&companyId=${selectedCompany?.id}`}>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="analysis" size={14} />}>
                View Business Waterfall
              </Button>
            </Link>
          </div>

          {/* Corporate Monthly Revenue Target Setting & Pacing Card */}
          {selectedCompany && (
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-text flex items-center gap-2">
                    <span>Corporate Monthly Revenue Benchmark</span>
                    <Badge tone={companyTargetPct >= 100 ? 'success' : companyTargetPct >= 50 ? 'primary' : 'neutral'} size="sm">
                      {companyMonthlyTarget === 0 ? 'No target set' : `${companyTargetPct}% Achieved`}
                    </Badge>
                  </h4>
                </div>

                {!editingCompTarget ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Icon name="edit" size={14} />}
                    onClick={() => setEditingCompTarget(true)}
                  >
                    Adjust Corporate Target
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveCompanyTarget}>
                      Save
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingCompTarget(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {editingCompTarget ? (
                <div className="max-w-md pt-2">
                  <Field id="comp-target-input" label="Set Monthly Corporate Revenue Target">
                    <MoneyField
                      id="comp-target-input"
                      value={compTargetInput}
                      onChange={v => setCompTargetInput(String(v))}
                      placeholder="e.g. 2,500,000"
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Corporate Target</div>
                    <div className="text-base sm:text-lg font-bold text-text num">
                      {companyMonthlyTarget > 0 ? formatRs(companyMonthlyTarget) : 'Not set'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Aggregated Inflows</div>
                    <div className="text-base sm:text-lg font-bold text-success-text num">{formatRs(companyRevenue)}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Target Shortfall</div>
                    <div className="text-base sm:text-lg font-bold text-text num">
                      {formatRs(Math.max(0, companyMonthlyTarget - companyRevenue))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Annualized Goal</div>
                    <div className="text-base sm:text-lg font-bold text-text num">
                      {formatRs((selectedCompany.annualRevenueTarget || companyMonthlyTarget * 12))}
                    </div>
                  </div>
                </div>
              )}

              {companyMonthlyTarget > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                    <span>Target Progress</span>
                    <span className="font-bold text-primary-text num">{companyTargetPct}%</span>
                  </div>
                  <ProgressBar value={companyTargetPct} max={100} tone={companyTargetPct >= 100 ? 'success' : 'primary'} />
                </div>
              )}
            </Card>
          )}

          {/* Strategic Corporate Goals List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text">Strategic Enterprise Milestones & Reserves</h4>
              </div>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Icon name="plus" size={14} />}
                onClick={() => {
                  setGoalForm(f => ({ ...f, companyId: selectedCompany?.id || '', targetType: 'reserve' }));
                  setShowAddGoal(true);
                }}
              >
                Add Corporate Goal
              </Button>
            </div>

            {businessGoals.length === 0 ? (
              <EmptyState
                icon={<Icon name="briefcase" size={24} />}
                title="No corporate goals set yet"
                helper={`Establish tax reserve buffers, vehicle/machinery funds, or revenue expansion goals for ${selectedCompany?.name || 'this enterprise'}.`}
                cta={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setGoalForm(f => ({ ...f, companyId: selectedCompany?.id || '', targetType: 'reserve' }));
                      setShowAddGoal(true);
                    }}
                  >
                    Create Corporate Goal
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {businessGoals.map(goal => (
                  <GoalCardItem
                    key={goal.id}
                    goal={goal}
                    freeCash={freeCash}
                    otherGoalsTarget={0}
                    daysInMonth={daysInMonth}
                    saving={saving}
                    setSaving={setSaving}
                    adjusting={adjusting}
                    setAdjusting={setAdjusting}
                    adjustForm={adjustForm}
                    setAdjustForm={setAdjustForm}
                    onAddContribution={addContribution}
                    onUndoContribution={handleUndoContribution}
                    onDeleteGoal={handleDeleteGoal}
                    onSubmitAdjust={submitAdjust}
                    bankAccounts={state.bankAccounts}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* DOMAIN 3: BRANCH GOALS (OUTLET LEVEL)                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {domain === 'branch' && (
        <div className="space-y-6">
          {/* Company & Branch Selector Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-primary-tint text-primary-text flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                <Icon name="bank" size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-text">Outlet:</span>
                  <Select
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="!py-1 !text-xs font-semibold"
                  >
                    {companyBranches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} · {b.location || 'HQ'}
                      </option>
                    ))}
                  </Select>
                  <Badge tone="primary">{selectedBranch?.branchType || 'Outlet'}</Badge>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  Operating location: {selectedBranch?.location || 'Headquarters'}
                </div>
              </div>
            </div>

            <Link href={`/analysis?scope=branch&companyId=${selectedCompany?.id}&branchId=${selectedBranch?.id}`}>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="analysis" size={14} />}>
                Branch Analytics & Pacing
              </Button>
            </Link>
          </div>

          {/* Branch Revenue Benchmark & Run-Rate Card */}
          {selectedBranch && (
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-text flex items-center gap-2">
                    <span>{selectedBranch.name} Revenue Target & Run-Rate Pacing</span>
                    <Badge
                      tone={
                        branchPacingStatus === 'achieved'
                          ? 'success'
                          : branchPacingStatus === 'on-track'
                          ? 'primary'
                          : branchPacingStatus === 'behind'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {branchPacingStatus === 'achieved'
                        ? 'Target Achieved'
                        : branchPacingStatus === 'on-track'
                        ? 'On Track'
                        : branchPacingStatus === 'behind'
                        ? 'Behind Run-Rate'
                        : 'No Target'}
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    Live daily sales pacing for {month} ({daysRemaining} days remaining in month)
                  </p>
                </div>

                {!editingBranchTarget ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Icon name="edit" size={14} />}
                    onClick={() => setEditingBranchTarget(true)}
                  >
                    Adjust Branch Target
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveBranchTarget}>
                      Save
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingBranchTarget(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {editingBranchTarget ? (
                <div className="max-w-md pt-2">
                  <Field id="branch-target-input" label="Set Monthly Branch Target Ceiling">
                    <MoneyField
                      id="branch-target-input"
                      value={branchTargetInput}
                      onChange={v => setBranchTargetInput(String(v))}
                      placeholder="e.g. 800,000"
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Monthly Target</div>
                    <div className="text-base sm:text-lg font-bold text-text num">
                      {branchMonthlyTarget > 0 ? formatRs(branchMonthlyTarget) : 'Not set'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Revenue Achieved</div>
                    <div className="text-base sm:text-lg font-bold text-success-text num">{formatRs(branchRevenue)}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Actual Daily Run-Rate</div>
                    <div className="text-base sm:text-lg font-bold text-text num">
                      {formatRs(currentDailyPace)}/day
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface-hover/50">
                    <div className="text-[11px] text-muted mb-0.5">Required Daily Pace</div>
                    <div className={`text-base sm:text-lg font-bold num ${branchShortfall > 0 && requiredDailyPace > currentDailyPace ? 'text-warning-text' : 'text-primary-text'}`}>
                      {branchShortfall > 0 ? `${formatRs(requiredDailyPace)}/day` : 'Achieved!'}
                    </div>
                  </div>
                </div>
              )}

              {branchMonthlyTarget > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                    <span>Month Completion Pace</span>
                    <span className="font-bold text-primary-text num">{branchTargetPct}%</span>
                  </div>
                  <ProgressBar value={branchTargetPct} max={100} tone={branchTargetPct >= 100 ? 'success' : 'primary'} />
                </div>
              )}
            </Card>
          )}

          {/* Branch-Specific Milestone Goals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text">Branch Unit Milestones & Equipment Funds</h4>
              </div>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Icon name="plus" size={14} />}
                onClick={() => {
                  setGoalForm(f => ({
                    ...f,
                    companyId: selectedCompany?.id || '',
                    branchId: selectedBranch?.id || '',
                    targetType: 'expansion',
                  }));
                  setShowAddGoal(true);
                }}
              >
                Add Branch Goal
              </Button>
            </div>

            {branchGoals.length === 0 ? (
              <EmptyState
                icon={<Icon name="bank" size={24} />}
                title="No branch milestone goals set"
                helper={`Establish facility improvement goals, new POS equipment funds, or local sales milestones for ${selectedBranch?.name || 'this branch'}.`}
                cta={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setGoalForm(f => ({
                        ...f,
                        companyId: selectedCompany?.id || '',
                        branchId: selectedBranch?.id || '',
                        targetType: 'expansion',
                      }));
                      setShowAddGoal(true);
                    }}
                  >
                    Create Branch Goal
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {branchGoals.map(goal => (
                  <GoalCardItem
                    key={goal.id}
                    goal={goal}
                    freeCash={freeCash}
                    otherGoalsTarget={0}
                    daysInMonth={daysInMonth}
                    saving={saving}
                    setSaving={setSaving}
                    adjusting={adjusting}
                    setAdjusting={setAdjusting}
                    adjustForm={adjustForm}
                    setAdjustForm={setAdjustForm}
                    onAddContribution={addContribution}
                    onUndoContribution={handleUndoContribution}
                    onDeleteGoal={handleDeleteGoal}
                    onSubmitAdjust={submitAdjust}
                    bankAccounts={state.bankAccounts}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE GOAL CARD ITEM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface GoalCardItemProps {
  goal: SavingsGoal;
  freeCash: number;
  otherGoalsTarget: number;
  daysInMonth: number;
  saving: Record<string, { amount: string; date: string; note: string; debitAccount?: boolean; paymentMethod?: string; bankAccountId?: string }>;
  setSaving: React.Dispatch<React.SetStateAction<Record<string, { amount: string; date: string; note: string; debitAccount?: boolean; paymentMethod?: string; bankAccountId?: string }>>>;
  adjusting: string | null;
  setAdjusting: (id: string | null) => void;
  adjustForm: { dailyAmount: string };
  setAdjustForm: React.Dispatch<React.SetStateAction<{ dailyAmount: string }>>;
  onAddContribution: (goalId: string) => void;
  onUndoContribution: (goalId: string, contribId: string, amount: number) => void;
  onDeleteGoal: (goalId: string, name: string) => void;
  onSubmitAdjust: (goalId: string) => void;
  bankAccounts: any[];
  dispatch: any;
}

function GoalCardItem({
  goal,
  freeCash,
  otherGoalsTarget,
  daysInMonth,
  saving,
  setSaving,
  adjusting,
  setAdjusting,
  adjustForm,
  setAdjustForm,
  onAddContribution,
  onUndoContribution,
  onDeleteGoal,
  onSubmitAdjust,
  bankAccounts,
  dispatch,
}: GoalCardItemProps) {
  const effectiveTarget = goal.targetAmount || goal.monthlyTarget;
  const pct = Math.min(100, Math.round((goal.savedAmount / (effectiveTarget || 1)) * 100));

  // Tally consistency check
  const tallySum = (goal.contributions || []).reduce((s, c) => s + c.amount, 0);
  const hasTallyMismatch = Math.abs(goal.savedAmount - tallySum) > 0.01 && (goal.contributions || []).length > 0;

  // Feasibility check (for personal goals)
  const isPersonal = !goal.scope || goal.scope === 'personal';
  const cashForThisGoal = freeCash - otherGoalsTarget;
  const feasible = !isPersonal || cashForThisGoal >= goal.monthlyTarget;
  const sv = saving[goal.id] || { amount: '', date: getLocalDate(), note: '' };

  const targetTypeLabel =
    goal.targetType === 'reserve'
      ? 'Tax & Reserve Buffer'
      : goal.targetType === 'expansion'
      ? 'Expansion / CapEx'
      : goal.targetType === 'revenue'
      ? 'Revenue Milestone'
      : goal.targetType === 'profit'
      ? 'Surplus Target'
      : goal.scope === 'business'
      ? 'Corporate Goal'
      : goal.scope === 'branch'
      ? 'Branch Milestone'
      : 'Savings Goal';

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-text">{goal.name}</span>
            {goal.scope && goal.scope !== 'personal' && (
              <Badge tone="primary" size="sm">
                <Icon name={goal.scope === 'business' ? 'briefcase' : 'bank'} size={11} className="mr-1 inline" />
                {targetTypeLabel}
              </Badge>
            )}
          </div>
          {(goal.targetDate || goal.endDate) && (
            <div className="text-xs text-muted mt-0.5">Target date: {goal.targetDate || goal.endDate}</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-text hover:text-danger-text !p-1.5"
          onClick={() => onDeleteGoal(goal.id, goal.name)}
          aria-label="Delete goal"
        >
          <Icon name="trash" size={14} />
        </Button>
      </div>

      {/* Target display */}
      <div className="text-2xl sm:text-3xl font-extrabold text-primary-text mb-1 num">
        {formatRs(effectiveTarget)}
      </div>
      <div className="text-xs text-muted mb-3">
        TARGET · <span className="num font-semibold text-text">{formatRs(goal.dailyAmount)}</span> / day · Monthly target <span className="num font-semibold text-text">{formatRs(goal.monthlyTarget)}</span>
      </div>

      {/* Target pace check */}
      {(() => {
        const pace = validateGoalPace(goal);
        if (!pace.onTrack && pace.shortfall > 0) {
          return (
            <div className="mb-3 text-xs text-warning-text bg-warning-tint/20 border border-warning-solid/30 rounded-lg p-2.5 flex items-center gap-2">
              <Icon name="alert" size={14} className="flex-shrink-0" />
              <span>
                At {formatRs(goal.dailyAmount)}/day ({pace.daysLeft} days left), pace falls short by {formatRs(pace.shortfall)}. Required: {formatRs(pace.requiredDaily)}/day.
              </span>
            </div>
          );
        }
        return null;
      })()}

      {/* Progress Track */}
      <ProgressBar
        value={goal.savedAmount}
        max={effectiveTarget}
        tone={pct >= 100 ? 'success' : 'primary'}
        size="md"
      />
      <div className="flex justify-between text-xs text-muted mt-2 mb-3">
        <span className="num font-medium text-text">{formatRs(goal.savedAmount)} funded</span>
        <span>
          <span className="num font-semibold text-text">{pct}%</span> · <span className="num text-text">{formatRs(Math.max(0, effectiveTarget - goal.savedAmount))}</span> to go
        </span>
      </div>

      {/* Tally check warning & reconciliation */}
      {hasTallyMismatch && (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-warning-solid/30 bg-warning-tint/30 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-warning-text font-medium">
            <Icon name="alert" size={14} />
            <span>Tally check: Funded is {formatRs(goal.savedAmount)}, but sum of logged contributions is {formatRs(tallySum)}.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-text font-semibold hover:underline !py-0.5 !px-2"
            onClick={() => {
              dispatch({
                type: 'UPDATE_GOAL',
                id: goal.id,
                savedAmount: tallySum,
              });
            }}
          >
            Reconcile
          </Button>
        </div>
      )}

      {/* Feasibility warning for personal goals */}
      {isPersonal && !feasible && (
        <div className="p-4 rounded-xl border border-warning-solid/30 bg-warning-tint/30 text-warning-text mb-3">
          <div className="font-semibold text-xs mb-1 flex items-center gap-1.5">
            <Icon name="alert" size={14} />
            <span>Feasibility check</span>
          </div>
          <p className="text-xs text-text">
            After other obligations, free cash for this goal is <strong className="num">{formatRs(Math.max(0, cashForThisGoal))}</strong>.
            Maximum achievable: <strong className="num">{formatRs(Math.max(0, cashForThisGoal))}</strong>.
          </p>
          {!adjusting && (
            <Button
              variant="ghost"
              size="sm"
              className="!p-0 mt-2 text-xs font-semibold text-primary-text hover:underline block"
              onClick={() => {
                setAdjusting(goal.id);
                setAdjustForm({ dailyAmount: String(Math.max(0, Math.floor(cashForThisGoal / daysInMonth))) });
              }}
            >
              Adjust goal to feasible amount →
            </Button>
          )}
        </div>
      )}

      {/* Adjust goal form */}
      {adjusting === goal.id && (
        <div className="p-4 rounded-xl mb-3 border border-border bg-surface-hover/70">
          <div className="font-semibold text-xs mb-2 text-text">Adjust goal</div>
          <div className="flex gap-2 items-end">
            <Field id={`adjust-daily-${goal.id}`} label="New Daily Amount" className="flex-1">
              <Input
                id={`adjust-daily-${goal.id}`}
                type="number"
                value={adjustForm.dailyAmount}
                onChange={e => setAdjustForm({ dailyAmount: e.target.value })}
              />
              {adjustForm.dailyAmount && (
                <p className="text-xs mt-1 text-muted">
                  Monthly: <span className="num font-semibold text-text">{formatRs(Number(adjustForm.dailyAmount) * 30)}</span>
                </p>
              )}
            </Field>
            <Button variant="primary" size="sm" onClick={() => onSubmitAdjust(goal.id)}>Save</Button>
            <Button variant="secondary" size="sm" onClick={() => setAdjusting(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Add contribution form */}
      <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <Field id={`contrib-amount-${goal.id}`} label={goal.scope !== 'personal' ? 'Allocate Funds (Rs.)' : 'Contribution (Rs.)'}>
            <Input
              id={`contrib-amount-${goal.id}`}
              type="number"
              placeholder="e.g. 10,000"
              value={sv.amount}
              onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, amount: e.target.value } }))}
            />
          </Field>
          <Field id={`contrib-date-${goal.id}`} label="Date">
            <Input
              id={`contrib-date-${goal.id}`}
              type="date"
              value={sv.date}
              onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, date: e.target.value } }))}
            />
          </Field>
          <Field id={`contrib-note-${goal.id}`} label="Reference">
            <Input
              id={`contrib-note-${goal.id}`}
              placeholder="e.g. Month-end profit allocation"
              value={sv.note}
              onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, note: e.target.value } }))}
            />
          </Field>
          <Button variant="primary" size="sm" onClick={() => onAddContribution(goal.id)}>
            {goal.scope !== 'personal' ? 'Fund Goal' : 'Add Savings'}
          </Button>
        </div>

        {/* Optional Account Debit */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-0.5">
          <Checkbox
            id={`contrib-debit-${goal.id}`}
            checked={sv.debitAccount || false}
            onChange={chk => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, debitAccount: chk } }))}
            label={<span className="text-xs text-text">Debit bank account or cash wallet via central ledger</span>}
          />
          {sv.debitAccount && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={sv.paymentMethod || 'cash'}
                onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, paymentMethod: e.target.value } }))}
                className="text-xs py-1"
              >
                <option value="cash">Cash Wallet</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="standing_order">Standing Order</option>
                <option value="debit_card">Debit Card</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </Select>
              {['bank_transfer', 'cheque', 'standing_order', 'debit_card'].includes(sv.paymentMethod || '') && (
                <Select
                  value={sv.bankAccountId || ''}
                  onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, bankAccountId: e.target.value } }))}
                  className="text-xs py-1"
                >
                  <option value="">Select Bank Account...</option>
                  {bankAccounts.filter(b => !b.isArchived).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({formatRs(b.currentBalance)})
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent contributions */}
      {(goal.contributions?.length ?? 0) > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-semibold mb-2 text-muted">Recent milestone allocations</div>
          <div className="space-y-1.5">
            {(goal.contributions || []).slice(-6).reverse().map((c, i) => {
              const contribId = c.id || c._id || '';
              return (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-muted num">
                    {c.date} {c.note ? `· ${c.note}` : ''}
                    {c.paymentMethod ? ` (${c.paymentMethod.replace('_', ' ')})` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-success-text num">+{formatRs(c.amount)}</span>
                    {contribId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!p-0.5 h-auto text-muted hover:text-danger-text"
                        onClick={() => onUndoContribution(goal.id, contribId, c.amount)}
                        title="Undo contribution"
                        aria-label="Undo contribution"
                      >
                        <Icon name="close" size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Goals() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageHeader title="Savings Goals & Daily Target" />
      </PageContainer>
    }>
      <GoalsContent />
    </Suspense>
  );
}
