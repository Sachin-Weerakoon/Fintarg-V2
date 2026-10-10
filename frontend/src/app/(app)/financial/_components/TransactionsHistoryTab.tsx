'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { DataTable, Column } from '@/components/ui/DataTable';
import { fetchTransactionHistory } from '@/services/storeApi';
import type { Transaction } from '@/types';

export function TransactionsHistoryTab({ month: _month }: { month?: string }) {
  const { state } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [remoteTransactions, setRemoteTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netFlow: 0, count: 0 });

  // Read initial filters from URL
  const initialSearch = searchParams.get('search') || '';
  const initialType = (searchParams.get('type') || 'all') as 'all' | 'income' | 'expense' | 'transfer';
  const initialMethod = searchParams.get('method') || 'all';
  const initialAccount = searchParams.get('account') || 'all';

  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>(initialType);
  const [methodFilter, setMethodFilter] = useState(initialMethod);
  const [accountFilter, setAccountFilter] = useState(initialAccount);

  // Sync to URL
  const updateUrlFilters = useCallback(
    (newSearch: string, newType: string, newMethod: string, newAccount: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSearch) params.set('search', newSearch); else params.delete('search');
      if (newType !== 'all') params.set('type', newType); else params.delete('type');
      if (newMethod !== 'all') params.set('method', newMethod); else params.delete('method');
      if (newAccount !== 'all') params.set('account', newAccount); else params.delete('account');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrlFilters(val, typeFilter, methodFilter, accountFilter);
  };

  const handleTypeChange = (val: 'all' | 'income' | 'expense' | 'transfer') => {
    setTypeFilter(val);
    updateUrlFilters(search, val, methodFilter, accountFilter);
  };

  const handleMethodChange = (val: string) => {
    setMethodFilter(val);
    updateUrlFilters(search, typeFilter, val, accountFilter);
  };

  const handleAccountChange = (val: string) => {
    setAccountFilter(val);
    updateUrlFilters(search, typeFilter, methodFilter, val);
  };

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setMethodFilter('all');
    setAccountFilter('all');
    updateUrlFilters('', 'all', 'all', 'all');
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const filters: Record<string, any> = {};
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (methodFilter !== 'all') filters.paymentMethod = methodFilter;
      if (accountFilter !== 'all') filters.bankAccountId = accountFilter;
      if (search.trim()) filters.search = search.trim();

      const res = await fetchTransactionHistory(filters);
      setRemoteTransactions(res.data);
      setSummary(res.summary);
    } catch {
      // Fallback to local store if offline
      setRemoteTransactions(state.transactions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [typeFilter, methodFilter, accountFilter]);

  // Combine local and remote fallback
  const items = remoteTransactions.length > 0 ? remoteTransactions : state.transactions;
  const filteredItems = useMemo(() => {
    return items.filter(t => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = (t.category || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      if (accountFilter !== 'all' && t.bankAccountId !== accountFilter) return false;
      return true;
    });
  }, [items, search, typeFilter, methodFilter, accountFilter]);

  const hasActiveFilters = search || typeFilter !== 'all' || methodFilter !== 'all' || accountFilter !== 'all';

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Date',
      render: t => <span className="text-muted num">{t.date}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: t => (
        <Badge
          tone={t.type === 'income' ? 'success' : t.type === 'transfer' ? 'primary' : 'neutral'}
          size="sm"
          className="capitalize text-[11px]"
        >
          {t.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Category / Description',
      render: t => (
        <div>
          <div className="font-medium text-text">{t.category || t.description || 'General'}</div>
          {t.description && t.category && (
            <div className="text-[11px] text-muted truncate">{t.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: t => (
        <span className="text-xs text-muted capitalize font-medium">
          {(t.paymentMethod || 'cash').replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: t => {
        const acc = state.bankAccounts.find(a => a.id === t.bankAccountId);
        return (
          <span className="text-xs text-muted">
            {acc ? `${acc.bankName} (•••• ${acc.accountNumber.slice(-4)})` : '—'}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: t => {
        const isPositive = t.type === 'income';
        return (
          <span className={`font-bold num ${isPositive ? 'text-success-text' : 'text-danger-text'}`}>
            {isPositive ? `+${formatRs(t.amount)}` : `-${formatRs(t.amount)}`}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      header: 'Balance After',
      align: 'right',
      render: t => (
        <span className="text-muted num font-medium">
          {t.balanceAfter !== undefined ? formatRs(t.balanceAfter) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Stat Bar with StatCard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Inflow"
          value={formatRs(summary.totalIncome || 0)}
          tone="success"
          icon={<Icon name="arrow-up" size={18} />}
        />
        <StatCard
          label="Total Outflow"
          value={formatRs(summary.totalExpense || 0)}
          tone="danger"
          icon={<Icon name="arrow-down" size={18} />}
        />
        <StatCard
          label="Net Flow"
          value={formatRs(summary.netFlow || 0)}
          tone={summary.netFlow >= 0 ? 'success' : 'danger'}
          icon={<Icon name="financial" size={18} />}
        />
        <StatCard
          label="Total Records"
          value={filteredItems.length}
          icon={<Icon name="documents" size={18} />}
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Search category or note..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="!py-1.5 !text-xs"
          />
          <Select
            value={typeFilter}
            onChange={e => handleTypeChange(e.target.value as any)}
            className="!py-1.5 !text-xs"
          >
            <option value="all">All Types</option>
            <option value="income">Inflow (Income)</option>
            <option value="expense">Outflow (Expense)</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select
            value={methodFilter}
            onChange={e => handleMethodChange(e.target.value)}
            className="!py-1.5 !text-xs"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="standing_order">Standing Order</option>
            <option value="online">Online</option>
          </Select>
          <div className="flex gap-2">
            <Select
              value={accountFilter}
              onChange={e => handleAccountChange(e.target.value)}
              className="!py-1.5 !text-xs flex-1"
            >
              <option value="all">All Accounts</option>
              {state.bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.name}</option>
              ))}
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="!py-1 !px-2 text-xs shrink-0"
                title="Clear all filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* DataTable with responsive card view */}
      <DataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={t => t.id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<Icon name="financial" size={24} />}
            title="No transaction records"
            helper={
              hasActiveFilters
                ? 'No transactions matched the selected filters. Try clearing filters.'
                : 'Transactions recorded from expenses and income appear here automatically.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
