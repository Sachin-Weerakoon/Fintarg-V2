'use client';
import React from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';

export interface WorkOverviewProps {
  onOpen?: (tab: string) => void;
}

export function WorkOverview({ onOpen }: WorkOverviewProps) {
  void onOpen;
  const { state } = useApp();

  const salaryNet = state.employmentProfiles.reduce(
    (sum, job) => sum + (job.monthlyGross - job.monthlyDeductions),
    0
  );

  const businessRevenue = state.businessBranches
    .flatMap(branch => branch.entries)
    .filter(entry => entry.type === 'revenue' && entry.date.startsWith(state.selectedMonth))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const businessCosts = state.businessBranches
    .flatMap(branch => branch.entries)
    .filter(entry => entry.type !== 'revenue' && entry.date.startsWith(state.selectedMonth))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const businessNet = businessRevenue - businessCosts;
  const combined = salaryNet + businessNet;
  const hasBusiness = state.profile.workMode !== 'salary';
  const hasSalary = state.profile.workMode !== 'business';

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base font-bold text-text tracking-tight flex items-center gap-2">
            <span>Work & Enterprise Summary</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Combined monthly net position across salary and enterprise branches for {state.selectedMonth}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasSalary && (
          <StatCard
            label="Salary Take-Home"
            value={formatRs(salaryNet)}
            detail={`${state.employmentProfiles.length} employment source(s)`}
            tone="default"
            icon={<Icon name="user" size={18} />}
          />
        )}
        {hasBusiness && (
          <>
            <StatCard
              label="Business Inflow"
              value={formatRs(businessRevenue)}
              detail="Total enterprise revenue"
              tone="success"
              icon={<Icon name="arrow-up" size={18} />}
            />
            <StatCard
              label="Business Costs"
              value={formatRs(businessCosts)}
              detail="Operating expenses & bills"
              tone={businessCosts > businessRevenue ? 'danger' : 'warning'}
              icon={<Icon name="arrow-down" size={18} />}
            />
          </>
        )}
        <StatCard
          label="Combined Net Inflow"
          value={formatRs(combined)}
          detail={combined >= 0 ? 'Positive cash generation' : 'Net operating deficit'}
          tone={combined >= 0 ? 'success' : 'danger'}
          icon={<Icon name="wallet" size={18} />}
        />
      </div>
    </Card>
  );
}
