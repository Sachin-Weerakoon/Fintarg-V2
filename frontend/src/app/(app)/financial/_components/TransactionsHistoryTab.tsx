'use client';
import { useState, useEffect } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { fetchTransactionHistory } from '@/services/storeApi';
import type { Transaction } from '@/types';

export function TransactionsHistoryTab({ month: _month }: { month?: string }) {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [remoteTransactions, setRemoteTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netFlow: 0, count: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

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
  const filteredItems = items.filter(t => {
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

  return (
    <div className="space-y-4">
      {/* Summary Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-xs text-muted mb-0.5">Total Inflow</div>
          <div className="font-bold text-sm text-success-text num">
            {formatRs(summary.totalIncome || 0)}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xs text-muted mb-0.5">Total Outflow</div>
          <div className="font-bold text-sm text-danger-text num">
            {formatRs(summary.totalExpense || 0)}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xs text-muted mb-0.5">Net Flow</div>
          <div className={`font-bold text-sm num ${summary.netFlow >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
            {formatRs(summary.netFlow || 0)}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xs text-muted mb-0.5">Total Records</div>
          <div className="font-bold text-sm text-text num">
            {filteredItems.length}
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Search category or note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="!py-1.5 !text-xs"
          />
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="!py-1.5 !text-xs"
          >
            <option value="all">All Types</option>
            <option value="income">Inflow (Income)</option>
            <option value="expense">Outflow (Expense)</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
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
          <Select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="!py-1.5 !text-xs"
          >
            <option value="all">All Accounts</option>
            {state.bankAccounts.map(b => (
              <option key={b.id} value={b.id}>{b.bankName} - {b.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Ledger Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Icon name="financial" size={24} />}
          title="No transaction records"
          helper={loading ? 'Loading ledger records...' : 'Transactions recorded from expenses and income appear here automatically.'}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category / Description</th>
                  <th>Method</th>
                  <th>Account</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(t => {
                  const acc = state.bankAccounts.find(a => a.id === t.bankAccountId);
                  const isPositive = t.type === 'income';
                  return (
                    <tr key={t.id}>
                      <td className="text-muted num">{t.date}</td>
                      <td>
                        <Badge
                          tone={t.type === 'income' ? 'success' : t.type === 'transfer' ? 'primary' : 'neutral'}
                          size="sm"
                          className="capitalize text-[11px]"
                        >
                          {t.type}
                        </Badge>
                      </td>
                      <td>
                        <div className="font-medium text-text">{t.category || t.description || 'General'}</div>
                        {t.description && t.category && (
                          <div className="text-[11px] text-muted truncate">{t.description}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-muted capitalize font-medium">
                          {(t.paymentMethod || 'cash').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-muted">
                          {acc ? `${acc.bankName} (•••• ${acc.accountNumber.slice(-4)})` : '—'}
                        </span>
                      </td>
                      <td className={`text-right font-bold num ${isPositive ? 'text-success-text' : 'text-danger-text'}`}>
                        {isPositive ? `+${formatRs(t.amount)}` : `-${formatRs(t.amount)}`}
                      </td>
                      <td className="text-right text-muted num font-medium">
                        {t.balanceAfter !== undefined ? formatRs(t.balanceAfter) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
