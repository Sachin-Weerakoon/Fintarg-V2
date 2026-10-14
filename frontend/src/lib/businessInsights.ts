/**
 * Fintarg Business & Branch Intelligence Engine.
 *
 * Provides dedicated unit economics, health scoring, target pacing,
 * cash flow waterfalls, weekday sales rhythm, and forward forecasting
 * for individual businesses (companies) and individual operating branches.
 */

import type { AppState, BusinessBranch, BranchEntry, Company } from '@/types';
import { daysInMonth, addMonths, monthLabel } from './insights';
import type { TrendPoint, WaterfallStep } from '@/components/charts/Charts';

const pad = (n: number) => String(n).padStart(2, '0');

export interface BranchTargetPace {
  target: number;
  achieved: number;
  achievedPct: number;
  dailyAverage: number;
  projectedMonthEnd: number;
  projectedPct: number;
  targetStatus: 'achieved' | 'on-track' | 'behind' | 'at-risk';
  daysElapsed: number;
  totalDays: number;
}

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  hint: string;
}

export interface EntityHealthScore {
  score: number;
  grade: string;
  tone: 'success' | 'primary' | 'warning' | 'danger';
  factors: HealthFactor[];
}

export interface CostCategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface DaySalesCell {
  date: string;
  day: number;
  weekday: number; // 0 = Sunday
  amount: number;
}

export interface BranchMetrics {
  branchId: string;
  branchName: string;
  companyId: string;
  location: string;
  branchType: string;
  monthlyTarget: number;
  annualTarget: number;
  revenue: number;
  utilityCosts: number;
  otherCosts: number;
  totalCosts: number;
  netProfit: number;
  operatingMargin: number;
  costToIncomeRatio: number;
  targetPace: BranchTargetPace;
  weekdayTotals: number[]; // 7 elements (0 = Sunday .. 6 = Saturday)
  dailySales: DaySalesCell[];
  costCategories: CostCategoryItem[];
  healthScore: EntityHealthScore;
  topEntries: BranchEntry[];
  prevMonthRevenue: number;
  prevMonthCosts: number;
  prevMonthNet: number;
}

export interface BranchSummaryItem {
  branchId: string;
  name: string;
  location: string;
  revenue: number;
  costs: number;
  netProfit: number;
  marginPct: number;
  targetPct: number;
  revenueSharePct: number;
}

export interface CompanyMetrics {
  companyId: string;
  companyName: string;
  brNumber?: string;
  tinNumber?: string;
  sector?: string;
  entityType?: string;
  branchesCount: number;
  totalRevenue: number;
  totalUtilityCosts: number;
  totalOtherCosts: number;
  totalOperatingCosts: number;
  grossOperatingProfit: number;
  operatingMargin: number;
  ownerDraws: number;
  netRetainedProfit: number;
  totalMonthlyTarget: number;
  targetAchievedPct: number;
  branchSummaries: BranchSummaryItem[];
  costCategories: CostCategoryItem[];
  activeAgreementsCount: number;
  activeAgreementsValue: number;
  healthScore: EntityHealthScore;
  waterfall: WaterfallStep[];
  prevMonthRevenue: number;
  prevMonthCosts: number;
  prevMonthNet: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function getDayOfMonth(month: string, today: string): number {
  if (today.startsWith(month)) {
    return Math.min(daysInMonth(month), Math.max(1, Number(today.slice(8, 10))));
  }
  if (today > month) {
    return daysInMonth(month); // month is in the past
  }
  return 1; // month is in the future
}

function resolveGrade(score: number): { grade: string; tone: 'success' | 'primary' | 'warning' | 'danger' } {
  if (score >= 82) return { grade: 'A+ (Optimal)', tone: 'success' };
  if (score >= 72) return { grade: 'A (Strong)', tone: 'success' };
  if (score >= 60) return { grade: 'B+ (Healthy)', tone: 'primary' };
  if (score >= 48) return { grade: 'B (Stable)', tone: 'primary' };
  if (score >= 35) return { grade: 'C (Attention)', tone: 'warning' };
  return { grade: 'D (Deficit Risk)', tone: 'danger' };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Branch Analytics Engine                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export function calculateBranchMetrics(
  branch: BusinessBranch,
  month: string,
  today: string
): BranchMetrics {
  const dim = daysInMonth(month);
  const elapsed = getDayOfMonth(month, today);
  const entries = branch.entries || [];

  // Filter entries for selected month
  const monthEntries = entries.filter(e => e.date && e.date.startsWith(month));

  let revenue = 0;
  let utilityCosts = 0;
  let otherCosts = 0;
  const costMap: Record<string, number> = {};
  const dayRevenueMap: Record<string, number> = {};
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];

  for (const entry of monthEntries) {
    const amt = Number(entry.amount) || 0;
    if (entry.type === 'revenue') {
      revenue += amt;
      dayRevenueMap[entry.date] = (dayRevenueMap[entry.date] || 0) + amt;
      try {
        const d = new Date(Date.UTC(Number(entry.date.slice(0, 4)), Number(entry.date.slice(5, 7)) - 1, Number(entry.date.slice(8, 10))));
        const dayOfWeek = d.getUTCDay();
        weekdayTotals[dayOfWeek] += amt;
      } catch {
        // ignore date parse errors
      }
    } else if (entry.type === 'utility') {
      utilityCosts += amt;
      const cat = entry.category || 'Utilities';
      costMap[cat] = (costMap[cat] || 0) + amt;
    } else {
      otherCosts += amt;
      const cat = entry.category || 'Operating Expense';
      costMap[cat] = (costMap[cat] || 0) + amt;
    }
  }

  const totalCosts = utilityCosts + otherCosts;
  const netProfit = revenue - totalCosts;
  const operatingMargin = revenue > 0 ? netProfit / revenue : totalCosts > 0 ? -1 : 0;
  const costToIncomeRatio = revenue > 0 ? totalCosts / revenue : totalCosts > 0 ? 2 : 0;

  // Previous month metrics
  const prevMonth = addMonths(month, -1);
  const prevEntries = entries.filter(e => e.date && e.date.startsWith(prevMonth));
  const prevMonthRevenue = prevEntries.filter(e => e.type === 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const prevMonthCosts = prevEntries.filter(e => e.type !== 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const prevMonthNet = prevMonthRevenue - prevMonthCosts;

  // Target pacing
  const target = Number(branch.monthlyTarget) || 0;
  const dailyAverage = elapsed > 0 ? revenue / elapsed : 0;
  const projectedMonthEnd = Math.round(dailyAverage * dim);
  const achievedPct = target > 0 ? Math.round((revenue / target) * 100) : 100;
  const projectedPct = target > 0 ? Math.round((projectedMonthEnd / target) * 100) : 100;

  let targetStatus: BranchTargetPace['targetStatus'] = 'on-track';
  if (target > 0) {
    if (revenue >= target) {
      targetStatus = 'achieved';
    } else if (projectedPct >= 95) {
      targetStatus = 'on-track';
    } else if (projectedPct >= 70) {
      targetStatus = 'behind';
    } else {
      targetStatus = 'at-risk';
    }
  }

  const targetPace: BranchTargetPace = {
    target,
    achieved: revenue,
    achievedPct,
    dailyAverage,
    projectedMonthEnd,
    projectedPct,
    targetStatus,
    daysElapsed: elapsed,
    totalDays: dim,
  };

  // Daily calendar cells
  const dailySales: DaySalesCell[] = Array.from({ length: dim }, (_, i) => {
    const day = i + 1;
    const date = `${month}-${pad(day)}`;
    const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day));
    return {
      date,
      day,
      weekday: d.getUTCDay(),
      amount: dayRevenueMap[date] || 0,
    };
  });

  // Cost categories breakdown
  const costCategories: CostCategoryItem[] = Object.entries(costMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalCosts > 0 ? Math.round((amount / totalCosts) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Health Score Calculation
  const factors: HealthFactor[] = [];

  // Factor 1: Target Pacing (35%)
  let targetScore = 70;
  if (target > 0) {
    targetScore = Math.min(100, Math.max(10, Math.round(projectedPct)));
  } else if (revenue > 0) {
    targetScore = 80;
  }
  factors.push({
    name: 'Target Pace',
    score: targetScore,
    weight: 0.35,
    hint: target > 0 ? `${achievedPct}% achieved (${projectedPct}% projected)` : 'No monthly target set',
  });

  // Factor 2: Operating Margin (35%)
  let marginScore = 50;
  if (revenue > 0) {
    if (operatingMargin >= 0.3) marginScore = 100;
    else if (operatingMargin >= 0.2) marginScore = 88;
    else if (operatingMargin >= 0.1) marginScore = 75;
    else if (operatingMargin >= 0) marginScore = 60;
    else if (operatingMargin >= -0.2) marginScore = 35;
    else marginScore = 15;
  } else if (totalCosts === 0) {
    marginScore = 60;
  } else {
    marginScore = 20;
  }
  factors.push({
    name: 'Operating Margin',
    score: marginScore,
    weight: 0.35,
    hint: `${(operatingMargin * 100).toFixed(0)}% net operating margin`,
  });

  // Factor 3: Cost Efficiency (20%)
  let costScore = 60;
  if (revenue > 0) {
    if (costToIncomeRatio <= 0.6) costScore = 95;
    else if (costToIncomeRatio <= 0.8) costScore = 80;
    else if (costToIncomeRatio <= 1.0) costScore = 65;
    else costScore = Math.max(10, Math.round(50 - (costToIncomeRatio - 1) * 40));
  }
  factors.push({
    name: 'Cost Discipline',
    score: costScore,
    weight: 0.2,
    hint: revenue > 0 ? `Costs consume ${(costToIncomeRatio * 100).toFixed(0)}% of revenue` : 'No revenue recorded',
  });

  // Factor 4: Sales Activity Consistency (10%)
  const daysWithSales = Object.keys(dayRevenueMap).length;
  const activeRatio = elapsed > 0 ? daysWithSales / elapsed : 0;
  const consistencyScore = Math.min(100, Math.max(20, Math.round(activeRatio * 100) + 20));
  factors.push({
    name: 'Sales Rhythm',
    score: consistencyScore,
    weight: 0.1,
    hint: `${daysWithSales} sales days recorded out of ${elapsed} elapsed`,
  });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  const { grade, tone } = resolveGrade(totalScore);

  const healthScore: EntityHealthScore = {
    score: totalScore,
    grade,
    tone,
    factors,
  };

  // Top entries
  const topEntries = [...monthEntries]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 5);

  return {
    branchId: branch.id,
    branchName: branch.name,
    companyId: branch.companyId,
    location: branch.location || 'Headquarters',
    branchType: branch.branchType || 'Outlet',
    monthlyTarget: target,
    annualTarget: Number(branch.annualTarget) || target * 12,
    revenue,
    utilityCosts,
    otherCosts,
    totalCosts,
    netProfit,
    operatingMargin,
    costToIncomeRatio,
    targetPace,
    weekdayTotals,
    dailySales,
    costCategories,
    healthScore,
    topEntries,
    prevMonthRevenue,
    prevMonthCosts,
    prevMonthNet,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Company Analytics Engine                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function calculateCompanyMetrics(
  company: Company,
  branches: BusinessBranch[],
  state: AppState,
  month: string,
  today: string
): CompanyMetrics {
  const companyBranches = branches.filter(b => b.companyId === company.id);

  let totalRevenue = 0;
  let totalUtilityCosts = 0;
  let totalOtherCosts = 0;
  let totalMonthlyTarget = 0;
  const costMap: Record<string, number> = {};

  const branchMetricsList: BranchMetrics[] = companyBranches.map(b =>
    calculateBranchMetrics(b, month, today)
  );

  for (const m of branchMetricsList) {
    totalRevenue += m.revenue;
    totalUtilityCosts += m.utilityCosts;
    totalOtherCosts += m.otherCosts;
    totalMonthlyTarget += m.monthlyTarget;
    for (const cat of m.costCategories) {
      costMap[cat.category] = (costMap[cat.category] || 0) + cat.amount;
    }
  }

  const totalOperatingCosts = totalUtilityCosts + totalOtherCosts;
  const grossOperatingProfit = totalRevenue - totalOperatingCosts;
  const operatingMargin = totalRevenue > 0 ? grossOperatingProfit / totalRevenue : 0;

  // Owner draws for this company in selected month
  const companyDraws = (state.ownerDraws || []).filter(
    d => d.companyId === company.id && d.date && d.date.startsWith(month)
  );
  const ownerDraws = companyDraws.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const netRetainedProfit = grossOperatingProfit - ownerDraws;

  const targetAchievedPct =
    totalMonthlyTarget > 0 ? Math.round((totalRevenue / totalMonthlyTarget) * 100) : 100;

  // Branch summaries for comparative leaderboard
  const branchSummaries: BranchSummaryItem[] = branchMetricsList.map(m => ({
    branchId: m.branchId,
    name: m.branchName,
    location: m.location,
    revenue: m.revenue,
    costs: m.totalCosts,
    netProfit: m.netProfit,
    marginPct: Math.round(m.operatingMargin * 100),
    targetPct: m.targetPace.achievedPct,
    revenueSharePct: totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Cost categories
  const costCategories: CostCategoryItem[] = Object.entries(costMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalOperatingCosts > 0 ? Math.round((amount / totalOperatingCosts) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Commercial agreements
  const companyAgreements = (state.agreements || []).filter(a => a.companyId === company.id);
  const activeAgreements = companyAgreements.filter(a => a.status === 'active');
  const activeAgreementsValue = activeAgreements.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  // Previous month company metrics
  const prevMonthRevenue = branchMetricsList.reduce((s, m) => s + m.prevMonthRevenue, 0);
  const prevMonthCosts = branchMetricsList.reduce((s, m) => s + m.prevMonthCosts, 0);
  const prevMonthNet = prevMonthRevenue - prevMonthCosts;

  // Waterfall steps
  const waterfall: WaterfallStep[] = [
    { label: 'Enterprise Inflow', value: totalRevenue, kind: 'start' },
    { label: 'Operating Costs', value: -totalOtherCosts, kind: 'delta' },
    { label: 'Utility Invoices', value: -totalUtilityCosts, kind: 'delta' },
    ...(ownerDraws > 0 ? [{ label: 'Owner Draws', value: -ownerDraws, kind: 'delta' as const }] : []),
    { label: 'Retained Earnings', value: netRetainedProfit, kind: 'end' },
  ].filter(s => s.kind !== 'delta' || s.value !== 0) as WaterfallStep[];

  // Enterprise Health Score
  const factors: HealthFactor[] = [];

  // Enterprise Margin (30%)
  let marginScore = 50;
  if (totalRevenue > 0) {
    if (operatingMargin >= 0.35) marginScore = 100;
    else if (operatingMargin >= 0.22) marginScore = 88;
    else if (operatingMargin >= 0.12) marginScore = 75;
    else if (operatingMargin >= 0) marginScore = 60;
    else marginScore = 25;
  }
  factors.push({
    name: 'Operating Margin',
    score: marginScore,
    weight: 0.3,
    hint: `${(operatingMargin * 100).toFixed(0)}% gross operating margin`,
  });

  // Target Pacing (30%)
  let targetScore = 75;
  if (totalMonthlyTarget > 0) {
    targetScore = Math.min(100, Math.max(10, targetAchievedPct));
  }
  factors.push({
    name: 'Corporate Targets',
    score: targetScore,
    weight: 0.3,
    hint: totalMonthlyTarget > 0 ? `${targetAchievedPct}% of monthly corporate target` : 'No targets configured',
  });

  // Multi-Branch Resilience (20%)
  let resilienceScore = 70;
  if (companyBranches.length >= 2) {
    const profitableBranches = branchSummaries.filter(b => b.netProfit >= 0).length;
    resilienceScore = Math.round((profitableBranches / companyBranches.length) * 100);
  } else if (companyBranches.length === 1) {
    resilienceScore = branchSummaries[0]?.netProfit >= 0 ? 80 : 40;
  }
  factors.push({
    name: 'Branch Resilience',
    score: resilienceScore,
    weight: 0.2,
    hint: `${companyBranches.length} branch unit(s) monitored`,
  });

  // Owner Draw Sustainability (20%)
  let drawScore = 85;
  if (grossOperatingProfit > 0) {
    const drawRatio = ownerDraws / grossOperatingProfit;
    if (drawRatio <= 0.4) drawScore = 100;
    else if (drawRatio <= 0.7) drawScore = 80;
    else if (drawRatio <= 1.0) drawScore = 60;
    else drawScore = 30; // drawings exceed profit
  } else if (ownerDraws > 0) {
    drawScore = 20; // withdrawing while unprofitable
  }
  factors.push({
    name: 'Draw Sustainability',
    score: drawScore,
    weight: 0.2,
    hint: ownerDraws > 0 ? `${Math.round((ownerDraws / Math.max(1, grossOperatingProfit)) * 100)}% of operating profit drawn` : 'No owner withdrawals taken',
  });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  const { grade, tone } = resolveGrade(totalScore);

  const healthScore: EntityHealthScore = {
    score: totalScore,
    grade,
    tone,
    factors,
  };

  return {
    companyId: company.id,
    companyName: company.name,
    brNumber: company.brNumber,
    tinNumber: company.tinNumber,
    sector: company.sector,
    entityType: company.entityType,
    branchesCount: companyBranches.length,
    totalRevenue,
    totalUtilityCosts,
    totalOtherCosts,
    totalOperatingCosts,
    grossOperatingProfit,
    operatingMargin,
    ownerDraws,
    netRetainedProfit,
    totalMonthlyTarget,
    targetAchievedPct,
    branchSummaries,
    costCategories,
    activeAgreementsCount: activeAgreements.length,
    activeAgreementsValue,
    healthScore,
    waterfall,
    prevMonthRevenue,
    prevMonthCosts,
    prevMonthNet,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Trend & Forecast Engines                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function buildBranchSeries(
  branch: BusinessBranch,
  month: string,
  monthsCount = 6
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const entries = branch.entries || [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const m = addMonths(month, -i);
    const mEntries = entries.filter(e => e.date && e.date.startsWith(m));
    const income = mEntries.filter(e => e.type === 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const outflow = mEntries.filter(e => e.type !== 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    points.push({
      label: monthLabel(m, 'short'),
      income,
      outflow,
      net: income - outflow,
    });
  }

  return points;
}

export function forecastBranch(
  branch: BusinessBranch,
  month: string,
  series: TrendPoint[],
  monthsAhead = 3
): TrendPoint[] {
  const target = Number(branch.monthlyTarget) || 0;
  const recentIncomes = series.map(p => p.income).filter(v => v > 0);
  const recentOutflows = series.map(p => p.outflow).filter(v => v > 0);

  const avgIncome = recentIncomes.length > 0
    ? recentIncomes.reduce((a, b) => a + b, 0) / recentIncomes.length
    : target > 0 ? target : 0;
  const avgOutflow = recentOutflows.length > 0
    ? recentOutflows.reduce((a, b) => a + b, 0) / recentOutflows.length
    : avgIncome * 0.65;

  const forecasts: TrendPoint[] = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const m = addMonths(month, i);
    // slight 1.5% conservative growth damping
    const income = Math.round(avgIncome * (1 + (i * 0.015)));
    const outflow = Math.round(avgOutflow * (1 + (i * 0.01)));
    const spread = Math.round(outflow * 0.15);

    forecasts.push({
      label: monthLabel(m, 'short'),
      income,
      outflow,
      net: income - outflow,
      isForecast: true,
      outflowLow: Math.max(0, outflow - spread),
      outflowHigh: outflow + spread,
    });
  }

  return forecasts;
}

export function buildCompanySeries(
  branches: BusinessBranch[],
  month: string,
  monthsCount = 6
): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const m = addMonths(month, -i);
    let income = 0;
    let outflow = 0;

    for (const b of branches) {
      const mEntries = (b.entries || []).filter(e => e.date && e.date.startsWith(m));
      income += mEntries.filter(e => e.type === 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      outflow += mEntries.filter(e => e.type !== 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }

    points.push({
      label: monthLabel(m, 'short'),
      income,
      outflow,
      net: income - outflow,
    });
  }

  return points;
}

export function forecastCompany(
  company: Company,
  branches: BusinessBranch[],
  month: string,
  series: TrendPoint[],
  monthsAhead = 3
): TrendPoint[] {
  const totalTarget = branches.reduce((sum, b) => sum + (Number(b.monthlyTarget) || 0), 0);
  const recentIncomes = series.map(p => p.income).filter(v => v > 0);
  const recentOutflows = series.map(p => p.outflow).filter(v => v > 0);

  const avgIncome = recentIncomes.length > 0
    ? recentIncomes.reduce((a, b) => a + b, 0) / recentIncomes.length
    : totalTarget > 0 ? totalTarget : 0;
  const avgOutflow = recentOutflows.length > 0
    ? recentOutflows.reduce((a, b) => a + b, 0) / recentOutflows.length
    : avgIncome * 0.65;

  const forecasts: TrendPoint[] = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const m = addMonths(month, i);
    const income = Math.round(avgIncome * (1 + (i * 0.02)));
    const outflow = Math.round(avgOutflow * (1 + (i * 0.012)));
    const spread = Math.round(outflow * 0.12);

    forecasts.push({
      label: monthLabel(m, 'short'),
      income,
      outflow,
      net: income - outflow,
      isForecast: true,
      outflowLow: Math.max(0, outflow - spread),
      outflowHigh: outflow + spread,
    });
  }

  return forecasts;
}
