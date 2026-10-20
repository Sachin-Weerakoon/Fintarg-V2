'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp, formatRs, calcMonthlyIncome, calcFinancePayments } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { AccountsTab } from './_components/AccountsTab';
import { TransactionsHistoryTab } from './_components/TransactionsHistoryTab';
import { ExpensesTab } from './_components/ExpensesTab';
import { IncomeTab } from './_components/IncomeTab';
import { FinanceTab } from './_components/FinanceTab';
import { LoansTab } from './_components/LoansTab';
import { PawnedTab } from './_components/PawnedTab';

type Tab = 'accounts' | 'transactions' | 'expenses' | 'income' | 'finance' | 'loans' | 'pawned';
type StreamScope = 'all' | 'salary' | 'business';

const TAB_OPTIONS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Accounts & Cards' },
  { id: 'transactions', label: 'History Ledger' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'finance', label: 'Payments' },
  { id: 'loans', label: 'Loans' },
  { id: 'pawned', label: 'Pawned Items' },
];

function FinancialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') as Tab | null;
  const initialTab: Tab = (rawTab && TAB_OPTIONS.some(t => t.id === rawTab)) ? rawTab : 'accounts';

  const { state, dispatch } = useApp();
  const urlMonth = searchParams.get('month');
  const initialMonth = urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) ? urlMonth : state.selectedMonth;

  const rawStream = searchParams.get('stream') as StreamScope | null;
  const initialStream: StreamScope = (rawStream && ['all', 'salary', 'business'].includes(rawStream)) ? rawStream : 'all';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [month, setMonth] = useState(initialMonth);
  const [streamScope, setStreamScope] = useState<StreamScope>(initialStream);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  const hasBusiness = state.profile.workMode === 'both' || state.profile.workMode === 'business' || (state.companies && state.companies.length > 0);

  useEffect(() => {
    if (rawTab && TAB_OPTIONS.some(t => t.id === rawTab) && rawTab !== tab) {
      setTab(rawTab);
    }
  }, [rawTab, tab]);

  useEffect(() => {
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) && urlMonth !== month) {
      setMonth(urlMonth);
      dispatch({ type: 'SET_MONTH', month: urlMonth });
    }
  }, [urlMonth, month, dispatch]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`/financial?${params.toString()}`, { scroll: false });
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    dispatch({ type: 'SET_MONTH', month: newMonth });
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    router.replace(`/financial?${params.toString()}`, { scroll: false });
  };

  const handleStreamChange = (newStream: string) => {
    const s = newStream as StreamScope;
    setStreamScope(s);
    const params = new URLSearchParams(searchParams.toString());
    params.set('stream', s);
    router.replace(`/financial?${params.toString()}`, { scroll: false });
  };

  const months = useMemo(() => {
    const list = Array.from(new Set(state.expenses.map(e => e.date.slice(0, 7)))).sort();
    if (!list.includes(state.selectedMonth)) list.push(state.selectedMonth);
    return list.slice(-4);
  }, [state.expenses, state.selectedMonth]);

  // Compute multi-stream financial KPI metrics
  const streamKPIs = useMemo(() => {
    // 1. Incomes
    const totalConsolidatedIncome = calcMonthlyIncome(state.income, month, state.employmentProfiles);

    const salaryEmploymentIncome = state.employmentProfiles.reduce((s, p) => s + (p.monthlyGross - (p.monthlyDeductions || 0)), 0);
    const salaryManualIncome = state.income
      .filter(i => (i.type === 'salary' || i.type === 'other') && (i.frequency === 'monthly' || (i.frequency === 'one-time' && i.date.startsWith(month))))
      .reduce((s, i) => s + i.amount, 0);
    const salaryTotalInflow = salaryEmploymentIncome + salaryManualIncome;

    // Business revenue from income entries + branch daily sales
    const businessManualIncome = state.income
      .filter(i => i.type === 'business' && (i.frequency === 'monthly' || (i.frequency === 'one-time' && i.date.startsWith(month))))
      .reduce((s, i) => s + i.amount, 0);

    const relevantBranches = selectedCompanyId === 'all'
      ? state.businessBranches
      : state.businessBranches.filter(b => b.companyId === selectedCompanyId);

    const branchMonthlySales = relevantBranches.reduce((sum, b) => {
      const sales = (b.entries || [])
        .filter(e => e.type === 'revenue' && e.date.startsWith(month))
        .reduce((s, e) => s + e.amount, 0);
      return sum + sales;
    }, 0);
    const businessTotalInflow = businessManualIncome + branchMonthlySales;

    // 2. Expenses
    const monthExpenses = state.expenses.filter(e => e.date.startsWith(month));
    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const personalExpenses = monthExpenses
      .filter(e => e.sourceType !== 'business')
      .reduce((s, e) => s + e.amount, 0);

    let businessExpenses = monthExpenses.filter(e => e.sourceType === 'business');
    if (selectedCompanyId !== 'all') {
      businessExpenses = businessExpenses.filter(e => e.companyId === selectedCompanyId);
    }
    const businessExpTotal = businessExpenses.reduce((s, e) => s + e.amount, 0);

    const branchMonthlyCosts = relevantBranches.reduce((sum, b) => {
      const costs = (b.entries || [])
        .filter(e => e.type !== 'revenue' && !e.id.startsWith('be_exp_') && e.date.startsWith(month))
        .reduce((s, e) => s + e.amount, 0);
      return sum + costs;
    }, 0);
    const businessTotalCosts = businessExpTotal + branchMonthlyCosts;

    // 3. Obligations
    const obligations = calcFinancePayments(state.financePayments);

    if (streamScope === 'salary') {
      const netSalaryFlow = salaryTotalInflow - personalExpenses;
      return {
        title: 'Job / Employment Salary Stream',
        inflowLabel: 'Salary Take-Home Inflow',
        inflowValue: salaryTotalInflow,
        outflowLabel: 'Personal Living Expenses',
        outflowValue: personalExpenses,
        netLabel: 'Net Personal Savings',
        netValue: netSalaryFlow,
        tone: netSalaryFlow >= 0 ? 'success' as const : 'danger' as const,
      };
    }

    if (streamScope === 'business') {
      const netBusinessSurplus = businessTotalInflow - businessTotalCosts;
      const comp = state.companies.find(c => c.id === selectedCompanyId);
      return {
        title: comp ? `${comp.name} Operating Cash` : 'All Business Cash Operations',
        inflowLabel: 'Commercial Revenue Inflow',
        inflowValue: businessTotalInflow,
        outflowLabel: 'Business Costs & Overhead',
        outflowValue: businessTotalCosts,
        netLabel: 'Retained Business Surplus',
        netValue: netBusinessSurplus,
        tone: netBusinessSurplus >= 0 ? 'success' as const : 'danger' as const,
      };
    }

    // Consolidated mode
    const totalOutflow = totalExpenses + obligations;
    const netConsolidatedFlow = totalConsolidatedIncome - totalOutflow;
    return {
      title: 'Consolidated Cash Flow (Job + Business)',
      inflowLabel: 'Total Consolidated Inflow',
      inflowValue: totalConsolidatedIncome,
      outflowLabel: 'Total Expenses & Obligations',
      outflowValue: totalOutflow,
      netLabel: 'Net Consolidated Surplus',
      netValue: netConsolidatedFlow,
      tone: netConsolidatedFlow >= 0 ? 'success' as const : 'danger' as const,
    };
  }, [state, month, streamScope, selectedCompanyId]);

  return (
    <PageContainer>
      {/* Top Header */}
      <PageHeader
        title="Financial Ledger"
        description="Unified corporate & personal financial hub: manage bank accounts, multi-stream cash flows, operating expenses, and transactions."
        actions={
          months.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Month:</span>
              <SegmentedTabs
                size="sm"
                options={months.map(m => ({ id: m, label: m }))}
                value={month}
                onChange={handleMonthChange}
              />
            </div>
          )
        }
      />

      {/* Multi-Stream Intelligence & Scope Switcher for Hybrid & Business Profiles */}
      {hasBusiness && (
        <Card className="p-4 sm:p-5 bg-gradient-to-r from-surface via-surface to-primary-tint/20 border-primary/20 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="bank" size={14} />
                  Finance Stream Intelligence
                </span>
                <Badge tone="primary" size="sm">
                  {streamScope === 'all' ? 'Job + Business' : streamScope === 'salary' ? 'Job Salary' : 'Business'}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Switch stream views to isolate personal employment cash flow, business operating capital, or consolidated totals.
              </p>
            </div>

            {/* Stream Switcher */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <SegmentedTabs
                size="sm"
                options={[
                  { id: 'all', label: 'Consolidated (All)' },
                  { id: 'salary', label: 'Job / Salary' },
                  { id: 'business', label: 'Business Cash' },
                ]}
                value={streamScope}
                onChange={handleStreamChange}
              />

              {streamScope === 'business' && state.companies.length > 0 && (
                <div className="w-48 shrink-0">
                  <Select
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="all">All Enterprises ({state.companies.length})</option>
                    {state.companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Stream KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            <div className="p-3 rounded-xl bg-surface/90 border border-border">
              <div className="text-[11px] font-medium text-muted">{streamKPIs.inflowLabel}</div>
              <div className="text-base font-extrabold text-success-text num mt-1">
                +{formatRs(streamKPIs.inflowValue)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface/90 border border-border">
              <div className="text-[11px] font-medium text-muted">{streamKPIs.outflowLabel}</div>
              <div className="text-base font-extrabold text-danger-text num mt-1">
                -{formatRs(streamKPIs.outflowValue)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface/90 border border-border flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-muted">{streamKPIs.netLabel}</div>
                <div className={`text-base font-extrabold num mt-1 ${streamKPIs.tone === 'success' ? 'text-primary-text' : 'text-danger-text'}`}>
                  {formatRs(streamKPIs.netValue)}
                </div>
              </div>
              {streamScope === 'business' && (
                <Link href="/advanced?tab=businesses">
                  <Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={12} />} className="text-xs">
                    Workspace
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Main Ledger Tabs */}
      <SegmentedTabs
        options={TAB_OPTIONS}
        value={tab}
        onChange={handleTabChange}
        size="md"
      />

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'transactions' && <TransactionsHistoryTab month={month} />}
      {tab === 'expenses' && <ExpensesTab month={month} streamScope={streamScope} companyId={selectedCompanyId} />}
      {tab === 'income' && <IncomeTab month={month} streamScope={streamScope} companyId={selectedCompanyId} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'loans' && <LoansTab />}
      {tab === 'pawned' && <PawnedTab />}
    </PageContainer>
  );
}

export default function Financial() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageHeader title="Financial Ledger" description="Loading financial ledger..." />
      </PageContainer>
    }>
      <FinancialContent />
    </Suspense>
  );
}
