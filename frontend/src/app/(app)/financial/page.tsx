'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { AccountsTab } from './_components/AccountsTab';
import { TransactionsHistoryTab } from './_components/TransactionsHistoryTab';
import { ExpensesTab } from './_components/ExpensesTab';
import { IncomeTab } from './_components/IncomeTab';
import { FinanceTab } from './_components/FinanceTab';
import { LoansTab } from './_components/LoansTab';
import { PawnedTab } from './_components/PawnedTab';

type Tab = 'accounts' | 'transactions' | 'expenses' | 'income' | 'finance' | 'loans' | 'pawned';

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

  const [tab, setTab] = useState<Tab>(initialTab);
  const [month, setMonth] = useState(initialMonth);

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

  const months = useMemo(() => {
    const list = Array.from(new Set(state.expenses.map(e => e.date.slice(0, 7)))).sort();
    if (!list.includes(state.selectedMonth)) list.push(state.selectedMonth);
    return list.slice(-4);
  }, [state.expenses, state.selectedMonth]);

  return (
    <PageContainer>
      {/* Top Header */}
      <PageHeader
        title="Financial Ledger"
        description="Manage your bank accounts, cards, cash flow, debt repayments, and transaction history."
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

      {/* Main Ledger Tabs */}
      <SegmentedTabs
        options={TAB_OPTIONS}
        value={tab}
        onChange={handleTabChange}
        size="md"
      />

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'transactions' && <TransactionsHistoryTab month={month} />}
      {tab === 'expenses' && <ExpensesTab month={month} />}
      {tab === 'income' && <IncomeTab month={month} />}
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
