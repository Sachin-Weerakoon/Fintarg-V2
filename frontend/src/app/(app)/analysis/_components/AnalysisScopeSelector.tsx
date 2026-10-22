'use client';

import React from 'react';
import { useApp } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import Link from 'next/link';

export type AnalysisScope = 'consolidated' | 'company' | 'branch';

export interface AnalysisScopeSelectorProps {
  scope: AnalysisScope;
  companyId: string;
  branchId: string;
  onScopeChange: (scope: AnalysisScope, companyId?: string, branchId?: string) => void;
}

export function AnalysisScopeSelector({
  scope,
  companyId,
  branchId,
  onScopeChange,
}: AnalysisScopeSelectorProps) {
  const { state } = useApp();
  const companies = state.companies || [];
  const branches = state.businessBranches || [];

  const selectedCompany = companies.find(c => c.id === companyId) || companies[0];
  const companyBranches = branches.filter(b => b.companyId === (selectedCompany?.id || ''));
  const selectedBranch = companyBranches.find(b => b.id === branchId) || companyBranches[0];

  const hasCompanies = companies.length > 0;
  const hasBranches = branches.length > 0;

  return (
    <Card className="!p-3.5 mb-6 border border-border/80 bg-surface/90 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Scope tabs */}
        <SegmentedTabs
          aria-label="Analysis scope"
          value={scope}
          onChange={next => {
            if (next === 'company' && hasCompanies) {
              onScopeChange('company', companyId || companies[0]?.id || '');
            } else if (next === 'branch' && hasBranches) {
              onScopeChange('branch', companyId || branches[0]?.companyId || '', branchId || branches[0]?.id || '');
            } else {
              onScopeChange(next);
            }
          }}
          options={[
            { id: 'consolidated', label: 'Consolidated Portfolio', icon: <Icon name="analysis" size={14} /> },
            {
              id: 'company',
              label: 'By Business',
              icon: <Icon name="briefcase" size={14} />,
              badge: hasCompanies ? <Badge tone="neutral" size="sm">{companies.length}</Badge> : undefined,
            },
            {
              id: 'branch',
              label: 'By Operating Branch',
              icon: <Icon name="bank" size={14} />,
              badge: hasBranches ? <Badge tone="neutral" size="sm">{branches.length}</Badge> : undefined,
            },
          ]}
        />

        {/* Dynamic Selectors when scoped */}
        {scope === 'company' && hasCompanies && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Icon name="briefcase" size={13} className="text-primary-text" />
              Select Business:
            </span>
            <div className="min-w-[200px]">
              <Select
                id="scope-company-select"
                value={selectedCompany?.id || ''}
                onChange={e => onScopeChange('company', e.target.value)}
                className="!py-1.5 !text-xs font-medium"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.brNumber ? `(${c.brNumber})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {scope === 'branch' && hasBranches && (
          <div className="flex items-center gap-2 flex-wrap">
            {companies.length > 1 && (
              <div className="min-w-[160px]">
                <Select
                  id="scope-branch-company-select"
                  value={selectedCompany?.id || ''}
                  onChange={e => {
                    const firstBranch = branches.find(b => b.companyId === e.target.value);
                    onScopeChange('branch', e.target.value, firstBranch?.id || '');
                  }}
                  className="!py-1.5 !text-xs font-medium"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="min-w-[200px]">
              <Select
                id="scope-branch-select"
                value={selectedBranch?.id || ''}
                onChange={e => onScopeChange('branch', selectedCompany?.id || '', e.target.value)}
                className="!py-1.5 !text-xs font-medium"
              >
                {companyBranches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.location || 'HQ'}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {/* Quick Link to Register Business if None */}
        {((scope === 'company' && !hasCompanies) || (scope === 'branch' && !hasBranches)) && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>No {scope === 'company' ? 'companies' : 'branches'} registered yet.</span>
            <Link href="/advanced?tab=businesses">
              <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={13} />}>
                Add {scope === 'company' ? 'Company' : 'Branch'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
