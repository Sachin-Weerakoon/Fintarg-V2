'use client';

import React, { useState, useMemo } from 'react';
import { useApp, formatRs, calcAnalysis, calcPersonalSpent } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Goals() {
  const { state, dispatch } = useApp();
  const month = state.selectedMonth;
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    dailyAmount: '',
  });
  const [goalError, setGoalError] = useState('');
  const [saving, setSaving] = useState<Record<string, { amount: string; date: string; note: string }>>({});
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ dailyAmount: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const DAYS_IN_MONTH = 30;
  const a = calcAnalysis(state, month);
  const { freeCash } = a;

  // Personal spending: derived from actual Personal category expenses
  const personalSpent = calcPersonalSpent(state.expenses, month);
  const budget = state.personalSpendingBudget;
  const personalRemaining = budget - personalSpent;
  const personalPct = budget > 0 ? (personalSpent / budget) * 100 : 0;

  // Multi-goal feasibility: check if total savings targets exceed free cash
  const totalSavingsTarget = state.savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);
  const savingsExceedsCash = totalSavingsTarget > freeCash;

  // Auto calculate daily amount when targetAmount & targetDate are provided
  const autoDaily = useMemo(() => {
    if (goalForm.targetAmount && goalForm.targetDate) {
      const diffMs = new Date(goalForm.targetDate).getTime() - new Date().getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return Math.ceil(Number(goalForm.targetAmount) / diffDays);
    }
    return null;
  }, [goalForm.targetAmount, goalForm.targetDate]);

  const submitGoal = () => {
    if (!goalForm.name) {
      setGoalError('Goal name is required.');
      return;
    }
    const daily = Number(goalForm.dailyAmount) || autoDaily || 0;
    if (daily <= 0 && (!goalForm.targetAmount || Number(goalForm.targetAmount) <= 0)) {
      setGoalError('Please enter either a daily amount or target amount with date.');
      return;
    }
    const calculatedDaily = daily > 0 ? daily : Math.ceil(Number(goalForm.targetAmount) / 365);
    const monthly = calculatedDaily * DAYS_IN_MONTH;
    const targetAmt = goalForm.targetAmount ? Number(goalForm.targetAmount) : monthly * 12;

    dispatch({
      type: 'ADD_GOAL',
      entry: {
        id: 'g_' + Date.now(),
        name: goalForm.name,
        dailyAmount: calculatedDaily,
        monthlyTarget: monthly,
        targetAmount: targetAmt,
        targetDate: goalForm.targetDate || undefined,
        endDate: goalForm.targetDate || new Date().toISOString().slice(0, 10),
        savedAmount: 0,
        contributions: [],
      },
    });
    setGoalForm({ name: '', targetAmount: '', targetDate: '', dailyAmount: '' });
    setGoalError('');
    setShowAddGoal(false);
  };

  const addContribution = (goalId: string) => {
    const s = saving[goalId];
    if (!s || !s.amount || Number(s.amount) <= 0) return;
    dispatch({
      type: 'ADD_SAVING_CONTRIBUTION',
      goalId,
      amount: Number(s.amount),
      date: s.date || new Date().toISOString().slice(0, 10),
      note: s.note,
    });
    setSaving(prev => ({ ...prev, [goalId]: { amount: '', date: new Date().toISOString().slice(0, 10), note: '' } }));
  };

  const submitAdjust = (goalId: string) => {
    const daily = Number(adjustForm.dailyAmount);
    if (!daily || daily <= 0) return;
    dispatch({ type: 'UPDATE_GOAL', id: goalId, dailyAmount: daily, monthlyTarget: daily * DAYS_IN_MONTH });
    setAdjusting(null);
  };

  return (
    <PageContainer width="narrow">
      {/* Header row */}
      <PageHeader
        title="Savings & Goals"
        description="Automate daily targets, track contributions, and ensure target feasibility."
        actions={
          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-xl border border-border bg-surface-hover flex items-center gap-2">
              <span className="text-muted font-medium">Free cash:</span>
              <span className={`font-bold num ${freeCash < 0 ? 'text-danger-text' : 'text-text'}`}>
                {formatRs(freeCash)}
              </span>
              {savingsExceedsCash && <Badge tone="danger" size="sm">Exceeds cash</Badge>}
            </div>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={16} />}
              onClick={() => setShowAddGoal(v => !v)}
            >
              New Goal
            </Button>
          </div>
        }
      />

      {/* Add goal form */}
      {showAddGoal && (
        <Card className="p-6 border-primary-500/30 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-text flex items-center gap-2">
              <Icon name="target" size={16} className="text-primary-text" />
              <span>Create New Savings Goal</span>
            </div>
          </div>
          {goalError && <p className="text-xs mb-3 text-danger-text font-medium">{goalError}</p>}
          <div className="grid md:grid-cols-2 gap-4">
            <Field id="goal-name" label="Goal name">
              <Input
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Emergency Fund, New Vehicle"
              />
            </Field>
            <Field id="goal-targetamt" label="Target Total Amount (Rs.)">
              <Input
                type="number"
                value={goalForm.targetAmount}
                onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                placeholder="e.g. 500,000"
              />
            </Field>
            <Field id="goal-targetdate" label="Target Date">
              <Input
                type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </Field>
            <Field id="goal-daily" label="Daily Target Amount (Rs.)">
              <Input
                type="number"
                value={goalForm.dailyAmount || (autoDaily ? String(autoDaily) : '')}
                onChange={e => setGoalForm(f => ({ ...f, dailyAmount: e.target.value }))}
                placeholder={autoDaily ? String(autoDaily) : '1,000'}
              />
              {(goalForm.dailyAmount || autoDaily) && (
                <p className="text-[11px] mt-1.5 font-medium text-primary-text">
                  Monthly target: <span className="font-bold num">{formatRs((Number(goalForm.dailyAmount) || autoDaily || 0) * 30)}</span>
                </p>
              )}
            </Field>
          </div>
          <div className="flex gap-2.5 mt-5">
            <Button variant="primary" size="sm" onClick={submitGoal}>Create Goal</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAddGoal(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Personal spending plan */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm text-text">Personal / Enjoyment spending plan</div>
          <Badge tone="neutral" size="sm">Auto-tracked from expenses</Badge>
        </div>
        <div className="flex flex-wrap items-end gap-6 mb-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Monthly budget (Rs.)</label>
            <Input
              className="!w-36"
              type="number"
              min="0"
              value={budget}
              onChange={e => dispatch({ type: 'SET_PERSONAL_SPENDING_BUDGET', budget: Number(e.target.value) })}
            />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Actual spent (Personal category)</div>
            <div className="text-lg font-bold text-text num">{formatRs(personalSpent)}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Remaining</div>
            <div className={`text-lg font-bold num ${personalRemaining < 0 ? 'text-danger-text' : 'text-success-text'}`}>
              {formatRs(personalRemaining)}
            </div>
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

      {/* Goals list */}
      {state.savingsGoals.length === 0 ? (
        <EmptyState
          icon={<Icon name="target" size={24} />}
          title="No savings goals yet"
          helper="Create your first goal to set daily targets and track monthly progress."
          cta={
            <Button variant="primary" size="sm" onClick={() => setShowAddGoal(true)}>
              Create First Goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {state.savingsGoals.map(goal => {
            const effectiveTarget = goal.targetAmount || goal.monthlyTarget;
            const pct = Math.min(100, Math.round((goal.savedAmount / (effectiveTarget || 1)) * 100));

            // Tally consistency check
            const tallySum = (goal.contributions || []).reduce((s, c) => s + c.amount, 0);
            const hasTallyMismatch = Math.abs(goal.savedAmount - tallySum) > 0.01 && (goal.contributions || []).length > 0;

            // Feasibility: check if this goal is achievable given OTHER goals already allocated
            const otherGoalsTarget = state.savingsGoals.filter(g => g.id !== goal.id).reduce((s, g) => s + g.monthlyTarget, 0);
            const cashForThisGoal = freeCash - otherGoalsTarget;
            const feasible = cashForThisGoal >= goal.monthlyTarget;
            const sv = saving[goal.id] || { amount: '', date: new Date().toISOString().slice(0, 10), note: '' };

            return (
              <Card key={goal.id} className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-base text-text">{goal.name}</div>
                    {(goal.targetDate || goal.endDate) && (
                      <div className="text-xs text-muted mt-0.5">Target date: {goal.targetDate || goal.endDate}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-text hover:text-danger-text !p-1.5"
                    onClick={() => setDeleteConfirmId(goal.id)}
                    aria-label="Delete goal"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>

                {/* Target display */}
                <div className="text-3xl font-extrabold text-primary-text mb-1 num">
                  {formatRs(effectiveTarget)}
                </div>
                <div className="text-xs text-muted mb-3">
                  TARGET · <span className="num font-semibold text-text">{formatRs(goal.dailyAmount)}</span> / day · Monthly target <span className="num font-semibold text-text">{formatRs(goal.monthlyTarget)}</span>
                </div>

                {/* Progress */}
                <ProgressBar
                  value={goal.savedAmount}
                  max={effectiveTarget}
                  tone={pct >= 100 ? 'success' : 'primary'}
                  size="md"
                />
                <div className="flex justify-between text-xs text-muted mt-2 mb-3">
                  <span className="num font-medium text-text">{formatRs(goal.savedAmount)} saved</span>
                  <span>
                    <span className="num font-semibold text-text">{pct}%</span> · <span className="num text-text">{formatRs(Math.max(0, effectiveTarget - goal.savedAmount))}</span> to go
                  </span>
                </div>

                {/* Tally check warning & reconciliation */}
                {hasTallyMismatch && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-warning-solid/30 bg-warning-tint/30 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-warning-text font-medium">
                      <Icon name="alert" size={14} />
                      <span>Tally check: Saved is {formatRs(goal.savedAmount)}, but sum of logged contributions is {formatRs(tallySum)}.</span>
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

                {/* Feasibility warning */}
                {!feasible && (
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
                      <button
                        className="mt-2 text-xs font-semibold text-primary-text hover:underline block"
                        onClick={() => {
                          setAdjusting(goal.id);
                          setAdjustForm({ dailyAmount: String(Math.max(0, Math.floor(cashForThisGoal / DAYS_IN_MONTH))) });
                        }}
                      >
                        Adjust goal to feasible amount →
                      </button>
                    )}
                  </div>
                )}

                {/* Adjust goal form */}
                {adjusting === goal.id && (
                  <div className="p-4 rounded-xl mb-3 border border-border bg-surface-hover/70">
                    <div className="font-semibold text-xs mb-2 text-text">Adjust goal</div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-muted mb-1">New daily amount (Rs.)</label>
                        <Input
                          type="number"
                          value={adjustForm.dailyAmount}
                          onChange={e => setAdjustForm({ dailyAmount: e.target.value })}
                        />
                        {adjustForm.dailyAmount && (
                          <p className="text-xs mt-1 text-muted">
                            Monthly: <span className="num font-semibold text-text">{formatRs(Number(adjustForm.dailyAmount) * 30)}</span>
                          </p>
                        )}
                      </div>
                      <Button variant="primary" size="sm" onClick={() => submitAdjust(goal.id)}>Save</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAdjusting(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Add contribution form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Contribution (Rs.)</label>
                    <Input
                      type="number"
                      placeholder="1,000"
                      value={sv.amount}
                      onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, amount: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Date</label>
                    <Input
                      type="date"
                      value={sv.date}
                      onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, date: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Note (optional)</label>
                    <Input
                      placeholder="e.g. Salary deposit"
                      value={sv.note}
                      onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, note: e.target.value } }))}
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={() => addContribution(goal.id)}>
                    Add Savings
                  </Button>
                </div>

                {/* Recent contributions */}
                {goal.contributions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-semibold mb-2 text-muted">Recent savings contributions</div>
                    <div className="space-y-1.5">
                      {goal.contributions.slice(-6).reverse().map((c, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted num">
                            {c.date} {c.note ? `· ${c.note}` : ''}
                          </span>
                          <span className="font-semibold text-success-text num">{formatRs(c.amount)}</span>
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

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Savings Goal"
          message="Are you sure you want to delete this savings goal? This action cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_GOAL', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </PageContainer>
  );
}
