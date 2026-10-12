'use client';
import React, { useState, useEffect } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { FormField, FormGrid } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { MoneyField } from '@/components/ui/MoneyField';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import type { EmploymentProfile } from '@/types';

export function SalaryWorkspace() {
  const { state, dispatch, showToast, isLoading } = useApp();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    employer: '',
    role: '',
    monthlyGross: '',
    payday: '25',
    monthlyDeductions: '',
    monthlySavingsTarget: '',
    careerGoal: '',
  });

  // Keep selectedId synchronized when employment profiles hydrate or update
  useEffect(() => {
    if (state.employmentProfiles.length > 0) {
      if (!selectedId || !state.employmentProfiles.some(job => job.id === selectedId)) {
        setSelectedId(state.employmentProfiles[0].id);
      }
    } else {
      if (selectedId) setSelectedId('');
    }
  }, [state.employmentProfiles, selectedId]);

  const selected = state.employmentProfiles.find(job => job.id === selectedId) || state.employmentProfiles[0];

  // Detect any salary income entry in general state.income for quick import
  const salaryIncomes = state.income.filter(i => i.type === 'salary');
  const primarySalaryIncome = salaryIncomes[0];

  const handleQuickImport = (inc: typeof primarySalaryIncome) => {
    if (!inc) return;
    setForm({
      employer: inc.source || 'Primary Employer',
      role: '',
      monthlyGross: String(inc.amount || ''),
      payday: '25',
      monthlyDeductions: '',
      monthlySavingsTarget: '',
      careerGoal: '',
    });
    setShowForm(true);
  };

  const saveJob = async () => {
    if (!form.employer.trim()) {
      showToast('Please enter an employer name.', 'error');
      return;
    }
    const gross = Number(form.monthlyGross) || 0;
    if (gross <= 0) {
      showToast('Monthly gross salary must be greater than zero.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const entry: EmploymentProfile = {
        id: 'job_' + Date.now(),
        employer: form.employer.trim(),
        role: form.role.trim(),
        monthlyGross: gross,
        payday: Math.max(1, Math.min(31, Number(form.payday) || 25)),
        monthlyDeductions: Math.max(0, Number(form.monthlyDeductions) || 0),
        monthlySavingsTarget: Math.max(0, Number(form.monthlySavingsTarget) || 0),
        careerGoal: form.careerGoal.trim(),
      };
      const serverId = await dispatch({ type: 'ADD_EMPLOYMENT', entry });
      setSelectedId(serverId || entry.id);
      setShowForm(false);
      setForm({
        employer: '',
        role: '',
        monthlyGross: '',
        payday: '25',
        monthlyDeductions: '',
        monthlySavingsTarget: '',
        careerGoal: '',
      });
      showToast('Employment profile saved successfully.', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteJob = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Delete Employment Profile',
      message: `Are you sure you want to remove "${selected.employer}"?`,
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await dispatch({ type: 'DELETE_EMPLOYMENT', id: selected.id });
      showToast('Employment profile removed.', 'info');
    } finally {
      setDeleting(false);
    }
  };

  const updateSelected = (updates: Partial<EmploymentProfile>) => {
    if (selected) {
      dispatch({ type: 'UPDATE_EMPLOYMENT', entry: { ...selected, ...updates } });
      showToast('Employment profile updated.', 'success');
    }
  };

  // Loading skeleton while data hydrates
  if (isLoading && state.employmentProfiles.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </Card>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  const takeHome = selected ? Math.max(0, selected.monthlyGross - selected.monthlyDeductions) : 0;
  const afterSavings = selected ? takeHome - selected.monthlySavingsTarget : 0;
  const allocation = selected && takeHome > 0 ? Math.min(100, Math.round((selected.monthlySavingsTarget / takeHome) * 100)) : 0;

  // Case 1: No profiles configured yet
  if (state.employmentProfiles.length === 0) {
    return (
      <div className="space-y-6">
        {!showForm ? (
          <div className="space-y-4">
            <EmptyState
              title="No salary profile configured"
              helper="Set up your primary employment profile to calculate monthly take-home pay, monitor statutory deductions (EPF/ETF, APIT tax), and automate payday savings."
              action={
                <Button
                  variant="primary"
                  onClick={() => setShowForm(true)}
                  iconLeft={<Icon name="plus" size={16} />}
                >
                  Create Salary Profile
                </Button>
              }
              className="py-12"
            />

            {primarySalaryIncome && (
              <Card className="p-5 border border-primary-500/20 bg-primary-tint/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Icon name="wallet" size={16} className="text-primary-text" />
                    <span>Quick Import Available</span>
                  </div>
                  <p className="text-xs text-muted">
                    Found recorded salary from <strong className="text-text">{primarySalaryIncome.source}</strong> of{' '}
                    <strong className="text-text">{formatRs(primarySalaryIncome.amount)}</strong>.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickImport(primarySalaryIncome)}
                  iconLeft={<Icon name="bolt" size={14} />}
                >
                  Import as Profile
                </Button>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-text">New Employment Profile</h4>
                <p className="text-xs text-muted mt-0.5">
                  Configure your primary monthly salary to build a dedicated payday plan.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>

            <FormGrid columns={2}>
              <FormField id="emp-name" label="Employer / Company *" required>
                <Input
                  id="emp-name"
                  placeholder="e.g. Acme Lanka Ltd"
                  value={form.employer}
                  onChange={e => setForm(f => ({ ...f, employer: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-role" label="Job Title / Role">
                <Input
                  id="emp-role"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-gross" label="Gross Monthly Salary (Rs.) *" required>
                <MoneyField
                  id="emp-gross"
                  value={form.monthlyGross}
                  onChange={v => setForm(f => ({ ...f, monthlyGross: String(v) }))}
                  placeholder="250,000"
                />
              </FormField>

              <FormField id="emp-deductions" label="Monthly Deductions (Tax, EPF/ETF)">
                <MoneyField
                  id="emp-deductions"
                  value={form.monthlyDeductions}
                  onChange={v => setForm(f => ({ ...f, monthlyDeductions: String(v) }))}
                  placeholder="20,000"
                />
              </FormField>

              <FormField id="emp-payday" label="Payday (Day of month)">
                <Input
                  id="emp-payday"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="25"
                  value={form.payday}
                  onChange={e => setForm(f => ({ ...f, payday: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-target" label="Monthly Savings Target (Rs.)">
                <MoneyField
                  id="emp-target"
                  value={form.monthlySavingsTarget}
                  onChange={v => setForm(f => ({ ...f, monthlySavingsTarget: String(v) }))}
                  placeholder="50,000"
                />
              </FormField>

              <div className="col-span-1 sm:col-span-2">
                <FormField id="emp-career" label="Career Target / Development Goal">
                  <Input
                    id="emp-career"
                    placeholder="e.g. Complete AWS Certification, target annual promotion"
                    value={form.careerGoal}
                    onChange={e => setForm(f => ({ ...f, careerGoal: e.target.value }))}
                  />
                </FormField>
              </div>
            </FormGrid>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveJob} loading={submitting}>
                Save Salary Profile
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Case 2: One or more profiles exist
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1 min-w-[200px]">
            <FormField id="salary-source-select" label="Employment Source">
              <Select
                id="salary-source-select"
                value={selected?.id || ''}
                onChange={e => setSelectedId(e.target.value)}
              >
                {state.employmentProfiles.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.employer} {job.role ? `· ${job.role}` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowForm(v => !v)}
              iconLeft={<Icon name={showForm ? 'close' : 'plus'} size={16} />}
            >
              {showForm ? 'Cancel' : 'Add Another Job'}
            </Button>
            {state.employmentProfiles.length > 0 && (
              <Button
                variant="ghost"
                onClick={deleteJob}
                loading={deleting}
                className="!text-danger-text hover:!bg-danger-tint"
                iconLeft={<Icon name="trash" size={16} />}
                title="Delete this employment profile"
                aria-label="Delete this employment profile"
              />
            )}
          </div>
        </div>

        {showForm && (
          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <h4 className="text-sm font-bold text-text">New Employment Profile</h4>
            <FormGrid columns={2}>
              <FormField id="emp-name" label="Employer / Company *" required>
                <Input
                  id="emp-name"
                  placeholder="e.g. Acme Lanka Ltd"
                  value={form.employer}
                  onChange={e => setForm(f => ({ ...f, employer: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-role" label="Job Title / Role">
                <Input
                  id="emp-role"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-gross" label="Gross Monthly Salary (Rs.) *" required>
                <MoneyField
                  id="emp-gross"
                  value={form.monthlyGross}
                  onChange={v => setForm(f => ({ ...f, monthlyGross: String(v) }))}
                  placeholder="250,000"
                />
              </FormField>

              <FormField id="emp-deductions" label="Monthly Deductions (Tax, EPF/ETF)">
                <MoneyField
                  id="emp-deductions"
                  value={form.monthlyDeductions}
                  onChange={v => setForm(f => ({ ...f, monthlyDeductions: String(v) }))}
                  placeholder="20,000"
                />
              </FormField>

              <FormField id="emp-payday" label="Payday (Day of month)">
                <Input
                  id="emp-payday"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="25"
                  value={form.payday}
                  onChange={e => setForm(f => ({ ...f, payday: e.target.value }))}
                />
              </FormField>

              <FormField id="emp-target" label="Monthly Savings Target (Rs.)">
                <MoneyField
                  id="emp-target"
                  value={form.monthlySavingsTarget}
                  onChange={v => setForm(f => ({ ...f, monthlySavingsTarget: String(v) }))}
                  placeholder="50,000"
                />
              </FormField>

              <div className="col-span-1 sm:col-span-2">
                <FormField id="emp-career" label="Career Target / Development Goal">
                  <Input
                    id="emp-career"
                    placeholder="e.g. Complete AWS Certification, target annual promotion"
                    value={form.careerGoal}
                    onChange={e => setForm(f => ({ ...f, careerGoal: e.target.value }))}
                  />
                </FormField>
              </div>
            </FormGrid>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveJob} loading={submitting}>
                Save Employment
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Gross Salary"
              value={formatRs(selected.monthlyGross)}
              detail="Monthly gross"
              tone="default"
              icon={<Icon name="wallet" size={18} />}
            />
            <StatCard
              label="Deductions"
              value={formatRs(selected.monthlyDeductions)}
              detail="Tax, EPF, loans & other"
              tone={selected.monthlyDeductions > 0 ? 'warning' : 'default'}
              icon={<Icon name="arrow-down" size={18} />}
            />
            <StatCard
              label="Take-Home Pay"
              value={formatRs(takeHome)}
              detail={`Available on day ${selected.payday}`}
              tone="success"
              icon={<Icon name="arrow-up" size={18} />}
            />
            <StatCard
              label="After Savings"
              value={formatRs(afterSavings)}
              detail="Available for monthly living"
              tone={afterSavings >= 0 ? 'success' : 'danger'}
              icon={<Icon name="target" size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div>
                <h4 className="text-base font-bold text-text">Payday Savings Allocation</h4>
                <p className="text-xs text-muted mt-0.5">
                  Set aside savings first, then use the remainder as your living budget ceiling.
                </p>
              </div>

              <FormField id="savings-alloc-field" label="Monthly Savings Target (Rs.)">
                <MoneyField
                  id="savings-alloc-field"
                  value={selected.monthlySavingsTarget}
                  onChange={v => updateSelected({ monthlySavingsTarget: Number(v) || 0 })}
                />
              </FormField>

              <div className="pt-2">
                <ProgressBar
                  value={allocation}
                  max={100}
                  label={`${allocation}% of take-home pay allocated to savings`}
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h4 className="text-base font-bold text-text">Career Milestone</h4>
                <p className="text-xs text-muted mt-0.5">
                  Keep your next career growth milestone visible alongside your salary plan.
                </p>
              </div>

              <FormField id="career-goal-field" label="Current Career Objective">
                <Textarea
                  id="career-goal-field"
                  rows={4}
                  value={selected.careerGoal}
                  onChange={e => updateSelected({ careerGoal: e.target.value })}
                  placeholder="e.g. Complete certification, prepare for annual performance review"
                />
              </FormField>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
