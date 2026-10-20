'use client';

import React, { useMemo, useState } from 'react';
import { formatRs } from '@/store';
import type { BusinessBranch, Company } from '@/types';
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
  WeekdayBars,
  HeatCalendar,
  CATEGORY_PALETTE,
  compactNumber,
  type TrendPoint,
  type WaterfallStep,
} from '@/components/charts/Charts';
import {
  calculateBranchMetrics,
  buildBranchSeries,
  forecastBranch,
} from '@/lib/businessInsights';
import { monthLabel } from '@/lib/insights';

export interface BranchAnalysisViewProps {
  branch: BusinessBranch;
  company?: Company;
  month: string;
  today: string;
  onBackToCompany?: () => void;
}

type BranchTab = 'overview' | 'rhythm' | 'costs' | 'forecast';

function BranchKpi({
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

export function BranchAnalysisView({
  branch,
  company,
  month,
  today,
  onBackToCompany,
}: BranchAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<BranchTab>('overview');

  const metrics = useMemo(
    () => calculateBranchMetrics(branch, month, today),
    [branch, month, today]
  );

  const series = useMemo(
    () => buildBranchSeries(branch, month, 6),
    [branch, month]
  );

  const forecast = useMemo(
    () => forecastBranch(branch, month, series, 3),
    [branch, month, series]
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

  const branchWaterfall: WaterfallStep[] = [
    { label: 'Branch Inflows', value: metrics.revenue, kind: 'start' },
    { label: 'Operating Costs', value: -metrics.otherCosts, kind: 'delta' },
    { label: 'Utility Bills', value: -metrics.utilityCosts, kind: 'delta' },
    { label: 'Net Contribution', value: metrics.netProfit, kind: 'end' },
  ].filter(s => s.kind !== 'delta' || s.value !== 0) as WaterfallStep[];

  const hasData = metrics.revenue > 0 || metrics.totalCosts > 0;

  const tabs: { id: BranchTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Unit Economics', icon: <Icon name="analysis" size={13} /> },
    { id: 'rhythm', label: 'Sales Rhythm & Days', icon: <Icon name="calendar" size={13} /> },
    { id: 'costs', label: 'Bills & Utilities', icon: <Icon name="credit-card" size={13} /> },
    { id: 'forecast', label: 'Outlet Forecast', icon: <Icon name="bolt" size={13} /> },
  ];

  const targetTone: 'success' | 'primary' | 'warning' | 'danger' =
    metrics.targetPace.targetStatus === 'achieved'
      ? 'success'
      : metrics.targetPace.targetStatus === 'on-track'
      ? 'primary'
      : metrics.targetPace.targetStatus === 'behind'
      ? 'warning'
      : 'danger';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ───────────── HERO: Branch Health & Performance Narrative ───────────── */}
      <section className="hero-panel rounded-3xl p-5 sm:p-7" aria-labelledby="branch-health-heading">
        <div className="grid lg:grid-cols-[auto,1fr,1fr] gap-6 lg:gap-8 items-center">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing value={metrics.healthScore.score} sublabel={metrics.healthScore.grade} />
            <div className="text-center">
              <div id="branch-health-heading" className="text-xs uppercase tracking-wider font-bold text-primary-300">
                Outlet Viability
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{monthLabel(month)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-400/10 border border-primary-400/25 text-primary-300 text-[11px] font-semibold">
                <Icon name="bank" size={12} />
                <span>{branch.name}</span>
                <span className="opacity-75">· {branch.location || 'HQ'}</span>
              </div>
              {company && (
                <button
                  type="button"
                  onClick={onBackToCompany}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
                >
                  <Icon name="briefcase" size={11} />
                  <span>{company.name}</span>
                </button>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
              {!hasData
                ? 'Record daily revenue and utility bills in this branch ledger to see live unit economics.'
                : metrics.netProfit < 0
                ? `${branch.name} is running at a monthly operational deficit of ${formatRs(Math.abs(metrics.netProfit))}. Overhead containment required.`
                : metrics.targetPace.targetStatus === 'achieved'
                ? `Target reached! Generated ${formatRs(metrics.revenue)} with a ${(metrics.operatingMargin * 100).toFixed(0)}% contribution margin.`
                : `Run-rate indicates ${formatRs(metrics.targetPace.projectedMonthEnd)} projected by month end (${metrics.targetPace.projectedPct}% of monthly target).`}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {branch.branchType || 'Outlet'} operating with{' '}
              {metrics.monthlyTarget > 0 ? (
                <>
                  target pace at <strong className="text-white">{metrics.targetPace.achievedPct}%</strong> of {formatRs(metrics.monthlyTarget)}.
                </>
              ) : (
                'no monthly target assigned yet.'
              )}{' '}
              Daily sales averaging {formatRs(metrics.targetPace.dailyAverage)} across active operational days.
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

      {/* ───────────── 4 TOP OPERATIONAL KPIS ───────────── */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BranchKpi
          label="Branch Inflows"
          value={formatRs(metrics.revenue)}
          icon="arrow-up"
          spark={revenueSpark}
          sparkColor="var(--color-success-solid)"
          footer={
            metrics.prevMonthRevenue > 0 ? (
              <span className={metrics.revenue >= metrics.prevMonthRevenue ? 'text-success-text font-bold' : 'text-danger-text font-bold'}>
                {metrics.revenue >= metrics.prevMonthRevenue ? '▲' : '▼'}{' '}
                {Math.abs(Math.round(((metrics.revenue - metrics.prevMonthRevenue) / metrics.prevMonthRevenue) * 100))}% vs last mo
              </span>
            ) : (
              'Recorded sales & receipts'
            )
          }
          tone="success"
        />

        <BranchKpi
          label="Target Pace"
          value={metrics.monthlyTarget > 0 ? `${metrics.targetPace.achievedPct}%` : 'No Target'}
          icon="target"
          footer={
            metrics.monthlyTarget > 0 ? (
              <span>
                Target: <strong className="text-text">{formatRs(metrics.monthlyTarget)}</strong>
              </span>
            ) : (
              'Set target in Workspace'
            )
          }
          tone={metrics.targetPace.achievedPct >= 100 ? 'success' : undefined}
        />

        <BranchKpi
          label="Operating Costs"
          value={formatRs(metrics.totalCosts)}
          icon="arrow-down"
          spark={costSpark}
          sparkColor="var(--color-danger-solid)"
          footer={
            <span>
              Utilities: <strong className="text-text">{formatRs(metrics.utilityCosts)}</strong>
            </span>
          }
          tone={metrics.totalCosts > metrics.revenue ? 'danger' : undefined}
        />

        <BranchKpi
          label="Net Contribution"
          value={formatRs(metrics.netProfit)}
          icon="wallet"
          footer={
            <span>
              Margin: <strong className="text-text">{(metrics.operatingMargin * 100).toFixed(0)}%</strong>
            </span>
          }
          tone={metrics.netProfit >= 0 ? 'success' : 'danger'}
        />
      </section>

      {/* ───────────── SUB-TABS NAVIGATION ───────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 flex-wrap">
        <SegmentedTabs
          options={tabs}
          value={activeTab}
          onChange={t => setActiveTab(t as BranchTab)}
        />
        <div className="flex items-center gap-2">
          {onBackToCompany && (
            <Button variant="ghost" size="sm" onClick={onBackToCompany} iconLeft={<Icon name="chevron-left" size={13} />}>
              Back to Company
            </Button>
          )}
          <Link href="/advanced?tab=businesses">
            <Button variant="secondary" size="sm" iconLeft={<Icon name="edit" size={13} />}>
              Record Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* ───────────── TAB CONTENT ───────────── */}
      {!hasData ? (
        <Card className="p-8 text-center">
          <EmptyState
            title="No Records for this Branch"
            helper="Record daily sales revenue and utility invoices in the Business Workspace to see unit waterfalls, sales rhythms, and target progress."
            action={
              <Link href="/advanced?tab=businesses">
                <Button variant="primary" size="sm">
                  Record Inflow / Cost
                </Button>
              </Link>
            }
          />
        </Card>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Branch Waterfall */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <Icon name="analysis" size={15} className="text-primary-text" />
                    Branch Unit Cash Flow Waterfall
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Operating margin flow from gross branch receipts to net cash contribution
                  </p>
                </div>
              </div>
              <WaterfallChart steps={branchWaterfall} />
            </Card>

            {/* Target Pacing & Velocity Card */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-text flex items-center gap-2">
                      <Icon name="target" size={15} className="text-primary-text" />
                      Monthly Target Pacing Tracker
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Pacing velocity vs target quota for {monthLabel(month)}
                    </p>
                  </div>
                  <Badge tone={targetTone}>
                    {metrics.targetPace.targetStatus.toUpperCase()}
                  </Badge>
                </div>

                {metrics.monthlyTarget > 0 ? (
                  <div className="space-y-4 my-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Recorded to Date</span>
                      <span className="font-bold num">
                        {formatRs(metrics.revenue)} / {formatRs(metrics.monthlyTarget)} ({metrics.targetPace.achievedPct}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={metrics.revenue}
                      max={metrics.monthlyTarget}
                      tone={targetTone}
                      size="lg"
                    />

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/70">
                      <div className="p-3 rounded-xl bg-surface-hover/70 border border-border/80">
                        <div className="text-[11px] text-muted font-semibold uppercase">Daily Sales Run-Rate</div>
                        <div className="text-base font-extrabold text-text num mt-1">
                          {formatRs(metrics.targetPace.dailyAverage)} <span className="text-xs font-normal text-muted">/ day</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-hover/70 border border-border/80">
                        <div className="text-[11px] text-muted font-semibold uppercase">Projected Month-End</div>
                        <div className="text-base font-extrabold text-text num mt-1">
                          {formatRs(metrics.targetPace.projectedMonthEnd)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted">
                    No monthly sales target configured for this branch.
                    <div className="mt-2">
                      <Link href="/advanced?tab=businesses">
                        <Button variant="secondary" size="sm">Set Branch Target</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {metrics.topEntries.length > 0 && (
                <div className="pt-4 border-t border-border/70">
                  <div className="text-xs font-bold text-text mb-2 flex items-center justify-between">
                    <span>Recent Significant Ledger Entries</span>
                    <span className="text-muted font-normal text-[11px]">Top entries</span>
                  </div>
                  <div className="space-y-1.5">
                    {metrics.topEntries.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-hover/40">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${e.type === 'revenue' ? 'bg-success-solid' : 'bg-danger-solid'}`} />
                          <span className="font-medium text-text">{e.category || e.type}</span>
                          <span className="text-muted text-[11px]">({e.date})</span>
                        </div>
                        <span className={`font-bold num ${e.type === 'revenue' ? 'text-success-text' : 'text-danger-text'}`}>
                          {e.type === 'revenue' ? '+' : '-'}{formatRs(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : activeTab === 'rhythm' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekday Distribution */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1 flex items-center gap-2">
              <Icon name="calendar" size={15} className="text-primary-text" />
              Peak Weekday Sales Rhythm
            </h3>
            <p className="text-xs text-muted mb-4">
              Aggregate sales revenue distributed by day of the week (Sun – Sat)
            </p>
            <div className="py-4">
              <WeekdayBars values={metrics.weekdayTotals} formatValue={compactNumber} />
            </div>
          </Card>

          {/* Daily Sales Calendar Heatmap */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1 flex items-center gap-2">
              <Icon name="analysis" size={15} className="text-primary-text" />
              Daily Sales Heatmap
            </h3>
            <p className="text-xs text-muted mb-4">
              Daily revenue intensity across the month of {monthLabel(month)}
            </p>
            <HeatCalendar cells={metrics.dailySales} formatValue={compactNumber} />
          </Card>
        </div>
      ) : activeTab === 'costs' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1 flex items-center gap-2">
              <Icon name="credit-card" size={15} className="text-primary-text" />
              Utility Bills vs Operating Overheads
            </h3>
            <p className="text-xs text-muted mb-4">
              Distribution of cost drivers for {branch.name}
            </p>
            <div className="flex items-center justify-center py-4">
              {donutSlices.length > 0 ? (
                <DonutChart
                  data={donutSlices}
                  centerLabel="Total Bills"
                  centerValue={formatRs(metrics.totalCosts)}
                />
              ) : (
                <div className="text-xs text-muted py-8">No operating bills recorded</div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-text mb-1">Cost Categories</h3>
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
                    max={metrics.totalCosts || 1}
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
                6-Month Branch Trend & 3-Month Projection
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Revenue vs cost historical trends with damped growth forecast
              </p>
            </div>
            <Badge tone="primary">Confidence Band: ±15%</Badge>
          </div>
          <TrendChart data={trendData} />
        </Card>
      )}
    </div>
  );
}
