'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, formatRs } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import {
  CATEGORY_PALETTE,
  DonutChart,
  HeatCalendar,
  ProgressTrack,
  RadarChart,
  ScoreRing,
  Sparkline,
  TrendChart,
  WaterfallChart,
  WeekdayBars,
  compactNumber,
  type TrendPoint,
  type WaterfallStep,
} from '@/components/charts/Charts';
import { AnalysisScopeSelector, type AnalysisScope } from './_components/AnalysisScopeSelector';
import { CompanyAnalysisView } from './_components/CompanyAnalysisView';
import { BranchAnalysisView } from './_components/BranchAnalysisView';
import {
  addMonths,
  buildPlan,
  buildSeries,
  categoryChanges,
  dailySpending,
  debtSummary,
  financialLadder,
  firstDataMonth,
  forecastMonths,
  goalProjections,
  healthScore,
  liquidReserves,
  monthLabel,
  monthOf,
  monthPace,
  monthPoint,
  runwayMonths,
  todayISO,
  upcomingObligations,
  type GoalStatus,
  type HealthFactor,
} from '@/lib/insights';

type Tab = 'overview' | 'spending' | 'forecast' | 'goals';

const ESSENTIAL = ['Rent', 'Utilities', 'Medical', 'Education', 'Insurance'];

const FACTOR_SHORT: Record<string, string> = {
  savings: 'Savings',
  spending: 'Spending',
  debt: 'Debt',
  runway: 'Runway',
  goals: 'Goals',
  budget: 'Budget',
};

const GOAL_STATUS: Record<GoalStatus, { label: string; tone: 'success' | 'primary' | 'warning' | 'danger' }> = {
  achieved: { label: 'Achieved', tone: 'success' },
  'on-track': { label: 'On track', tone: 'primary' },
  behind: { label: 'Behind pace', tone: 'warning' },
  stalled: { label: 'Stalled', tone: 'danger' },
  overdue: { label: 'Overdue', tone: 'danger' },
};

const factorColor = (score: number) => (score >= 70 ? 'var(--color-success-solid)' : score >= 45 ? 'var(--color-primary-400)' : score >= 25 ? 'var(--color-warning-solid)' : 'var(--color-danger-solid)');

/* ─────────────────────────── small building blocks ─────────────────────────── */

function SectionTitle({ icon, title, hint, right }: { icon: IconName; title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="font-bold text-sm text-text flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary-text flex items-center justify-center">
            <Icon name={icon} size={15} />
          </span>
          <span>{title}</span>
        </div>
        {hint && <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-xl">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function Delta({ current, previous, invert = false }: { current: number; previous: number | null; invert?: boolean }) {
  if (previous === null || previous === 0) return <span className="text-[11px] text-muted">No prior month</span>;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (!isFinite(change)) return null;
  const good = invert ? change <= 0 : change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold num ${good ? 'text-success-text' : 'text-danger-text'}`}>
      <Icon name={change >= 0 ? 'arrow-up' : 'arrow-down'} size={11} />
      {Math.abs(change).toFixed(0)}% <span className="font-medium text-muted ml-0.5">vs last month</span>
    </span>
  );
}

function Kpi({
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
      <div className={`text-xl font-extrabold tracking-tight num ${tone === 'danger' ? 'text-danger-text' : tone === 'success' ? 'text-success-text' : 'text-text'}`}>{value}</div>
      <div className="flex items-end justify-between gap-2 min-h-[34px]">
        <div className="text-[11px] leading-tight">{footer}</div>
        {spark && spark.length > 1 && <Sparkline values={spark} color={sparkColor} width={84} height={30} />}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────── page ─────────────────────────────────── */

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get('tab') as Tab) || 'overview';
  const initialTab: Tab = (['overview', 'spending', 'forecast', 'goals'] as Tab[]).includes(rawTab) ? rawTab : 'overview';
  const urlMonth = searchParams.get('month');

  const { state, dispatch } = useApp();
  const month = urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) ? urlMonth : state.selectedMonth;
  const today = todayISO();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [trim, setTrim] = useState(10);
  const [extraSave, setExtraSave] = useState(5000);

  // Business & Branch Scope State
  const rawScope = searchParams.get('scope') as AnalysisScope;
  const initialScope: AnalysisScope = (['consolidated', 'company', 'branch'] as AnalysisScope[]).includes(rawScope) ? rawScope : 'consolidated';
  const [scope, setScope] = useState<AnalysisScope>(initialScope);

  const rawCompanyId = searchParams.get('companyId') || '';
  const [companyId, setCompanyId] = useState(rawCompanyId);

  const rawBranchId = searchParams.get('branchId') || '';
  const [branchId, setBranchId] = useState(rawBranchId);

  const isBusinessUser =
    state.profile.plan === 'business' ||
    state.profile.workMode !== 'salary' ||
    (state.companies && state.companies.length > 0) ||
    (state.businessBranches && state.businessBranches.length > 0);

  const selectedCompany = state.companies.find(c => c.id === (companyId || state.companies[0]?.id)) || state.companies[0];
  const companyBranches = state.businessBranches.filter(b => b.companyId === (selectedCompany?.id || ''));
  const selectedBranch =
    state.businessBranches.find(b => b.id === branchId) ||
    companyBranches[0] ||
    state.businessBranches[0];

  useEffect(() => {
    if (rawTab && (['overview', 'spending', 'forecast', 'goals'] as Tab[]).includes(rawTab) && rawTab !== tab) {
      setTab(rawTab);
    }
  }, [rawTab, tab]);

  useEffect(() => {
    if (rawScope && (['consolidated', 'company', 'branch'] as AnalysisScope[]).includes(rawScope) && rawScope !== scope) {
      setScope(rawScope);
    }
  }, [rawScope, scope]);

  useEffect(() => {
    if (rawCompanyId && rawCompanyId !== companyId) {
      setCompanyId(rawCompanyId);
    }
  }, [rawCompanyId, companyId]);

  useEffect(() => {
    if (rawBranchId && rawBranchId !== branchId) {
      setBranchId(rawBranchId);
    }
  }, [rawBranchId, branchId]);

  useEffect(() => {
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) && urlMonth !== state.selectedMonth) {
      dispatch({ type: 'SET_MONTH', month: urlMonth });
    }
  }, [urlMonth, state.selectedMonth, dispatch]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`/analysis?${params.toString()}`, { scroll: false });
  };

  const handleScopeChange = (newScope: AnalysisScope, newCompanyId?: string, newBranchId?: string) => {
    setScope(newScope);
    const params = new URLSearchParams(searchParams.toString());
    if (newScope === 'consolidated') {
      params.delete('scope');
      params.delete('companyId');
      params.delete('branchId');
    } else if (newScope === 'company') {
      const coId = newCompanyId || companyId || state.companies[0]?.id || '';
      params.set('scope', 'company');
      if (coId) {
        params.set('companyId', coId);
        setCompanyId(coId);
      }
      params.delete('branchId');
    } else if (newScope === 'branch') {
      const coId = newCompanyId || companyId || selectedBranch?.companyId || state.companies[0]?.id || '';
      const brId = newBranchId || branchId || companyBranches[0]?.id || state.businessBranches[0]?.id || '';
      params.set('scope', 'branch');
      if (coId) {
        params.set('companyId', coId);
        setCompanyId(coId);
      }
      if (brId) {
        params.set('branchId', brId);
        setBranchId(brId);
      }
    }
    router.replace(`/analysis?${params.toString()}`, { scroll: false });
  };

  const handleMonthChange = (newMonth: string) => {
    dispatch({ type: 'SET_MONTH', month: newMonth });
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    router.replace(`/analysis?${params.toString()}`, { scroll: false });
  };

  const hasData = state.income.length + state.expenses.length > 0;

  const series = useMemo(() => buildSeries(state, month, 6), [state, month]);
  const forecast = useMemo(() => forecastMonths(state, series, 3), [state, series]);
  const current = useMemo(() => monthPoint(state, month), [state, month]);
  const prevMonthKey = addMonths(month, -1);
  const prevPoint = series.length > 1 ? series[series.length - 2] : null;
  const cats = useMemo(() => categoryChanges(state, month), [state, month]);
  const daily = useMemo(() => dailySpending(state, month), [state, month]);
  const pace = useMemo(() => monthPace(state, month, today), [state, month, today]);
  const health = useMemo(() => healthScore(state, month, today), [state, month, today]);
  const debt = useMemo(() => debtSummary(state, month), [state, month]);
  const goals = useMemo(() => goalProjections(state, today), [state, today]);
  const plan = useMemo(() => buildPlan(state, month, today), [state, month, today]);
  const ladder = useMemo(() => financialLadder(state, month), [state, month]);
  const obligations = useMemo(() => upcomingObligations(state, today, 30).filter(o => o.daysUntil >= -7), [state, today]);
  const runway = runwayMonths(state, month);
  const reserves = liquidReserves(state);

  const minMonth = firstDataMonth(state) ?? month;
  const maxMonth = monthOf(today) > month ? monthOf(today) : month;
  const prevM = month > minMonth ? prevMonthKey : null;
  const nextM = month < maxMonth ? addMonths(month, 1) : null;

  const trendData: TrendPoint[] = [
    ...series.map(p => ({ label: monthLabel(p.month, 'short'), income: p.income, outflow: p.outflow, net: p.net })),
    ...forecast.map(f => ({ label: monthLabel(f.month, 'short'), income: f.income, outflow: f.outflow, net: f.net, isForecast: true, outflowLow: f.outflowLow, outflowHigh: f.outflowHigh })),
  ];

  const waterfall: WaterfallStep[] = [
    { label: 'Income', value: current.income, kind: 'start' },
    { label: 'Living', value: -current.living, kind: 'delta' },
    { label: 'Debt pmts', value: -current.financePayments, kind: 'delta' },
    { label: 'Interest', value: -current.loanInterest, kind: 'delta' },
    { label: 'Savings', value: -current.savings, kind: 'delta' },
    { label: 'Net', value: current.net, kind: 'end' },
  ].filter(s => s.kind !== 'delta' || s.value !== 0) as WaterfallStep[];

  const donut = cats.filter(c => c.current > 0).map((c, i) => ({ label: c.category, value: c.current, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }));
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  daily.forEach(d => {
    weekdayTotals[d.weekday] += d.amount;
  });
  const topExpenses = state.expenses.filter(e => e.date.startsWith(month)).sort((a, b) => b.amount - a.amount).slice(0, 5);

  /* ─ coach narrative ─ */
  const nextFc = forecast[0];
  const headline = !hasData
    ? 'Add income and expenses to unlock predictions.'
    : current.net < 0
    ? `You’re spending ${formatRs(Math.abs(current.net))} more than you earn this month — closing that gap is priority one.`
    : current.savingsRate >= 0.2
    ? `Excellent discipline — you’re keeping ${(current.savingsRate * 100).toFixed(0)}% of your income. Put it to work toward your goals.`
    : `You’re cash-flow positive. Lifting your savings rate from ${(current.savingsRate * 100).toFixed(0)}% to 20% is your next big win.`;
  const outlook = nextFc
    ? nextFc.net < 0
      ? `${monthLabel(nextFc.month)} is forecast to end ${formatRs(Math.abs(nextFc.net))} short (${Math.round(nextFc.shortfallRisk * 100)}% risk).`
      : `${monthLabel(nextFc.month)} is forecast to end with about ${formatRs(nextFc.net)} spare${nextFc.shortfallRisk >= 0.25 ? `, but ${Math.round(nextFc.shortfallRisk * 100)}% risk of a dip` : ''}.`
    : '';

  /* ─ what-if simulators ─ */
  const discretionary = cats.filter(c => !ESSENTIAL.includes(c.category)).reduce((s, c) => s + c.current, 0);
  const discShare = current.living > 0 ? discretionary / current.living : 0;
  const trimSaving = nextFc ? nextFc.living * discShare * (trim / 100) : 0;
  const burn = current.living + current.financePayments + current.loanInterest;
  const efNeeded = Math.max(0, burn * 3 - reserves);
  const efMonths = extraSave > 0 && efNeeded > 0 ? Math.ceil(efNeeded / extraSave) : efNeeded === 0 ? 0 : null;

  const payoffOrder = [...debt.items]
    .filter(i => i.kind !== 'finance')
    .sort((a, b) => b.monthlyCost / Math.max(1, b.balance) - a.monthlyCost / Math.max(1, a.balance));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Icon name="analysis" size={13} /> },
    { id: 'spending', label: 'Spending', icon: <Icon name="credit-card" size={13} /> },
    { id: 'forecast', label: 'Forecast', icon: <Icon name="bolt" size={13} /> },
    { id: 'goals', label: 'Goals & Debt', icon: <Icon name="target" size={13} /> },
  ];

  const pageTitle =
    scope === 'company' && selectedCompany
      ? `${selectedCompany.name} Intelligence`
      : scope === 'branch' && selectedBranch
      ? `${selectedBranch.name} Analytics`
      : 'Financial Analysis';

  const pageDescription =
    scope === 'company' && selectedCompany
      ? 'Consolidated enterprise performance, cross-branch comparison, and forward projections.'
      : scope === 'branch' && selectedBranch
      ? `Unit economics, sales rhythm, and target pacing for ${selectedBranch.location || 'this operating outlet'}.`
      : 'Health scores, spending patterns, forecasts, and financial milestones.';

  return (
    <PageContainer>
      <PageHeader
        eyebrow={scope === 'company' ? 'Enterprise' : scope === 'branch' ? 'Branch Unit' : 'Intelligence'}
        title={pageTitle}
        description={pageDescription}
        actions={
          <>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-hover border border-border no-print">
              <Button variant="ghost" size="sm" onClick={() => prevM && handleMonthChange(prevM)} disabled={!prevM} className="!p-1.5" title="Previous month" aria-label="Previous month">
                <Icon name="chevron-left" size={16} />
              </Button>
              <span className="px-2 text-xs font-bold text-text min-w-[104px] text-center">{monthLabel(month)}</span>
              <Button variant="ghost" size="sm" onClick={() => nextM && handleMonthChange(nextM)} disabled={!nextM} className="!p-1.5" title="Next month" aria-label="Next month">
                <Icon name="chevron-right" size={16} />
              </Button>
            </div>
            {scope === 'consolidated' ? (
              <Link href="/print/analysis" target="_blank" className="no-print">
                <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={14} />}>
                  Export PDF
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                iconLeft={<Icon name="download" size={14} />}
                className="no-print"
              >
                Export Report
              </Button>
            )}
          </>
        }
      />

      {isBusinessUser && (
        <AnalysisScopeSelector
          scope={scope}
          companyId={selectedCompany?.id || ''}
          branchId={selectedBranch?.id || ''}
          onScopeChange={handleScopeChange}
        />
      )}

      {scope === 'company' ? (
        selectedCompany ? (
          <CompanyAnalysisView
            company={selectedCompany}
            month={month}
            today={today}
            onSelectBranch={bId => handleScopeChange('branch', selectedCompany.id, bId)}
          />
        ) : (
          <Card className="p-8 text-center">
            <EmptyState
              title="No Companies Registered"
              helper="Register your enterprise corporate entity to unlock multi-branch intelligence and company waterfalls."
              action={
                <Link href="/advanced?tab=businesses">
                  <Button variant="primary" size="sm">
                    Add Company
                  </Button>
                </Link>
              }
            />
          </Card>
        )
      ) : scope === 'branch' ? (
        selectedBranch ? (
          <BranchAnalysisView
            branch={selectedBranch}
            company={state.companies.find(c => c.id === selectedBranch.companyId)}
            month={month}
            today={today}
            onBackToCompany={() => handleScopeChange('company', selectedBranch.companyId)}
          />
        ) : (
          <Card className="p-8 text-center">
            <EmptyState
              title="No Branches Registered"
              helper="Register an operating outlet to track unit economics, daily sales rhythm, and target pacing."
              action={
                <Link href="/advanced?tab=businesses">
                  <Button variant="primary" size="sm">
                    Add Branch
                  </Button>
                </Link>
              }
            />
          </Card>
        )
      ) : !hasData ? (
        <Card>
          <EmptyState
            title="Nothing to analyse yet"
            helper="Record some income and expenses and this page turns into a live dashboard with forecasts, a health score and a plan to reach your goals."
            action={
              <Link href="/financial">
                <Button variant="primary" size="sm">
                  Add records
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* ───────────── HERO: health score + coach ───────────── */}
          <section className="hero-panel rounded-3xl p-5 sm:p-7 animate-rise-in" aria-labelledby="health-heading">
            <div className="grid lg:grid-cols-[auto,1fr,1fr] gap-6 lg:gap-8 items-center">
              <div className="flex flex-col items-center gap-3">
                <ScoreRing value={health.score} sublabel={health.grade} />
                <div className="text-center">
                  <div id="health-heading" className="text-xs uppercase tracking-wider font-bold text-primary-300">
                    Financial health
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{monthLabel(month)}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-400/10 border border-primary-400/25 text-primary-300 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                  Your money coach
                </div>
                <p className="text-lg sm:text-xl font-bold leading-snug text-white tracking-tight">{headline}</p>
                {outlook && <p className="text-sm text-slate-300 leading-relaxed">{outlook}</p>}
                {plan[0] && (
                  <Link href={plan[0].href || '/analysis'} className="inline-flex items-center gap-2 text-xs font-semibold text-primary-300 hover:text-primary-200 group">
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">Next best action</span>
                    <span className="text-slate-200">{plan[0].title}</span>
                    <Icon name="arrow-right" size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              <div className="space-y-2.5" aria-label="Score breakdown">
                {health.factors.map((f: HealthFactor) => (
                  <div key={f.key} title={f.detail}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-200">{f.label}</span>
                      <span className="num font-bold" style={{ color: factorColor(f.score) }}>
                        {Math.round(f.score)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.score}%`, background: factorColor(f.score) }} />
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">{f.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ───────────── KPI strip ───────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" aria-label="Key figures">
            <Kpi label="Income" icon="wallet" value={formatRs(current.income)} spark={series.map(s => s.income)} sparkColor="var(--color-success-solid)" footer={<Delta current={current.income} previous={prevPoint ? prevPoint.income : null} />} />
            <Kpi label="Outflow" icon="credit-card" value={formatRs(current.outflow)} spark={series.map(s => s.outflow)} footer={<Delta current={current.outflow} previous={prevPoint ? prevPoint.outflow : null} invert />} />
            <Kpi label="Net position" icon="analysis" value={formatRs(current.net)} tone={current.net < 0 ? 'danger' : 'success'} spark={series.map(s => s.net)} sparkColor={current.net < 0 ? 'var(--color-danger-solid)' : 'var(--color-success-solid)'} footer={<Delta current={current.net} previous={prevPoint ? prevPoint.net : null} />} />
            <Kpi label="Savings rate" icon="target" value={`${(current.savingsRate * 100).toFixed(0)}%`} spark={series.map(s => s.savingsRate)} footer={<span className="text-muted">Target 20%</span>} />
            <Kpi label="Daily burn" icon="bolt" value={formatRs(pace.dailyRate)} footer={<span className="text-muted">{pace.isCurrent ? `Safe limit ${formatRs(pace.safeDailyLimit)}/day` : 'Average this month'}</span>} />
            <Kpi label="Runway" icon="shield" value={runway === null ? '—' : `${runway.toFixed(1)} mo`} tone={runway !== null && runway < 1 ? 'danger' : undefined} footer={<span className="text-muted">Reserves {formatRs(reserves)}</span>} />
          </section>

          <div className="no-print">
            <SegmentedTabs options={tabs} value={tab} onChange={handleTabChange} aria-label="Analysis sections" />
          </div>

          {/* ═════════════════════════ OVERVIEW ═════════════════════════ */}
          {tab === 'overview' && (
            <div className="space-y-5 animate-rise-in">
              {current.shortfall > 0 && (
                <div className="p-5 rounded-2xl border border-danger-solid/30 bg-danger-tint/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-danger-solid text-white flex items-center justify-center flex-shrink-0">
                      <Icon name="alert" size={18} />
                    </span>
                    <div>
                      <div className="font-bold text-sm text-text">Shortfall of {formatRs(current.shortfall)} this month</div>
                      <p className="text-xs text-muted mt-1 leading-relaxed">Borrowing will add recurring interest. Review the plan below first — or record it as a loan to keep your books accurate.</p>
                    </div>
                  </div>
                  <Button variant="danger" size="sm" className="no-print flex-shrink-0" onClick={() => dispatch({ type: 'ADD_LOAN_FROM_SHORTFALL', amount: current.shortfall, month })}>
                    Record as loan →
                  </Button>
                </div>
              )}

              <Card>
                <SectionTitle
                  icon="analysis"
                  title="Income vs outflow — history & forecast"
                  hint="Solid lines represent actuals. Dashed lines project the next 3 months with expected variance."
                  right={
                    <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted flex-shrink-0">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-solid" /> Income</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Outflow</span>
                    </div>
                  }
                />
                <TrendChart data={trendData} formatValue={formatRs} />
              </Card>

              <div className="grid lg:grid-cols-5 gap-5">
                <Card className="lg:col-span-3">
                  <SectionTitle icon="wallet" title={`Where ${monthLabel(month)} went`} hint="From income down to what you keep." />
                  <WaterfallChart steps={waterfall} formatValue={compactNumber} />
                </Card>
                <Card className="lg:col-span-2">
                  <SectionTitle icon="heart" title="Health profile" hint="The bigger the shape, the stronger the money habits." />
                  <RadarChart axes={health.factors.map(f => ({ label: FACTOR_SHORT[f.key] || f.label, value: f.score }))} />
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <Card>
                  <SectionTitle icon="target" title="Action plan" hint="Ranked actions with the highest financial impact." />
                  <ol className="space-y-3">
                    {plan.map((s, idx) => (
                      <li key={s.id}>
                        <Link href={s.href || '/analysis'} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/40 transition-colors group">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 text-white ${
                              s.tone === 'danger' ? 'bg-danger-solid' : s.tone === 'warning' ? 'bg-warning-solid' : s.tone === 'success' ? 'bg-success-solid' : 'bg-primary-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-bold text-text leading-snug">{s.title}</div>
                            <div className="text-xs text-muted leading-relaxed mt-0.5">{s.detail}</div>
                          </div>
                          {s.impact && <span className="text-[11px] font-bold text-primary-text whitespace-nowrap num">{s.impact}</span>}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card>
                  <SectionTitle icon="shield" title="Financial independence milestones" hint="Key milestones from emergency buffer to long-term resilience." />
                  <ul className="space-y-3.5">
                    {ladder.map(r => (
                      <li key={r.id}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-2 font-semibold text-text">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${r.done ? 'bg-success-solid text-white' : 'bg-surface-hover text-muted border border-border'}`}>{r.done ? '✓' : ''}</span>
                            {r.label}
                          </span>
                          <span className="num font-bold text-muted">{Math.round(r.progress * 100)}%</span>
                        </div>
                        <ProgressTrack progress={r.progress} tone={r.done ? 'success' : 'primary'} />
                        <div className="text-[11px] text-muted mt-1">{r.hint}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* ═════════════════════════ SPENDING ═════════════════════════ */}
          {tab === 'spending' && (
            <div className="space-y-5 animate-rise-in">
              <div className="grid lg:grid-cols-5 gap-5">
                <Card className="lg:col-span-2">
                  <SectionTitle icon="credit-card" title="Spending mix" hint="Hover a slice to isolate a category." />
                  {donut.length === 0 ? (
                    <EmptyState title="No expenses recorded" helper="Add expenses for this month to see your spending mix." action={<Link href="/financial?tab=expenses"><Button variant="secondary" size="sm">Record expense</Button></Link>} />
                  ) : (
                    <div className="flex flex-col items-center gap-5">
                      <DonutChart data={donut} centerLabel="Total spent" centerValue={formatRs(current.living)} />
                      <ul className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {donut.slice(0, 8).map(d => (
                          <li key={d.label} className="flex items-center gap-2 text-xs min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="truncate text-text font-medium">{d.label}</span>
                            <span className="ml-auto num text-muted">{Math.round((d.value / current.living) * 100)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                <Card className="lg:col-span-3">
                  <SectionTitle icon="analysis" title="Category movement" hint="Compared with your 3-month trailing average with anomaly alerts." />
                  {cats.length === 0 ? (
                    <p className="text-xs text-muted">No category data yet.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
                            <th className="px-1 py-2 font-semibold">Category</th>
                            <th className="px-1 py-2 font-semibold text-right">This month</th>
                            <th className="px-1 py-2 font-semibold text-right hidden sm:table-cell">3‑mo avg</th>
                            <th className="px-1 py-2 font-semibold text-right">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cats.slice(0, 9).map((c, i) => (
                            <tr key={c.category} className="border-t border-border">
                              <td className="px-1 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }} />
                                  <span className="font-semibold text-text">{c.category}</span>
                                  {c.flag === 'spike' && <Badge tone="warning" size="sm">Spike</Badge>}
                                  {c.flag === 'new' && <Badge tone="primary" size="sm">New</Badge>}
                                  {c.flag === 'drop' && <Badge tone="success" size="sm">Lower</Badge>}
                                </div>
                              </td>
                              <td className="px-1 py-2.5 text-right num font-bold text-text">{formatRs(c.current)}</td>
                              <td className="px-1 py-2.5 text-right num text-muted hidden sm:table-cell">{formatRs(c.avg3)}</td>
                              <td className={`px-1 py-2.5 text-right num font-bold ${c.changePct === null ? 'text-muted' : c.changePct > 10 ? 'text-danger-text' : c.changePct < -10 ? 'text-success-text' : 'text-muted'}`}>
                                {c.changePct === null ? '—' : `${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(0)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid lg:grid-cols-5 gap-5">
                <Card className="lg:col-span-2">
                  <SectionTitle icon="calendar" title="Daily spending heat map" hint="Darker days = bigger spend." />
                  <HeatCalendar cells={daily} formatValue={formatRs} />
                </Card>
                <div className="lg:col-span-3 space-y-5">
                  <Card>
                    <SectionTitle icon="bolt" title="Month-end pace" hint={pace.isCurrent ? `Day ${pace.elapsed} of ${pace.daysInMonth}. Here is where today’s habits lead.` : 'Completed month summary.'} />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-surface-hover border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Spent</div>
                        <div className="text-sm font-extrabold num text-text mt-0.5">{formatRs(pace.spentSoFar)}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-hover border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">{pace.isCurrent ? 'Projected' : 'Final'}</div>
                        <div className="text-sm font-extrabold num text-text mt-0.5">{formatRs(pace.projectedLiving)}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-hover border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Projected net</div>
                        <div className={`text-sm font-extrabold num mt-0.5 ${pace.projectedNet < 0 ? 'text-danger-text' : 'text-success-text'}`}>{formatRs(pace.projectedNet)}</div>
                      </div>
                    </div>
                    <ProgressTrack
                      progress={current.income > 0 ? pace.spentSoFar / Math.max(1, current.income - current.financePayments - current.loanInterest - current.savings) : 0}
                      marker={pace.isCurrent ? pace.elapsed / pace.daysInMonth : undefined}
                      tone={pace.projectedNet < 0 ? 'danger' : 'primary'}
                    />
                    <p className="text-[11px] text-muted mt-2 leading-relaxed">
                      {pace.isCurrent
                        ? pace.projectedNet < 0
                          ? `At ${formatRs(pace.dailyRate)}/day you’ll overshoot. Staying under ${formatRs(pace.safeDailyLimit)}/day for the remaining ${pace.remainingDays} days keeps you in the green.`
                          : `You can spend up to ${formatRs(pace.safeDailyLimit)}/day for the remaining ${pace.remainingDays} days and still finish positive.`
                        : 'The marker shows how far through the month you are; the bar shows how much of your spendable budget is used.'}
                    </p>
                  </Card>
                  <Card>
                    <SectionTitle icon="calendar" title="Which days cost you most" />
                    <WeekdayBars values={weekdayTotals} formatValue={compactNumber} />
                  </Card>
                </div>
              </div>

              {topExpenses.length > 0 && (
                <Card>
                  <SectionTitle icon="file-text" title="Biggest single expenses" />
                  <ul className="divide-y divide-border">
                    {topExpenses.map(e => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-text truncate">{e.note || e.category}</div>
                          <div className="text-muted">{e.category} · {e.date}</div>
                        </div>
                        <div className="num font-bold text-text">{formatRs(e.amount)}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {/* ═════════════════════════ FORECAST ═════════════════════════ */}
          {tab === 'forecast' && (
            <div className="space-y-5 animate-rise-in">
              {forecast.length === 0 ? (
                <Card><p className="text-xs text-muted">Not enough history to forecast yet.</p></Card>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {forecast.map(f => {
                    const risk = f.shortfallRisk;
                    const riskTone = risk >= 0.4 ? 'danger' : risk >= 0.15 ? 'warning' : 'success';
                    return (
                      <Card key={f.month} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-1 ${riskTone === 'danger' ? 'bg-danger-solid' : riskTone === 'warning' ? 'bg-warning-solid' : 'bg-success-solid'}`} />
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-bold text-sm text-text">{monthLabel(f.month)}</div>
                          <Badge tone={riskTone} size="sm">{risk >= 0.4 ? 'High risk' : risk >= 0.15 ? 'Watch' : 'Comfortable'}</Badge>
                        </div>
                        <div className={`text-2xl font-black tracking-tight num ${f.net < 0 ? 'text-danger-text' : 'text-text'}`}>{formatRs(f.net)}</div>
                        <div className="text-[11px] text-muted mb-4">projected net · likely {formatRs(f.netLow)} to {formatRs(f.netHigh)}</div>
                        <dl className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><dt className="text-muted">Income</dt><dd className="num font-semibold text-text">{formatRs(f.income)}</dd></div>
                          <div className="flex justify-between"><dt className="text-muted">Living costs</dt><dd className="num font-semibold text-text">{formatRs(f.living)}</dd></div>
                          <div className="flex justify-between"><dt className="text-muted">Debt & interest</dt><dd className="num font-semibold text-text">{formatRs(f.financePayments + f.loanInterest)}</dd></div>
                          <div className="flex justify-between"><dt className="text-muted">Savings goals</dt><dd className="num font-semibold text-text">{formatRs(f.savings)}</dd></div>
                        </dl>
                        <div className="mt-4">
                          <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-muted mb-1">
                            <span>Shortfall risk</span>
                            <span className="num">{Math.round(risk * 100)}%</span>
                          </div>
                          <ProgressTrack progress={Math.max(0.03, risk)} tone={riskTone === 'success' ? 'success' : riskTone === 'warning' ? 'warning' : 'danger'} />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-5">
                <Card>
                  <SectionTitle icon="bolt" title="Discretionary trim simulator" hint="Simulate savings without altering fixed obligations like rent and utilities." />
                  <div className="flex items-center gap-4 mb-5">
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={5}
                      value={trim}
                      onChange={e => setTrim(Number(e.target.value))}
                      aria-label="Percentage to trim"
                      className="flex-1 accent-[var(--color-primary-500)]"
                    />
                    <span className="num text-lg font-black text-primary-text w-14 text-right">{trim}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-border bg-surface-hover">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Extra each month</div>
                      <div className="text-xl font-extrabold num text-success-text mt-1">+{formatRs(trimSaving)}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-surface-hover">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Over 12 months</div>
                      <div className="text-xl font-extrabold num text-success-text mt-1">+{formatRs(trimSaving * 12)}</div>
                    </div>
                  </div>
                  {nextFc && (
                    <p className="text-[11px] text-muted mt-3 leading-relaxed">
                      Discretionary spending is ~{Math.round(discShare * 100)}% of your living costs. {nextFc.net < 0 && trimSaving > 0 ? (trimSaving >= Math.abs(nextFc.net) ? 'This alone would close next month’s forecast shortfall.' : `This closes ${Math.round((trimSaving / Math.abs(nextFc.net)) * 100)}% of next month’s forecast shortfall.`) : ''}
                    </p>
                  )}
                </Card>

                <Card>
                  <SectionTitle icon="shield" title="Emergency cushion simulator" hint="Simulate target completion dates based on monthly contribution rate." />
                  <div className="flex items-center gap-4 mb-5">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(10000, Math.round((current.income * 0.3) / 1000) * 1000)}
                      step={500}
                      value={extraSave}
                      onChange={e => setExtraSave(Number(e.target.value))}
                      aria-label="Extra monthly saving"
                      className="flex-1 accent-[var(--color-primary-500)]"
                    />
                    <span className="num text-base font-black text-primary-text w-28 text-right">{formatRs(extraSave)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-border bg-surface-hover">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Still needed</div>
                      <div className="text-xl font-extrabold num text-text mt-1">{formatRs(efNeeded)}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-surface-hover">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Ready in</div>
                      <div className="text-xl font-extrabold num text-primary-text mt-1">{efMonths === null ? '—' : efMonths === 0 ? 'Done 🎉' : `${efMonths} mo`}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-3 leading-relaxed">Target = 3 × your monthly essentials ({formatRs(burn)}). You currently hold {formatRs(reserves)} across accounts and goals.</p>
                </Card>
              </div>

              <Card className="!bg-surface-hover/60">
                <div className="flex items-start gap-3 text-xs text-muted leading-relaxed">
                  <Icon name="info" size={16} className="text-primary-text flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-text">How forecasts work:</strong> spending uses a damped linear trend over your last six months; income uses your recurring amounts plus the average of one‑off income; instalments roll off when they finish. The shaded band and risk % come from how volatile your spending has been — they are estimates, not guarantees.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* ═════════════════════════ GOALS & DEBT ═════════════════════════ */}
          {tab === 'goals' && (
            <div className="space-y-5 animate-rise-in">
              <Card>
                <SectionTitle icon="target" title="Goal projections" hint="Based on what you actually contributed over the last 30 days." right={<Link href="/goals" className="no-print"><Button variant="secondary" size="sm">Manage goals</Button></Link>} />
                {goals.length === 0 ? (
                  <EmptyState title="No goals yet" helper="Create a savings goal and Fintarg will track your pace and project the finish date." action={<Link href="/goals"><Button variant="primary" size="sm">Create goal</Button></Link>} />
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {goals.map(g => {
                      const st = GOAL_STATUS[g.status];
                      const totalDays = Math.max(1, g.daysLeft + 90);
                      const expected = g.status === 'achieved' ? 1 : Math.min(1, Math.max(0, 1 - g.daysLeft / totalDays));
                      return (
                        <div key={g.id} className="p-4 rounded-2xl border border-border bg-surface hover:border-primary-500/40 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-text truncate">{g.name}</div>
                              <div className="text-[11px] text-muted mt-0.5">Deadline {g.deadline}{g.daysLeft >= 0 ? ` · ${g.daysLeft} days left` : ' · passed'}</div>
                            </div>
                            <Badge tone={st.tone} size="sm">{st.label}</Badge>
                          </div>
                          <div className="flex items-end justify-between mb-2">
                            <div className="text-lg font-extrabold num text-text">{formatRs(g.saved)}</div>
                            <div className="text-xs text-muted num">of {formatRs(g.target)} · {Math.round(g.progress * 100)}%</div>
                          </div>
                          <ProgressTrack progress={g.progress} marker={g.status === 'achieved' ? undefined : expected} tone={g.status === 'achieved' || g.status === 'on-track' ? 'success' : g.status === 'behind' ? 'warning' : 'danger'} />
                          <dl className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
                            <div><dt className="text-muted">Your pace</dt><dd className="num font-bold text-text">{formatRs(g.paceDaily)}/day</dd></div>
                            <div><dt className="text-muted">Needed</dt><dd className="num font-bold text-text">{formatRs(g.neededDaily)}/day</dd></div>
                            <div><dt className="text-muted">Finish</dt><dd className="num font-bold text-text">{g.status === 'achieved' ? 'Done' : g.projectedDate || '—'}</dd></div>
                          </dl>
                          {(g.status === 'behind' || g.status === 'stalled') && (
                            <div className="mt-3 text-[11px] text-warning-text bg-warning-tint/50 border border-warning-solid/25 rounded-lg px-3 py-2 leading-relaxed">
                              Add about <strong className="num">{formatRs(g.catchUpMonthly)}</strong> a month to finish on time.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <div className="grid lg:grid-cols-5 gap-5">
                <Card className="lg:col-span-3">
                  <SectionTitle icon="bank" title="Debt overview" hint="Prioritise highest-cost obligations first to minimise interest drag." />
                  {debt.items.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-success-tint/40 border border-success-solid/25 text-xs text-success-text">
                      <Icon name="check" size={18} /> You have no active debt. Brilliant.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="p-3 rounded-xl bg-surface-hover border border-border">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Total owed</div>
                          <div className="text-sm font-extrabold num text-text mt-0.5">{formatRs(debt.totalDebt)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-hover border border-border">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Monthly cost</div>
                          <div className="text-sm font-extrabold num text-text mt-0.5">{formatRs(debt.totalMonthlyService)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-hover border border-border">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">Of income</div>
                          <div className={`text-sm font-extrabold num mt-0.5 ${debt.debtToIncome > 0.35 ? 'text-danger-text' : debt.debtToIncome > 0.2 ? 'text-warning-text' : 'text-success-text'}`}>{(debt.debtToIncome * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <ul className="space-y-3.5">
                        {[...payoffOrder, ...debt.items.filter(i => i.kind === 'finance')].map((d, idx) => (
                          <li key={`${d.kind}-${d.label}-${idx}`}>
                            <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
                              <span className="flex items-center gap-2 min-w-0">
                                {d.kind !== 'finance' && idx === 0 && <Badge tone="warning" size="sm">Pay first</Badge>}
                                <span className="font-semibold text-text truncate">{d.label}</span>
                                <span className="text-muted capitalize flex-shrink-0">{d.kind}</span>
                              </span>
                              <span className="num font-bold text-text flex-shrink-0">{formatRs(d.monthlyCost)}<span className="text-muted font-medium">/mo</span></span>
                            </div>
                            <ProgressTrack progress={debt.totalMonthlyService > 0 ? d.monthlyCost / debt.totalMonthlyService : 0} tone={d.kind === 'finance' ? 'primary' : 'warning'} />
                            <div className="text-[11px] text-muted mt-1">{formatRs(d.balance)} remaining{d.ratePct !== null ? ` · ${d.ratePct}% rate` : ''}</div>
                          </li>
                        ))}
                      </ul>
                      {debt.debtFreeMonths !== null && debt.debtFreeMonths > 0 && (
                        <p className="text-[11px] text-muted mt-4 leading-relaxed">Instalments finish in about <strong className="text-text">{debt.debtFreeMonths} months</strong> ({monthLabel(addMonths(monthOf(today), debt.debtFreeMonths))}), freeing {formatRs(debt.financeMonthly)} a month.</p>
                      )}
                    </>
                  )}
                </Card>

                <Card className="lg:col-span-2">
                  <SectionTitle icon="calendar" title="Coming up" hint="Bills, instalments and reminders over the next 30 days." />
                  {obligations.length === 0 ? (
                    <p className="text-xs text-muted">Nothing due in the next 30 days.</p>
                  ) : (
                    <ol className="relative border-l border-border ml-2 space-y-4">
                      {obligations.slice(0, 8).map(o => {
                        const urgent = o.daysUntil <= 3;
                        return (
                          <li key={o.id} className="pl-5 relative">
                            <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[var(--color-surface)] ${o.daysUntil < 0 ? 'bg-danger-solid' : urgent ? 'bg-warning-solid' : 'bg-primary-500'}`} />
                            <Link href={o.href} className="block group">
                              <div className="text-xs font-semibold text-text group-hover:text-primary-text transition-colors">{o.label}</div>
                              <div className="text-[11px] text-muted num">
                                {o.date} · {o.daysUntil < 0 ? `${Math.abs(o.daysUntil)}d overdue` : o.daysUntil === 0 ? 'today' : `in ${o.daysUntil}d`}
                                {o.amount !== undefined ? ` · ${formatRs(o.amount)}` : ''}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

export default function Analysis() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageHeader eyebrow="Intelligence" title="Financial Analysis" description="Loading analysis..." />
      </PageContainer>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
