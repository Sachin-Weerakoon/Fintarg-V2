'use client';
import React, { useState } from 'react';
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
import type { EmploymentProfile } from '@/types';

export function SalaryWorkspace() {
  const { state, dispatch, showToast } = useApp();
  const [selectedId, setSelectedId] = useState(state.employmentProfiles[0]?.id || '');
  const selected = state.employmentProfiles.find(job => job.id === selectedId) || state.employmentProfiles[0];
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employer: '',
    role: '',
    monthlyGross: '',
    payday: '25',
    monthlyDeductions: '',
    monthlySavingsTarget: '',
    careerGoal: '',
  });

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
        monthlyDeductions: Number(form.monthlyDeductions) || 0,
        monthlySavingsTarget: Number(form.monthlySavingsTarget) || 0,
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

  const updateSelected = (updates: Partial<EmploymentProfile>) => {
    if (selected) {
      dispatch({ type: 'UPDATE_EMPLOYMENT', entry: { ...selected, ...updates } });
      showToast('Employment profile updated.', 'success');
    }
  };

  const takeHome = selected ? selected.monthlyGross - selected.monthlyDeductions : 0;
  const afterSavings = selected ? takeHome - selected.monthlySavingsTarget : 0;
  const allocation = selected && takeHome > 0 ? Math.min(100, Math.round((selected.monthlySavingsTarget / takeHome) * 100)) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <FormField id="salary-source-select" label="Employment Source">
              <Select
                id="salary-source-select"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                {state.employmentProfiles.length === 0 ? (
                  <option value="">No employment sources configured</option>
                ) : (
                  state.employmentProfiles.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.employer} · {job.role || 'Primary Role'}
                    </option>
                  ))
                )}
              </Select>
            </FormField>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowForm(v => !v)}
            iconLeft={<Icon name={showForm ? 'close' : 'plus'} size={16} />}
          >
            {showForm ? 'Cancel' : 'Add Another Job'}
          </Button>
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

              <div className="md:col-span-2">
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

      {selected ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="grid md:grid-cols-2 gap-6">
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
      ) : (
        <EmptyState
          title="No employment profile yet"
          helper="Add your primary job or salary source to build an automated payday plan and track take-home cashflow."
          action={
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Add Employment Source
            </Button>
          }
          className="py-12"
        />
      )}
    </div>
  );
}
