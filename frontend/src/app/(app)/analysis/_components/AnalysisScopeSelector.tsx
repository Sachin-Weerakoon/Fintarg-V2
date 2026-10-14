'use client';

import React from 'react';
import { useApp } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
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
        {/* Scope Pill Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-hover/80 border border-border/70 overflow-x-auto">
          <button
            type="button"
            onClick={() => onScopeChange('consolidated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              scope === 'consolidated'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-muted hover:text-text hover:bg-surface/60'
            }`}
          >
            <Icon name="analysis" size={14} />
            <span>Consolidated Portfolio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (hasCompanies) {
                const targetCo = companyId || companies[0]?.id || '';
                onScopeChange('company', targetCo);
              } else {
                onScopeChange('company');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              scope === 'company'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-muted hover:text-text hover:bg-surface/60'
            }`}
          >
            <Icon name="briefcase" size={14} />
            <span>By Business (Company)</span>
            {hasCompanies && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                scope === 'company' ? 'bg-white/20 text-white' : 'bg-surface-hover text-muted'
              }`}>
                {companies.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (hasBranches) {
                const targetCo = companyId || branches[0]?.companyId || '';
                const targetBr = branchId || branches[0]?.id || '';
                onScopeChange('branch', targetCo, targetBr);
              } else {
                onScopeChange('branch');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              scope === 'branch'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-muted hover:text-text hover:bg-surface/60'
            }`}
          >
            <Icon name="bank" size={14} />
            <span>By Operating Branch</span>
            {hasBranches && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                scope === 'branch' ? 'bg-white/20 text-white' : 'bg-surface-hover text-muted'
              }`}>
                {branches.length}
              </span>
            )}
          </button>
        </div>

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
