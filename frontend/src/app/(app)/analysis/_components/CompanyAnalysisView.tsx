'use client';

import React, { useMemo, useState } from 'react';
import { useApp, formatRs } from '@/store';
import type { Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import Link from 'next/link';
import {
  ScoreRing,
  Sparkline,
  TrendChart,
  WaterfallChart,
  DonutChart,
  CATEGORY_PALETTE,
  type TrendPoint,
} from '@/components/charts/Charts';
import {
  calculateCompanyMetrics,
  buildCompanySeries,
  forecastCompany,
} from '@/lib/businessInsights';
import { monthLabel } from '@/lib/insights';

export interface CompanyAnalysisViewProps {
  company: Company;
  month: string;
  today: string;
  onSelectBranch: (branchId: string) => void;
}

type CompanyTab = 'overview' | 'branches' | 'costs' | 'forecast';

function CompanyKpi({
  label,
  value,
  icon,
  spark,
  sparkColor,
  footer,
  tone,
}: {
  label: string;
  value: string;
  icon: IconName;
  spark?: number[];
  sparkColor?: string;
  footer?: React.ReactNode;
  tone?: 'danger' | 'success';
}) {
  return (
    <Card className="!p-4 flex flex-col gap-2 hover:shadow-card transition-shadow">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted flex items-center gap-1.5">
          <Icon name={icon} size={13} className="text-primary-text" />
          {label}
        </div>
      </div>
      <div className={`text-xl font-extrabold tracking-tight num ${tone === 'danger' ? 'text-danger-text' : tone === 'success' ? 'text-success-text' : 'text-text'}`}>
        {value}
      </div>
      <div className="flex items-end justify-between gap-2 min-h-[30px]">
        <div className="text-[11px] leading-tight text-muted">{footer}</div>
        {spark && spark.length > 1 && <Sparkline values={spark} color={sparkColor} width={80} height={28} />}
      </div>
    </Card>
  );
}

export function CompanyAnalysisView({
  company,
  month,
  today,
  onSelectBranch,
}: CompanyAnalysisViewProps) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<CompanyTab>('overview');

  const companyBranches = useMemo(
    () => (state.businessBranches || []).filter(b => b.companyId === company.id),
    [state.businessBranches, company.id]
  );

  const metrics = useMemo(
    () => calculateCompanyMetrics(company, companyBranches, state, month, today),
    [company, companyBranches, state, month, today]
  );

  const series = useMemo(
    () => buildCompanySeries(companyBranches, month, 6),
    [companyBranches, month]
  );

  const forecast = useMemo(
    () => forecastCompany(company, companyBranches, month, series, 3),
    [company, companyBranches, month, series]
  );

  const trendData: TrendPoint[] = [
    ...series,
    ...forecast,
  ];

  const revenueSpark = series.map(s => s.income);
  const costSpark = series.map(s => s.outflow);

  const donutSlices = metrics.costCategories.map((c, i) => ({
    label: c.category,
    value: c.amount,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));

  const hasData = metrics.totalRevenue > 0 || metrics.totalOperatingCosts > 0;

  const tabs: { id: CompanyTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Executive Overview', icon: <Icon name="analysis" size={13} /> },
    { id: 'branches', label: `Branch Units (${metrics.branchesCount})`, icon: <Icon name="bank" size={13} /> },
    { id: 'costs', label: 'Overheads & Bills', icon: <Icon name="credit-card" size={13} /> },
    { id: 'forecast', label: 'Growth Forecast', icon: <Icon name="bolt" size={13} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ───────────── HERO: Enterprise Health & Executive Narrative ───────────── */}
      <section className="hero-panel rounded-3xl p-5 sm:p-7" aria-labelledby="company-health-heading">
        <div className="grid lg:grid-cols-[auto,1fr,1fr] gap-6 lg:gap-8 items-center">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing value={metrics.healthScore.score} sublabel={metrics.healthScore.grade} />
            <div className="text-center">
              <div id="company-health-heading" className="text-xs uppercase tracking-wider font-bold text-primary-300">
                Enterprise Health
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{monthLabel(month)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-400/10 border border-primary-400/25 text-primary-300 text-[11px] font-semibold">
              <Icon name="briefcase" size={12} />
              <span>{company.name}</span>
              {company.brNumber && <span className="opacity-75">· BR: {company.brNumber}</span>}
            </div>

            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
              {!hasData
                ? 'Record branch sales and bills to unlock enterprise intelligence.'
                : metrics.grossOperatingProfit < 0
                ? `${company.name} is operating at a monthly deficit of ${formatRs(Math.abs(metrics.grossOperatingProfit))}. Cost containment is critical.`
                : metrics.operatingMargin >= 0.25
                ? `Robust commercial vitality with a ${(metrics.operatingMargin * 100).toFixed(0)}% gross operating margin across ${metrics.branchesCount} outlet(s).`
                : `Cash-flow positive with ${(metrics.operatingMargin * 100).toFixed(0)}% margin. Expanding branch throughput will drive sustained profitability.`}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {metrics.branchesCount === 0
                ? 'No active branch registered under this company yet.'
                : `${metrics.branchesCount} operating branch(es) generating ${formatRs(metrics.totalRevenue)} in gross commercial inflows.`}
              {metrics.ownerDraws > 0 && ` Owner withdrawals total ${formatRs(metrics.ownerDraws)} for the period.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {metrics.healthScore.factors.map(f => (
              <div key={f.name} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                  <span>{f.name}</span>
                  <span className="font-mono text-white font-bold">{f.score}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium truncate">{f.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── 4 TOP FINANCIAL KPIS ───────────── */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CompanyKpi
          label="Enterprise Inflows"
          value={formatRs(metrics.totalRevenue)}
          icon="arrow-up"
          spark={revenueSpark}
          sparkColor="var(--color-success-solid)"
          footer={
            metrics.prevMonthRevenue > 0 ? (
              <span className={metrics.totalRevenue >= metrics.prevMonthRevenue ? 'text-success-text font-bold' : 'text-danger-text font-bold'}>
                {metrics.totalRevenue >= metrics.prevMonthRevenue ? '▲' : '▼'}{' '}
                {Math.abs(Math.round(((metrics.totalRevenue - metrics.prevMonthRevenue) / metrics.prevMonthRevenue) * 100))}% vs last mo
              </span>
            ) : (
              'Aggregated branch revenue'
            )
          }
          tone="success"
        />

        <CompanyKpi
          label="Operating Overheads"
          value={formatRs(metrics.totalOperatingCosts)}
          icon="arrow-down"
          spark={costSpark}
          sparkColor="var(--color-danger-solid)"
          footer={
            <span>
              Utilities: <strong className="text-text">{formatRs(metrics.totalUtilityCosts)}</strong>
            </span>
          }
          tone={metrics.totalOperatingCosts > metrics.totalRevenue ? 'danger' : undefined}
        />

        <CompanyKpi
          label="Gross Operating Profit"
          value={formatRs(metrics.grossOperatingProfit)}
          icon="wallet"
          footer={
            <span>
              Margin: <strong className="text-text">{(metrics.operatingMargin * 100).toFixed(0)}%</strong> of revenue
            </span>
          }
          tone={metrics.grossOperatingProfit >= 0 ? 'success' : 'danger'}
        />

        <CompanyKpi
          label="Retained Company Earnings"
          value={formatRs(metrics.netRetainedProfit)}
          icon="bank"
          footer={
            <span>
              Draws: <strong className="text-text">{formatRs(metrics.ownerDraws)}</strong>
            </span>
          }
          tone={metrics.netRetainedProfit >= 0 ? 'success' : 'danger'}
        />
      </section>

      {/* ───────────── SUB-TABS NAVIGATION ───────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 flex-wrap">
        <SegmentedTabs
          options={tabs}
          value={activeTab}
          onChange={t => setActiveTab(t as CompanyTab)}
        />
        <div className="flex items-center gap-2">
          <Link href="/advanced?tab=businesses">
            <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={13} />}>
              Manage Branches
            </Button>
          </Link>
        </div>
      </div>

      {/* ───────────── TAB CONTENT ───────────── */}
      {!hasData ? (
        <Card className="p-8 text-center">
          <EmptyState
            title="No Commercial Ledger Data"
            helper="Add daily sales and operating expenses in the Business Workspace to see enterprise waterfalls, branch rankings, and growth forecasts."
            action={
              <Link href="/advanced?tab=businesses">
                <Button variant="primary" size="sm">
                  Go to Business Workspace
                </Button>
              </Link>
            }
          />
        </Card>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Waterfall & Corporate Target Card */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <Icon name="analysis" size={15} className="text-primary-text" />
                    Enterprise Cash Flow Waterfall
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    How gross branch sales flow through bills and owner drawings to retained capital
                  </p>
                </div>
              </div>
              <WaterfallChart steps={metrics.waterfall} />
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-text flex items-center gap-2">
                      <Icon name="target" size={15} className="text-primary-text" />
                      Corporate Target Pacing
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Combined performance against aggregate branch targets for {monthLabel(month)}
                    </p>
                  </div>
                  <Badge tone={metrics.targetAchievedPct >= 100 ? 'success' : metrics.targetAchievedPct >= 80 ? 'primary' : 'warning'}>
                    {metrics.targetAchievedPct}% Achieved
                  </Badge>
                </div>

                <div className="space-y-4 my-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Target Pace</span>
                    <span className="font-bold num">
                      {formatRs(metrics.totalRevenue)} / {formatRs(metrics.totalMonthlyTarget || 1)}
                    </span>
                  </div>
                  <ProgressBar
                    value={metrics.totalRevenue}
                    max={Math.max(metrics.totalMonthlyTarget, metrics.totalRevenue, 1)}
                    tone={metrics.targetAchievedPct >= 100 ? 'success' : metrics.targetAchievedPct >= 80 ? 'primary' : 'warning'}
                    size="lg"
                  />
                </div>

                {metrics.activeAgreementsCount > 0 && (
                  <div className="mt-5 p-3.5 rounded-xl bg-surface-hover/70 border border-border/80">
                    <div className="text-xs font-bold text-text flex items-center gap-2">
                      <Icon name="documents" size={14} className="text-primary-text" />
                      Commercial Contracts Pipeline
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {metrics.activeAgreementsCount} active commercial contract(s) registered with a total portfolio value of{' '}
                      <strong className="text-text">{formatRs(metrics.activeAgreementsValue)}</strong>.
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/70 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('branches')}>
                  View Branch Breakdown →
                </Button>
              </div>
            </Card>
          </div>

          {/* Cross-Branch Comparative Leaderboard */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <Icon name="bank" size={15} className="text-primary-text" />
                  Branch Performance Leaderboard
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Unit economics and revenue contribution ranked across all operating outlets
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 text-muted uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Branch Outlet</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 num text-right">Monthly Revenue</th>
                    <th className="py-2.5 px-3 text-center">Share</th>
                    <th className="py-2.5 px-3 num text-right">Operating Costs</th>
                    <th className="py-2.5 px-3 num text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-center">Margin</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {metrics.branchSummaries.map((b, idx) => (
                    <tr key={b.branchId} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-text flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary-tint text-primary-text text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {b.name}
                      </td>
                      <td className="py-3 px-3 text-muted">{b.location}</td>
                      <td className="py-3 px-3 num text-right font-semibold text-text">{formatRs(b.revenue)}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge tone="neutral">{b.revenueSharePct}%</Badge>
                      </td>
                      <td className="py-3 px-3 num text-right text-muted">{formatRs(b.costs)}</td>
                      <td className={`py-3 px-3 num text-right font-bold ${b.netProfit >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
                        {formatRs(b.netProfit)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`num font-semibold ${b.marginPct >= 20 ? 'text-success-text' : b.marginPct >= 0 ? 'text-text' : 'text-danger-text'}`}>
                          {b.marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectBranch(b.branchId)}
                          iconRight={<Icon name="chevron-right" size={12} />}
                          className="!py-1 !px-2.5 !text-[11px]"
                        >
                          Deep-Dive
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === 'branches' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.branchSummaries.map(b => (
            <Card key={b.branchId} className="p-5 flex flex-col justify-between hover:border-primary-400/50 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-bold text-text text-sm">{b.name}</h4>
                    <p className="text-xs text-muted mt-0.5">{b.location}</p>
                  </div>
                  <Badge tone={b.netProfit >= 0 ? 'success' : 'danger'}>
                    {b.marginPct}% Margin
                  </Badge>
                </div>

                <div className="space-y-2.5 py-3 border-y border-border/70 my-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Inflow:</span>
                    <strong className="num text-text">{formatRs(b.revenue)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Costs:</span>
                    <span className="num text-muted">{formatRs(b.costs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Net Contribution:</span>
                    <strong className={`num ${b.netProfit >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
                      {formatRs(b.netProfit)}
                    </strong>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelectBranch(b.branchId)}
                iconRight={<Icon name="arrow-up" size={13} className="rotate-45" />}
                className="w-full mt-2"
              >
                Analyze Outlet Unit
              </Button>
            </Card>
          ))}
        </div>
      ) : activeTab === 'costs' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1 flex items-center gap-2">
              <Icon name="credit-card" size={15} className="text-primary-text" />
              Operating Cost Distribution
            </h3>
            <p className="text-xs text-muted mb-4">
              Overheads and utility breakdown across all company branches
            </p>
            <div className="flex items-center justify-center py-4">
              {donutSlices.length > 0 ? (
                <DonutChart
                  data={donutSlices}
                  centerLabel="Total Costs"
                  centerValue={formatRs(metrics.totalOperatingCosts)}
                />
              ) : (
                <EmptyState title="No recorded overhead expenses" helper="Add company operating costs to see the expense distribution." />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1">Expense Categories</h3>
            <p className="text-xs text-muted mb-4">Breakdown of operational spend drivers</p>
            <div className="space-y-3">
              {metrics.costCategories.map((c, i) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-text flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }}
                      />
                      {c.category}
                    </span>
                    <span className="font-bold num">
                      {formatRs(c.amount)} ({c.percentage}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={c.amount}
                    max={metrics.totalOperatingCosts || 1}
                    size="sm"
                    className="!bg-surface-hover"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* Forecast Tab */
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Icon name="bolt" size={15} className="text-primary-text" />
                6-Month Enterprise Trend & 3-Month Projection
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Statistical projection based on multi-branch historical sales velocity and target guidance
              </p>
            </div>
            <Badge tone="primary">Confidence Band: ±12%</Badge>
          </div>
          <TrendChart data={trendData} />
        </Card>
      )}
    </div>
  );
}
