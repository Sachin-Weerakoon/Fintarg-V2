import { describe, it, expect } from 'vitest';
import {
  calculateBranchMetrics,
  calculateCompanyMetrics,
  buildBranchSeries,
  forecastBranch,
  buildCompanySeries,
  forecastCompany,
} from './businessInsights';
import type { AppState, BusinessBranch, Company } from '@/types';

describe('businessInsights', () => {
  const sampleBranch: BusinessBranch = {
    id: 'br_1',
    companyId: 'co_1',
    name: 'Colombo Flagship',
    location: 'Colombo 03',
    branchType: 'Retail Outlet',
    monthlyTarget: 100000,
    annualTarget: 1200000,
    entries: [
      { id: 'e1', date: '2026-10-02', type: 'revenue', category: 'Sales', amount: 30000, note: 'POS sales' },
      { id: 'e2', date: '2026-10-05', type: 'revenue', category: 'Sales', amount: 40000, note: 'POS sales' },
      { id: 'e3', date: '2026-10-06', type: 'utility', category: 'Electricity', amount: 8000, note: 'CEB bill' },
      { id: 'e4', date: '2026-10-08', type: 'other-cost', category: 'Inventory', amount: 15000, note: 'Stock restock' },
      // Previous month entry
      { id: 'e0', date: '2026-09-15', type: 'revenue', category: 'Sales', amount: 50000, note: 'Last month' },
    ],
  };

  const sampleCompany: Company = {
    id: 'co_1',
    name: 'Apex Retail PVT LTD',
    address: '123 Galle Road, Colombo',
    contact: '0112345678',
    logo: '',
    brNumber: 'PV-123456',
    tinNumber: 'TIN-987654',
    entityType: 'pvt_ltd',
    sector: 'Retail & Consumer',
  };

  const sampleState: Partial<AppState> = {
    companies: [sampleCompany],
    businessBranches: [sampleBranch],
    ownerDraws: [
      { id: 'od_1', companyId: 'co_1', amount: 10000, date: '2026-10-10' },
    ],
    agreements: [
      {
        id: 'ag_1',
        companyId: 'co_1',
        title: 'Supplier Master Agreement',
        otherParty: 'Global Importers',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        value: 500000,
        summary: 'Annual supplier contract',
        status: 'active',
        fileName: 'contract.pdf',
      },
    ],
  };

  describe('calculateBranchMetrics', () => {
    it('computes monthly revenue, costs, and net operating profit', () => {
      const metrics = calculateBranchMetrics(sampleBranch, '2026-10', '2026-10-14');
      expect(metrics.revenue).toBe(70000);
      expect(metrics.utilityCosts).toBe(8000);
      expect(metrics.otherCosts).toBe(15000);
      expect(metrics.totalCosts).toBe(23000);
      expect(metrics.netProfit).toBe(47000);
      expect(metrics.operatingMargin).toBeCloseTo(47000 / 70000, 3);
    });

    it('computes target pacing correctly', () => {
      const metrics = calculateBranchMetrics(sampleBranch, '2026-10', '2026-10-14');
      expect(metrics.monthlyTarget).toBe(100000);
      expect(metrics.targetPace.achieved).toBe(70000);
      expect(metrics.targetPace.achievedPct).toBe(70);
      // In 14 days, 70,000 -> 5,000 / day. In 31 days -> 155,000 projected
      expect(metrics.targetPace.dailyAverage).toBe(5000);
      expect(metrics.targetPace.projectedMonthEnd).toBe(155000);
      expect(metrics.targetPace.projectedPct).toBe(155);
      expect(metrics.targetPace.targetStatus).toBe('on-track');
    });

    it('computes weekday distribution array of length 7', () => {
      const metrics = calculateBranchMetrics(sampleBranch, '2026-10', '2026-10-14');
      expect(metrics.weekdayTotals).toHaveLength(7);
      const totalWeekday = metrics.weekdayTotals.reduce((a, b) => a + b, 0);
      expect(totalWeekday).toBe(70000);
    });

    it('computes cost categories and sorts by highest amount', () => {
      const metrics = calculateBranchMetrics(sampleBranch, '2026-10', '2026-10-14');
      expect(metrics.costCategories).toHaveLength(2);
      expect(metrics.costCategories[0].category).toBe('Inventory');
      expect(metrics.costCategories[0].amount).toBe(15000);
      expect(metrics.costCategories[1].category).toBe('Electricity');
      expect(metrics.costCategories[1].amount).toBe(8000);
    });

    it('generates health score with factors', () => {
      const metrics = calculateBranchMetrics(sampleBranch, '2026-10', '2026-10-14');
      expect(metrics.healthScore.score).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore.score).toBeLessThanOrEqual(100);
      expect(metrics.healthScore.factors).toHaveLength(4);
      expect(metrics.healthScore.grade).toBeTruthy();
    });

    it('handles empty branch with no entries gracefully', () => {
      const emptyBranch: BusinessBranch = {
        id: 'br_empty',
        companyId: 'co_1',
        name: 'New Branch',
        location: 'Galle',
        monthlyTarget: 50000,
        annualTarget: 600000,
        entries: [],
      };
      const metrics = calculateBranchMetrics(emptyBranch, '2026-10', '2026-10-14');
      expect(metrics.revenue).toBe(0);
      expect(metrics.totalCosts).toBe(0);
      expect(metrics.netProfit).toBe(0);
      expect(metrics.operatingMargin).toBe(0);
      expect(metrics.targetPace.achieved).toBe(0);
      expect(metrics.targetPace.targetStatus).toBe('at-risk');
      expect(metrics.healthScore.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateCompanyMetrics', () => {
    it('aggregates all branches under the company', () => {
      const branch2: BusinessBranch = {
        id: 'br_2',
        companyId: 'co_1',
        name: 'Kandy Outlet',
        location: 'Kandy City Center',
        monthlyTarget: 50000,
        annualTarget: 600000,
        entries: [
          { id: 'e5', date: '2026-10-04', type: 'revenue', category: 'Sales', amount: 25000, note: 'POS' },
          { id: 'e6', date: '2026-10-09', type: 'utility', category: 'Water', amount: 2000, note: 'Water bill' },
        ],
      };

      const metrics = calculateCompanyMetrics(
        sampleCompany,
        [sampleBranch, branch2],
        sampleState as AppState,
        '2026-10',
        '2026-10-14'
      );

      expect(metrics.branchesCount).toBe(2);
      expect(metrics.totalRevenue).toBe(95000); // 70000 + 25000
      expect(metrics.totalUtilityCosts).toBe(10000); // 8000 + 2000
      expect(metrics.totalOtherCosts).toBe(15000);
      expect(metrics.totalOperatingCosts).toBe(25000);
      expect(metrics.grossOperatingProfit).toBe(70000);
      expect(metrics.ownerDraws).toBe(10000);
      expect(metrics.netRetainedProfit).toBe(60000); // 70000 - 10000
      expect(metrics.totalMonthlyTarget).toBe(150000); // 100000 + 50000
      expect(metrics.branchSummaries).toHaveLength(2);
      expect(metrics.activeAgreementsCount).toBe(1);
      expect(metrics.activeAgreementsValue).toBe(500000);
    });

    it('generates enterprise waterfall chart steps', () => {
      const metrics = calculateCompanyMetrics(
        sampleCompany,
        [sampleBranch],
        sampleState as AppState,
        '2026-10',
        '2026-10-14'
      );
      expect(metrics.waterfall.length).toBeGreaterThanOrEqual(3);
      expect(metrics.waterfall[0].label).toBe('Enterprise Inflow');
      expect(metrics.waterfall[metrics.waterfall.length - 1].label).toBe('Retained Earnings');
    });
  });

  describe('series and forecasts', () => {
    it('builds branch series and forecasts', () => {
      const series = buildBranchSeries(sampleBranch, '2026-10', 6);
      expect(series).toHaveLength(6);
      expect(series[series.length - 1].income).toBe(70000);

      const forecast = forecastBranch(sampleBranch, '2026-10', series, 3);
      expect(forecast).toHaveLength(3);
      expect(forecast[0].isForecast).toBe(true);
      expect(forecast[0].income).toBeGreaterThan(0);
    });

    it('builds company series and forecasts', () => {
      const series = buildCompanySeries([sampleBranch], '2026-10', 6);
      expect(series).toHaveLength(6);

      const forecast = forecastCompany(sampleCompany, [sampleBranch], '2026-10', series, 3);
      expect(forecast).toHaveLength(3);
      expect(forecast[0].isForecast).toBe(true);
    });
  });
});
