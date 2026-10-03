import React, { useState } from 'react';
import { useApp, formatRs, calcAnalysis, calcPersonalSpent } from '../store';

export default function Goals() {
  const { state, dispatch } = useApp();
  const month = state.selectedMonth;
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: '', dailyAmount: '', endDate: '' });
  const [goalError, setGoalError] = useState('');
  const [saving, setSaving] = useState<Record<string, { amount: string; date: string }>>({});
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ dailyAmount: '' });

  const DAYS_IN_MONTH = 30;
  const a = calcAnalysis(state, month);
  const { freeCash, totalIncome } = a;

  // Personal spending: derived from actual Personal category expenses
  const personalSpent = calcPersonalSpent(state.expenses, month);
  const budget = state.personalSpendingBudget;
  const personalRemaining = budget - personalSpent;
  const personalPct = budget > 0 ? (personalSpent / budget) * 100 : 0;

  // Multi-goal feasibility: check if total savings targets exceed free cash
  const totalSavingsTarget = state.savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);
  const savingsExceedsCash = totalSavingsTarget > freeCash;

  const submitGoal = () => {
    if (!goalForm.name || !goalForm.dailyAmount || Number(goalForm.dailyAmount) <= 0) {
      setGoalError('Name and daily amount are required.'); return;
    }
    const daily = Number(goalForm.dailyAmount);
    const monthly = daily * DAYS_IN_MONTH;
    dispatch({
      type: 'ADD_GOAL',
      entry: { id: 'g_' + Date.now(), name: goalForm.name, dailyAmount: daily, monthlyTarget: monthly, endDate: goalForm.endDate, savedAmount: 0, contributions: [] },
    });
    setGoalForm({ name: '', dailyAmount: '', endDate: '' });
    setGoalError('');
    setShowAddGoal(false);
  };

  const addContribution = (goalId: string) => {
    const s = saving[goalId];
    if (!s || !s.amount || Number(s.amount) <= 0) return;
    dispatch({ type: 'ADD_SAVING_CONTRIBUTION', goalId, amount: Number(s.amount), date: s.date || new Date().toISOString().slice(0, 10) });
    setSaving(prev => ({ ...prev, [goalId]: { amount: '', date: new Date().toISOString().slice(0, 10) } }));
  };

  const submitAdjust = (goalId: string) => {
    const daily = Number(adjustForm.dailyAmount);
    if (!daily || daily <= 0) return;
    dispatch({ type: 'UPDATE_GOAL', id: goalId, dailyAmount: daily, monthlyTarget: daily * DAYS_IN_MONTH });
    setAdjusting(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Free cash this month: <span className="font-bold" style={{ color: freeCash < 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>{formatRs(freeCash)}</span>
          {savingsExceedsCash && <span className="ml-2 badge-danger">Goals exceed free cash!</span>}
        </div>
        <button className="btn-primary" onClick={() => setShowAddGoal(v => !v)}>+ New goal</button>
      </div>

      {/* Add goal form */}
      {showAddGoal && (
        <div className="card mb-5">
          <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Create savings goal</div>
          {goalError && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{goalError}</p>}
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Goal name</label>
              <input className="form-input" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} placeholder="Emergency Fund" />
            </div>
            <div>
              <label className="form-label">Daily amount (Rs.)</label>
              <input className="form-input" type="number" value={goalForm.dailyAmount} onChange={e => setGoalForm(f => ({ ...f, dailyAmount: e.target.value }))} placeholder="1,000" />
              {goalForm.dailyAmount && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Monthly target: <strong>{formatRs(Number(goalForm.dailyAmount) * 30)}</strong>
                </p>
              )}
            </div>
            <div>
              <label className="form-label">End date (optional)</label>
              <input className="form-input" type="date" value={goalForm.endDate} onChange={e => setGoalForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={submitGoal}>Create goal</button>
            <button className="btn-secondary" onClick={() => setShowAddGoal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Personal spending plan */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Personal / Enjoyment spending plan</div>
          <span className="badge-muted text-xs">Auto-tracked from expenses</span>
        </div>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div>
            <label className="form-label">Monthly budget (Rs.)</label>
            <input className="form-input w-36" type="number" min="0" value={budget}
              onChange={e => dispatch({ type: 'SET_PERSONAL_SPENDING_BUDGET', budget: Number(e.target.value) })} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Actual spent (Personal category)</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{formatRs(personalSpent)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Remaining</div>
            <div className="text-lg font-semibold" style={{ color: personalRemaining < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {formatRs(personalRemaining)}
            </div>
          </div>
        </div>
        <div className="progress-track mb-2">
          <div className="progress-fill" style={{
            width: `${Math.min(100, personalPct)}%`,
            background: personalPct >= 100 ? 'var(--color-danger)' : personalPct >= 80 ? 'var(--color-warning)' : 'var(--color-primary)',
          }} />
        </div>
        {personalPct >= 80 && (
          <p className="text-xs mt-1" style={{ color: personalPct >= 100 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
            ⚠ {Math.round(personalPct)}% of personal spending budget used
            {personalPct >= 100 && ' — over budget!'}
          </p>
        )}
      </div>

      {/* Goals list */}
      {state.savingsGoals.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No savings goals yet. Create one to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {state.savingsGoals.map(goal => {
            const pct = Math.min(100, Math.round((goal.savedAmount / goal.monthlyTarget) * 100));
            // Feasibility: check if this goal is achievable given OTHER goals already allocated
            const otherGoalsTarget = state.savingsGoals.filter(g => g.id !== goal.id).reduce((s, g) => s + g.monthlyTarget, 0);
            const cashForThisGoal = freeCash - otherGoalsTarget;
            const feasible = cashForThisGoal >= goal.monthlyTarget;
            const sv = saving[goal.id] || { amount: '', date: new Date().toISOString().slice(0, 10) };

            return (
              <div key={goal.id} className="card">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>{goal.name}</div>
                    {goal.endDate && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Target date: {goal.endDate}</div>
                    )}
                  </div>
                  <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                    onClick={() => { if (confirm('Delete this goal?')) dispatch({ type: 'DELETE_GOAL', id: goal.id }); }}>✕</button>
                </div>

                {/* Target display */}
                <div className="text-3xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
                  {formatRs(goal.monthlyTarget)}
                </div>
                <div className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                  TARGET · {formatRs(goal.dailyAmount)} / day · {DAYS_IN_MONTH} days
                </div>

                {/* Progress */}
                <div className="progress-track mb-2">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                </div>
                <div className="flex justify-between text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                  <span>{formatRs(goal.savedAmount)} saved</span>
                  <span>{pct}% · {formatRs(Math.max(0, goal.monthlyTarget - goal.savedAmount))} to go</span>
                </div>

                {/* Feasibility warning */}
                {!feasible && (
                  <div className="alert-warning mb-3">
                    <div className="font-semibold text-xs mb-1" style={{ color: 'var(--color-warning)' }}>⚠ Feasibility check</div>
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                      After other obligations, free cash for this goal is <strong>{formatRs(Math.max(0, cashForThisGoal))}</strong>.
                      Maximum achievable: <strong>{formatRs(Math.max(0, cashForThisGoal))}</strong>.
                    </p>
                    {!adjusting && (
                      <button className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}
                        onClick={() => { setAdjusting(goal.id); setAdjustForm({ dailyAmount: String(Math.max(0, Math.floor(cashForThisGoal / DAYS_IN_MONTH))) }); }}>
                        Adjust goal to feasible amount →
                      </button>
                    )}
                  </div>
                )}

                {/* Adjust goal form */}
                {adjusting === goal.id && (
                  <div className="p-3 rounded-lg mb-3" style={{ background: 'var(--color-bg)' }}>
                    <div className="font-semibold text-xs mb-2" style={{ color: 'var(--color-text)' }}>Adjust goal</div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="form-label">New daily amount (Rs.)</label>
                        <input className="form-input" type="number" value={adjustForm.dailyAmount}
                          onChange={e => setAdjustForm({ dailyAmount: e.target.value })} />
                        {adjustForm.dailyAmount && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Monthly: {formatRs(Number(adjustForm.dailyAmount) * 30)}</p>
                        )}
                      </div>
                      <button className="btn-primary" onClick={() => submitAdjust(goal.id)}>Save</button>
                      <button className="btn-secondary" onClick={() => setAdjusting(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Add contribution */}
                <div className="flex gap-2 mt-2">
                  <div className="flex-1">
                    <label className="form-label">Amount (Rs.)</label>
                    <input className="form-input" type="number" placeholder="1,000" value={sv.amount}
                      onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, amount: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={sv.date}
                      onChange={e => setSaving(prev => ({ ...prev, [goal.id]: { ...sv, date: e.target.value } }))} />
                  </div>
                  <div className="flex items-end">
                    <button className="btn-primary" onClick={() => addContribution(goal.id)}>Add</button>
                  </div>
                </div>

                {/* Recent contributions */}
                {goal.contributions.length > 0 && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>Recent savings</div>
                    <div className="space-y-1">
                      {goal.contributions.slice(-6).reverse().map((c, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span style={{ color: 'var(--color-muted)' }}>{c.date}</span>
                          <span className="font-semibold" style={{ color: 'var(--color-success)' }}>+{c.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
