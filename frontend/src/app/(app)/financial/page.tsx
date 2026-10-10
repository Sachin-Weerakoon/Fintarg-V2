'use client';
import { useState, useEffect, useMemo } from 'react';
import { useApp, formatRs, calcExpensesByCategory } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PaymentMethodField, PaymentMethod } from '@/components/ui/PaymentMethodField';
import { BankSelect } from '@/components/ui/BankSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import { fetchTransactionHistory } from '@/services/storeApi';
import {
  calculateLoan,
  calculateAmortizationSchedule,
  AmortizationRow,
} from '@/utils/loanMath';
import type {
  BankAccount,
  Card as CardType,
  Transaction,
  FinancePayment,
  Loan,
} from '@/types';

type Tab = 'accounts' | 'transactions' | 'expenses' | 'income' | 'finance' | 'loans' | 'pawned';

const EXPENSE_CATS = ['Rent', 'Food', 'Transport', 'Utilities', 'Medical', 'Clothing', 'Personal', 'Other'];

export default function Financial() {
  const [tab, setTab] = useState<Tab>('accounts');
  const { state } = useApp();
  const [month, setMonth] = useState(state.selectedMonth);

  const months = useMemo(() => {
    const list = Array.from(new Set(state.expenses.map(e => e.date.slice(0, 7)))).sort();
    if (!list.includes(state.selectedMonth)) list.push(state.selectedMonth);
    return list.slice(-4);
  }, [state.expenses, state.selectedMonth]);

  const tabOptions: { id: Tab; label: string }[] = [
    { id: 'accounts', label: 'Accounts & Cards' },
    { id: 'transactions', label: 'History Ledger' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'finance', label: 'Payments' },
    { id: 'loans', label: 'Loans' },
    { id: 'pawned', label: 'Pawned Items' },
  ];

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
                onChange={setMonth}
              />
            </div>
          )
        }
      />

      {/* Main Ledger Tabs */}
      <SegmentedTabs
        options={tabOptions}
        value={tab}
        onChange={setTab}
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

// ==========================================
// 1. ACCOUNTS & CARDS TAB
// ==========================================
function AccountsTab() {
  const { state, dispatch } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'cards'>('accounts');

  // Bank Account Form
  const [accountForm, setAccountForm] = useState({
    name: '',
    bankName: '',
    accountNumber: '',
    branch: '',
    accountType: 'savings' as BankAccount['accountType'],
    currentBalance: '',
    notes: '',
  });
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [accountError, setAccountError] = useState('');

  // Card Form
  const [cardForm, setCardForm] = useState({
    name: '',
    bankAccountId: '',
    cardType: 'debit' as CardType['cardType'],
    lastFourDigits: '',
    cardNetwork: 'visa' as CardType['cardNetwork'],
    creditLimit: '',
    currentBalance: '',
    billingDay: '',
    dueDay: '',
  });
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');

  // Delete confirmations
  const [deleteAccountConfirmId, setDeleteAccountConfirmId] = useState<string | null>(null);
  const [deleteCardConfirmId, setDeleteCardConfirmId] = useState<string | null>(null);

  const totalBankBalance = state.bankAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

  const submitAccount = () => {
    if (!accountForm.name || !accountForm.bankName || !accountForm.accountNumber) {
      setAccountError('Account name, bank name, and account number are required.');
      return;
    }
    const balance = Number(accountForm.currentBalance) || 0;
    const entry: BankAccount = {
      id: editAccountId || 'ba_' + Date.now(),
      name: accountForm.name,
      bankName: accountForm.bankName,
      accountNumber: accountForm.accountNumber,
      branch: accountForm.branch,
      accountType: accountForm.accountType,
      currentBalance: balance,
      currency: 'LKR',
      notes: accountForm.notes,
    };

    if (editAccountId) {
      dispatch({ type: 'UPDATE_BANK_ACCOUNT', entry });
      setEditAccountId(null);
    } else {
      dispatch({ type: 'ADD_BANK_ACCOUNT', entry });
    }
    setAccountForm({
      name: '',
      bankName: '',
      accountNumber: '',
      branch: '',
      accountType: 'savings',
      currentBalance: '',
      notes: '',
    });
    setAccountError('');
  };

  const submitCard = () => {
    if (!cardForm.name || !cardForm.lastFourDigits) {
      setCardError('Card name and last 4 digits are required.');
      return;
    }
    if (cardForm.lastFourDigits.length !== 4) {
      setCardError('Last 4 digits must be exactly 4 numbers.');
      return;
    }
    const entry: CardType = {
      id: editCardId || 'cd_' + Date.now(),
      name: cardForm.name,
      bankAccountId: cardForm.bankAccountId || undefined,
      cardType: cardForm.cardType,
      lastFourDigits: cardForm.lastFourDigits,
      cardNetwork: cardForm.cardNetwork,
      creditLimit: cardForm.creditLimit ? Number(cardForm.creditLimit) : undefined,
      currentBalance: cardForm.currentBalance ? Number(cardForm.currentBalance) : undefined,
      billingDay: cardForm.billingDay ? Number(cardForm.billingDay) : undefined,
      dueDay: cardForm.dueDay ? Number(cardForm.dueDay) : undefined,
    };

    if (editCardId) {
      dispatch({ type: 'UPDATE_CARD', entry });
      setEditCardId(null);
    } else {
      dispatch({ type: 'ADD_CARD', entry });
    }
    setCardForm({
      name: '',
      bankAccountId: '',
      cardType: 'debit',
      lastFourDigits: '',
      cardNetwork: 'visa',
      creditLimit: '',
      currentBalance: '',
      billingDay: '',
      dueDay: '',
    });
    setCardError('');
  };

  return (
    <div className="space-y-6">
      {/* Top summary row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted mb-0.5">Total Bank Liquidity</div>
          <div className="text-2xl font-bold text-text num">{formatRs(totalBankBalance)}</div>
          <div className="text-xs text-muted mt-1">{state.bankAccounts.length} active accounts</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted mb-0.5">Connected Cards</div>
          <div className="text-2xl font-bold text-primary-text num">{state.cards.length}</div>
          <div className="text-xs text-muted mt-1">Debit & credit cards</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted mb-0.5">Primary Bank</div>
          <div className="text-sm font-bold text-text truncate">
            {state.profile?.bankName || (state.bankAccounts[0]?.bankName ?? 'Not configured')}
          </div>
          <div className="text-xs text-muted mt-1 truncate">
            {state.profile?.accountNumber ? `•••• ${state.profile.accountNumber.slice(-4)}` : 'Set default in settings'}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <SegmentedTabs
          size="sm"
          options={[
            { id: 'accounts', label: `Bank Accounts (${state.bankAccounts.length})` },
            { id: 'cards', label: `Payment Cards (${state.cards.length})` },
          ]}
          value={activeSubTab}
          onChange={v => setActiveSubTab(v as any)}
        />
      </div>

      {activeSubTab === 'accounts' ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Bank Accounts List */}
          <div className="md:col-span-2 space-y-3">
            {state.bankAccounts.length === 0 ? (
              <EmptyState
                icon={<Icon name="bank" size={24} />}
                title="No bank accounts connected"
                helper="Add your savings, checking, or current accounts to track balances and link payments."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {state.bankAccounts.map(acc => {
                  const lastFour = acc.accountNumber ? acc.accountNumber.slice(-4) : '••••';
                  return (
                    <Card key={acc.id} className="p-4 flex flex-col justify-between border-border hover:border-primary-500/40 transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-semibold text-sm text-text">{acc.name}</div>
                            <div className="text-xs text-muted font-medium">{acc.bankName} {acc.branch ? `· ${acc.branch}` : ''}</div>
                          </div>
                          <Badge tone="primary" size="sm" className="uppercase text-[10px]">
                            {acc.accountType || 'savings'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted font-mono tracking-wider mt-3">
                          •••• •••• •••• {lastFour}
                        </div>
                        <div className="text-xl font-bold text-text mt-1 num">
                          {formatRs(acc.currentBalance)}
                        </div>
                        {acc.notes && <p className="text-[11px] text-muted mt-1 truncate">{acc.notes}</p>}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-border/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditAccountId(acc.id);
                            setAccountForm({
                              name: acc.name,
                              bankName: acc.bankName,
                              accountNumber: acc.accountNumber,
                              branch: acc.branch || '',
                              accountType: acc.accountType || 'savings',
                              currentBalance: String(acc.currentBalance),
                              notes: acc.notes || '',
                            });
                          }}
                          aria-label="Edit account"
                        >
                          <Icon name="edit" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:text-danger-text"
                          onClick={() => setDeleteAccountConfirmId(acc.id)}
                          aria-label="Delete account"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Bank Account Form */}
          <Card className="p-5 h-fit">
            <h3 className="font-semibold text-sm mb-4 text-text">
              {editAccountId ? 'Edit Bank Account' : 'Add Bank Account'}
            </h3>
            <div className="space-y-3.5">
              <Field id="acc-name" label="Account Nickname" error={accountError}>
                <Input
                  value={accountForm.name}
                  onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Primary Savings, Business Current"
                />
              </Field>
              <Field id="acc-bank" label="Bank Name">
                <Input
                  value={accountForm.bankName}
                  onChange={e => setAccountForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. Commercial Bank, Sampath Bank"
                />
              </Field>
              <Field id="acc-number" label="Account Number">
                <Input
                  value={accountForm.accountNumber}
                  onChange={e => setAccountForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="e.g. 8001234567"
                />
              </Field>
              <Field id="acc-branch" label="Branch (optional)">
                <Input
                  value={accountForm.branch}
                  onChange={e => setAccountForm(f => ({ ...f, branch: e.target.value }))}
                  placeholder="e.g. Kollupitiya, Fort"
                />
              </Field>
              <Field id="acc-type" label="Account Type">
                <Select
                  value={accountForm.accountType}
                  onChange={e => setAccountForm(f => ({ ...f, accountType: e.target.value as any }))}
                >
                  <option value="savings">Savings</option>
                  <option value="checking">Checking</option>
                  <option value="current">Current</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field id="acc-balance" label="Current Balance (Rs.)">
                <Input
                  type="number"
                  value={accountForm.currentBalance}
                  onChange={e => setAccountForm(f => ({ ...f, currentBalance: e.target.value }))}
                  placeholder="150,000"
                />
              </Field>
              <Field id="acc-notes" label="Notes (optional)">
                <Input
                  value={accountForm.notes}
                  onChange={e => setAccountForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Salary credit account"
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" className="flex-1" onClick={submitAccount}>
                  {editAccountId ? 'Update Account' : 'Save Account'}
                </Button>
                {editAccountId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditAccountId(null);
                      setAccountForm({
                        name: '',
                        bankName: '',
                        accountNumber: '',
                        branch: '',
                        accountType: 'savings',
                        currentBalance: '',
                        notes: '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Cards List */}
          <div className="md:col-span-2 space-y-3">
            {state.cards.length === 0 ? (
              <EmptyState
                icon={<Icon name="wallet" size={24} />}
                title="No payment cards connected"
                helper="Add your debit and credit cards to quickly categorize spending and bill due dates."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {state.cards.map(c => {
                  const linkedAcc = state.bankAccounts.find(a => a.id === c.bankAccountId);
                  return (
                    <Card
                      key={c.id}
                      className="p-4 flex flex-col justify-between border-border relative overflow-hidden"
                      style={{
                        background: c.cardType === 'credit'
                          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.2))'
                          : undefined,
                      }}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="font-semibold text-sm text-text">{c.name}</div>
                            <div className="text-xs text-muted uppercase font-medium">{c.cardNetwork || 'Card'} · {c.cardType}</div>
                          </div>
                          <Badge tone={c.cardType === 'credit' ? 'warning' : 'primary'} size="sm" className="uppercase text-[10px]">
                            {c.cardType}
                          </Badge>
                        </div>
                        <div className="text-base font-mono tracking-widest text-text my-2">
                          •••• •••• •••• {c.lastFourDigits}
                        </div>
                        {linkedAcc && (
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-2">
                            <Icon name="bank" size={12} />
                            <span>Linked: {linkedAcc.name}</span>
                          </div>
                        )}
                        {c.cardType === 'credit' && (
                          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-border/50 text-xs">
                            <div>
                              <span className="text-muted text-[11px]">Credit Limit:</span>
                              <div className="font-semibold text-text num">{c.creditLimit ? formatRs(c.creditLimit) : '—'}</div>
                            </div>
                            <div>
                              <span className="text-muted text-[11px]">Due Day:</span>
                              <div className="font-semibold text-text">{c.dueDay ? `Day ${c.dueDay}` : '—'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-4 pt-2 border-t border-border/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditCardId(c.id);
                            setCardForm({
                              name: c.name,
                              bankAccountId: c.bankAccountId || '',
                              cardType: c.cardType,
                              lastFourDigits: c.lastFourDigits,
                              cardNetwork: c.cardNetwork || 'visa',
                              creditLimit: c.creditLimit ? String(c.creditLimit) : '',
                              currentBalance: c.currentBalance ? String(c.currentBalance) : '',
                              billingDay: c.billingDay ? String(c.billingDay) : '',
                              dueDay: c.dueDay ? String(c.dueDay) : '',
                            });
                          }}
                          aria-label="Edit card"
                        >
                          <Icon name="edit" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:text-danger-text"
                          onClick={() => setDeleteCardConfirmId(c.id)}
                          aria-label="Delete card"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Card Form */}
          <Card className="p-5 h-fit">
            <h3 className="font-semibold text-sm mb-4 text-text">
              {editCardId ? 'Edit Card' : 'Add Card'}
            </h3>
            <div className="space-y-3.5">
              <Field id="card-name" label="Card Label" error={cardError}>
                <Input
                  value={cardForm.name}
                  onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Commercial Visa Platinum"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="card-type" label="Type">
                  <Select
                    value={cardForm.cardType}
                    onChange={e => setCardForm(f => ({ ...f, cardType: e.target.value as any }))}
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </Select>
                </Field>
                <Field id="card-network" label="Network">
                  <Select
                    value={cardForm.cardNetwork}
                    onChange={e => setCardForm(f => ({ ...f, cardNetwork: e.target.value as any }))}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">MasterCard</option>
                    <option value="amex">Amex</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
              </div>
              <Field id="card-lastfour" label="Last 4 Digits">
                <Input
                  maxLength={4}
                  value={cardForm.lastFourDigits}
                  onChange={e => setCardForm(f => ({ ...f, lastFourDigits: e.target.value.replace(/\D/g, '') }))}
                  placeholder="1234"
                />
              </Field>
              <BankSelect
                id="card-bank-account"
                label="Linked Bank Account (optional)"
                value={cardForm.bankAccountId}
                onChange={id => setCardForm(f => ({ ...f, bankAccountId: id }))}
                bankAccounts={state.bankAccounts}
              />
              {cardForm.cardType === 'credit' && (
                <>
                  <Field id="card-limit" label="Credit Limit (Rs.)">
                    <Input
                      type="number"
                      value={cardForm.creditLimit}
                      onChange={e => setCardForm(f => ({ ...f, creditLimit: e.target.value }))}
                      placeholder="200,000"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="card-billingday" label="Billing Day">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={cardForm.billingDay}
                        onChange={e => setCardForm(f => ({ ...f, billingDay: e.target.value }))}
                        placeholder="15"
                      />
                    </Field>
                    <Field id="card-dueday" label="Due Day">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={cardForm.dueDay}
                        onChange={e => setCardForm(f => ({ ...f, dueDay: e.target.value }))}
                        placeholder="28"
                      />
                    </Field>
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="primary" className="flex-1" onClick={submitCard}>
                  {editCardId ? 'Update Card' : 'Save Card'}
                </Button>
                {editCardId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditCardId(null);
                      setCardForm({
                        name: '',
                        bankAccountId: '',
                        cardType: 'debit',
                        lastFourDigits: '',
                        cardNetwork: 'visa',
                        creditLimit: '',
                        currentBalance: '',
                        billingDay: '',
                        dueDay: '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Bank Account Dialog */}
      {deleteAccountConfirmId && (
        <ConfirmDialog
          title="Delete Bank Account"
          message="Are you sure you want to remove this bank account? Cards and transactions linked to this account may lose their reference."
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_BANK_ACCOUNT', id: deleteAccountConfirmId });
            setDeleteAccountConfirmId(null);
          }}
          onCancel={() => setDeleteAccountConfirmId(null)}
        />
      )}

      {/* Delete Card Dialog */}
      {deleteCardConfirmId && (
        <ConfirmDialog
          title="Delete Payment Card"
          message="Are you sure you want to remove this payment card record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_CARD', id: deleteCardConfirmId });
            setDeleteCardConfirmId(null);
          }}
          onCancel={() => setDeleteCardConfirmId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 2. TRANSACTION HISTORY LEDGER TAB
// ==========================================
function TransactionsHistoryTab({ month: _month }: { month?: string }) {
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

// ==========================================
// 3. EXPENSES TAB (with payment method & bank)
// ==========================================
function ExpensesTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    date: month + '-' + new Date().toISOString().slice(8, 10),
    category: 'Food',
    amount: '',
    note: '',
    recurring: false,
    paymentMethod: 'cash' as PaymentMethod,
    bankAccountId: '',
    cardId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const monthExp = state.expenses.filter(e => e.date.startsWith(month));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const catMap = calcExpensesByCategory(state.expenses, month);
  const cats = ['All', ...Object.keys(catMap).sort()];
  const filtered = monthExp
    .filter(e => catFilter === 'All' || e.category === catFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Real days-left & daily budget computation
  const [yearStr, monthStr] = month.split('-');
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const isCurrentMonth = Number(yearStr) === currentYear && Number(monthStr) === currentMonthNum;
  const daysInMonth = new Date(Number(yearStr) || currentYear, Number(monthStr) || currentMonthNum, 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate() + 1) : daysInMonth;

  const totalMonthlyIncome = state.income.reduce((s, i) => {
    if (i.frequency === 'monthly') return s + i.amount;
    if (i.frequency === 'weekly') return s + i.amount * 4;
    if (i.frequency === 'daily') return s + i.amount * 30;
    return s;
  }, 0);
  const recurringObligations = state.financePayments.reduce((s, f) => s + f.amount, 0);
  const remainingBudget = Math.max(0, totalMonthlyIncome - recurringObligations - monthTotal);
  const dailyBudget = Math.round(remainingBudget / daysLeft);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    const entry = {
      ...form,
      amount: Number(form.amount),
      bankAccountId: form.bankAccountId || undefined,
      cardId: form.cardId || undefined,
    };
    if (editId) {
      dispatch({ type: 'UPDATE_EXPENSE', entry: { ...entry, id: editId } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_EXPENSE', entry: { ...entry, id: 'e_' + Date.now() } });
    }
    setForm({
      date: month + '-' + new Date().toISOString().slice(8, 10),
      category: 'Food',
      amount: '',
      note: '',
      recurring: false,
      paymentMethod: 'cash',
      bankAccountId: '',
      cardId: '',
    });
    setError('');
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">This Month</div>
            <div className="font-bold text-sm text-text num">{formatRs(monthTotal)}</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">Days Remaining</div>
            <div className="font-bold text-sm text-primary-text num">{daysLeft} days</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted mb-0.5">Daily Budget Left</div>
            <div className="font-bold text-sm text-success-text num">{formatRs(dailyBudget)} / day</div>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Category:</span>
            <Select
              className="!w-auto !py-1 !text-xs"
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
            >
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="text-xs text-muted">
            {filtered.length} entries recorded
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            helper="Add your first expense for this month to track cash outflow and maintain daily budget."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Payment Method</th>
                    <th>Note</th>
                    <th className="text-right">Amount</th>
                    <th className="w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const linkedBank = state.bankAccounts.find(b => b.id === e.bankAccountId);
                    return (
                      <tr key={e.id}>
                        <td className="text-muted num">{e.date}</td>
                        <td className="font-medium text-text">{e.category}</td>
                        <td>
                          <span className="text-xs text-muted capitalize">
                            {(e.paymentMethod || 'cash').replace('_', ' ')}
                            {linkedBank && ` (${linkedBank.bankName})`}
                          </span>
                        </td>
                        <td className="text-muted">{e.note || '—'}</td>
                        <td className="text-right font-medium text-text num">{formatRs(e.amount)}</td>
                        <td className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-text hover:text-danger-text !p-1"
                            onClick={() => setDeleteConfirmId(e.id)}
                            aria-label="Delete expense"
                          >
                            <Icon name="trash" size={14} />
                          </Button>
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

      {/* Form */}
      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit expense' : 'Record Expense'}</h3>
        <div className="space-y-3.5">
          <Field id="expense-date" label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field id="expense-category" label="Category">
            <Select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field id="expense-amount" label="Amount (Rs.)" error={error}>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="2,500"
            />
          </Field>
          <PaymentMethodField
            value={form.paymentMethod}
            onChange={method => setForm(f => ({ ...f, paymentMethod: method }))}
          />
          {['bank_transfer', 'cheque', 'standing_order'].includes(form.paymentMethod) && (
            <BankSelect
              value={form.bankAccountId}
              onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
              bankAccounts={state.bankAccounts}
            />
          )}
          {form.paymentMethod === 'card' && state.cards.length > 0 && (
            <Field id="expense-card" label="Card">
              <Select
                value={form.cardId}
                onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
              >
                <option value="">Select Card</option>
                {state.cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (•••• {c.lastFourDigits})</option>
                ))}
              </Select>
            </Field>
          )}
          <Field id="expense-note" label="Note">
            <Input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Supermarket, Electricity bill"
            />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted">
            <input
              type="checkbox"
              className="rounded border-border text-primary-600 focus:ring-primary-600"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
            />
            <span>Recurring monthly</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Expense' : 'Save Expense'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    date: month + '-' + new Date().toISOString().slice(8, 10),
                    category: 'Food',
                    amount: '',
                    note: '',
                    recurring: false,
                    paymentMethod: 'cash',
                    bankAccountId: '',
                    cardId: '',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Expense"
          message="Are you sure you want to delete this expense record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_EXPENSE', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 4. INCOME TAB (with payment method & bank)
// ==========================================
function IncomeTab({ month }: { month: string }) {
  const { state, dispatch } = useApp();
  type IncomeForm = {
    source: string;
    type: 'salary' | 'business' | 'other';
    amount: string;
    frequency: 'monthly' | 'weekly' | 'daily' | 'one-time';
    date: string;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
  };
  const [form, setForm] = useState<IncomeForm>({
    source: '',
    type: 'salary',
    amount: '',
    frequency: 'monthly',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.source || !form.amount || Number(form.amount) <= 0) {
      setError('Source and amount are required.');
      return;
    }
    const entry = {
      source: form.source,
      type: form.type,
      amount: Number(form.amount),
      frequency: form.frequency,
      date: form.date,
      paymentMethod: form.paymentMethod,
      bankAccountId: form.bankAccountId || undefined,
    };
    if (editId) {
      dispatch({ type: 'UPDATE_INCOME', entry: { ...entry, id: editId } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_INCOME', entry: { ...entry, id: 'i_' + Date.now() } });
    }
    setForm({
      source: '',
      type: 'salary',
      amount: '',
      frequency: 'monthly',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      bankAccountId: '',
    });
    setError('');
  };

  const totalMonthly = state.income.reduce((s, i) => {
    if (i.frequency === 'monthly') return s + i.amount;
    if (i.frequency === 'weekly') return s + i.amount * 4;
    if (i.frequency === 'daily') return s + i.amount * 30;
    if (i.frequency === 'one-time' && i.date.startsWith(month)) return s + i.amount;
    return s;
  }, 0);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm text-text">Income sources</div>
          <div className="text-sm text-muted">
            Monthly total: <span className="font-semibold text-text num">{formatRs(totalMonthly)}</span>
          </div>
        </div>
        {state.income.length === 0 ? (
          <EmptyState
            title="No income sources"
            helper="Add your salary or business earnings to calculate monthly budgets and free cash."
          />
        ) : (
          <div className="space-y-2.5">
            {state.income.map(i => {
              const linkedBank = state.bankAccounts.find(b => b.id === i.bankAccountId);
              return (
                <Card key={i.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text">{i.source}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {i.type} · {i.frequency} · {i.date}
                      {linkedBank && ` · ${linkedBank.bankName}`}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-primary-text num">{formatRs(i.amount)}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditId(i.id);
                        setForm({
                          source: i.source,
                          type: i.type,
                          amount: String(i.amount),
                          frequency: i.frequency,
                          date: i.date,
                          paymentMethod: i.paymentMethod || 'bank_transfer',
                          bankAccountId: i.bankAccountId || '',
                        });
                      }}
                      title="Edit"
                      aria-label="Edit income"
                    >
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text"
                      onClick={() => setDeleteConfirmId(i.id)}
                      title="Delete"
                      aria-label="Delete income"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit income' : 'Add income source'}</h3>
        <div className="space-y-3.5">
          <Field id="income-source" label="Source" error={error}>
            <Input
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              placeholder="e.g. Government Salary, Consulting"
            />
          </Field>
          <Field id="income-type" label="Type">
            <Select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as 'salary' | 'business' | 'other' }))}
            >
              <option value="salary">Salary</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field id="income-amount" label="Amount (Rs.)">
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="50,000"
            />
          </Field>
          <PaymentMethodField
            value={form.paymentMethod}
            onChange={method => setForm(f => ({ ...f, paymentMethod: method }))}
          />
          <BankSelect
            value={form.bankAccountId}
            onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
            bankAccounts={state.bankAccounts}
            label="Deposited to Account (optional)"
          />
          <Field id="income-frequency" label="Frequency">
            <Select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="one-time">One-time</option>
            </Select>
          </Field>
          <Field id="income-date" label="Date received">
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Income' : 'Save Income'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    source: '',
                    type: 'salary',
                    amount: '',
                    frequency: 'monthly',
                    date: new Date().toISOString().slice(0, 10),
                    paymentMethod: 'bank_transfer',
                    bankAccountId: '',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Income Source"
          message="Are you sure you want to remove this income source from your ledger?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_INCOME', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 5. FINANCE PAYMENTS TAB (Cheques & Standing Orders)
// ==========================================
function FinanceTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    paymentKind: 'instalment' as NonNullable<FinancePayment['paymentKind']>,
    lender: '',
    payee: '',
    chequeNumber: '',
    amount: '',
    dueDay: '',
    monthsRemaining: '',
    frequency: 'monthly' as NonNullable<FinancePayment['frequency']>,
    bankAccountId: '',
    status: 'active' as NonNullable<FinancePayment['status']>,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    const label = form.paymentKind === 'cheque' || form.paymentKind === 'standing_order'
      ? form.payee
      : form.lender;
    if (!label) return;

    const entry: FinancePayment = {
      id: editId || 'fp_' + Date.now(),
      lender: label,
      payee: form.payee || undefined,
      chequeNumber: form.chequeNumber || undefined,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay) || 1,
      monthsRemaining: Number(form.monthsRemaining) || 1,
      paymentKind: form.paymentKind,
      frequency: form.frequency,
      bankAccountId: form.bankAccountId || undefined,
      status: form.status,
    };

    if (editId) {
      dispatch({ type: 'UPDATE_FINANCE_PAYMENT', entry });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_FINANCE_PAYMENT', entry });
    }

    setForm({
      paymentKind: 'instalment',
      lender: '',
      payee: '',
      chequeNumber: '',
      amount: '',
      dueDay: '',
      monthsRemaining: '',
      frequency: 'monthly',
      bankAccountId: '',
      status: 'active',
    });
  };

  const filteredPayments = state.financePayments.filter(f => {
    if (filterKind === 'all') return true;
    return (f.paymentKind || 'instalment') === filterKind;
  });

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <SegmentedTabs
            size="sm"
            options={[
              { id: 'all', label: 'All Payments' },
              { id: 'instalment', label: 'Instalments & Leases' },
              { id: 'cheque', label: 'Cheques' },
              { id: 'standing_order', label: 'Standing Orders' },
            ]}
            value={filterKind}
            onChange={setFilterKind}
          />
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            helper="Add hire purchase, lease, cheque, or standing order commitments to plan cashflow."
          />
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map(fp => {
              const kind = fp.paymentKind || 'instalment';
              const bank = state.bankAccounts.find(b => b.id === fp.bankAccountId);
              return (
                <Card key={fp.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text truncate">{fp.lender || fp.payee}</span>
                      <Badge tone={kind === 'cheque' ? 'warning' : kind === 'standing_order' ? 'primary' : 'neutral'} size="sm" className="capitalize text-[10px]">
                        {kind.replace('_', ' ')}
                      </Badge>
                      {fp.status && fp.status !== 'active' && (
                        <Badge tone={fp.status === 'cleared' ? 'success' : 'danger'} size="sm" className="capitalize text-[10px]">
                          {fp.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {kind === 'cheque' && fp.chequeNumber && `Cheque #${fp.chequeNumber} · `}
                      Due day {fp.dueDay}
                      {kind !== 'cheque' && ` · ${fp.monthsRemaining} months remaining`}
                      {bank && ` · ${bank.bankName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-primary-text num">{formatRs(fp.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditId(fp.id);
                        setForm({
                          paymentKind: fp.paymentKind || 'instalment',
                          lender: fp.lender || '',
                          payee: fp.payee || fp.lender || '',
                          chequeNumber: fp.chequeNumber || '',
                          amount: String(fp.amount),
                          dueDay: String(fp.dueDay),
                          monthsRemaining: String(fp.monthsRemaining),
                          frequency: fp.frequency || 'monthly',
                          bankAccountId: fp.bankAccountId || '',
                          status: fp.status || 'active',
                        });
                      }}
                      aria-label="Edit payment"
                    >
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text !p-1.5"
                      onClick={() => setDeleteConfirmId(fp.id)}
                      aria-label="Delete payment"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit Payment' : 'Add Finance Payment'}</h3>
        <div className="space-y-3.5">
          <Field id="fp-kind" label="Payment Type">
            <Select
              value={form.paymentKind}
              onChange={e => setForm(f => ({ ...f, paymentKind: e.target.value as any }))}
            >
              <option value="instalment">Hire Purchase / Instalment</option>
              <option value="lease">Vehicle Lease</option>
              <option value="cheque">Post-Dated Cheque</option>
              <option value="standing_order">Standing Order</option>
            </Select>
          </Field>

          {form.paymentKind === 'cheque' ? (
            <>
              <Field id="fp-payee" label="Payee">
                <Input
                  value={form.payee}
                  onChange={e => setForm(f => ({ ...f, payee: e.target.value, lender: e.target.value }))}
                  placeholder="e.g. Landlord, Supplier Ltd."
                />
              </Field>
              <Field id="fp-chequenum" label="Cheque Number">
                <Input
                  value={form.chequeNumber}
                  onChange={e => setForm(f => ({ ...f, chequeNumber: e.target.value }))}
                  placeholder="e.g. 784512"
                />
              </Field>
            </>
          ) : form.paymentKind === 'standing_order' ? (
            <>
              <Field id="fp-payee" label="Beneficiary / Payee">
                <Input
                  value={form.payee}
                  onChange={e => setForm(f => ({ ...f, payee: e.target.value, lender: e.target.value }))}
                  placeholder="e.g. Insurance Premium, School Fee"
                />
              </Field>
              <Field id="fp-freq" label="Frequency">
                <Select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </Select>
              </Field>
            </>
          ) : (
            <Field id="fp-lender" label="Lender / Institution">
              <Input
                value={form.lender}
                onChange={e => setForm(f => ({ ...f, lender: e.target.value, payee: e.target.value }))}
                placeholder="e.g. People's Bank, Singer"
              />
            </Field>
          )}

          <Field id="fp-amount" label="Amount (Rs.)">
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="25,000"
            />
          </Field>
          <Field id="fp-dueday" label="Due Day of Month">
            <Input
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
              placeholder="10"
            />
          </Field>

          {form.paymentKind !== 'cheque' && (
            <Field id="fp-months" label="Months Remaining">
              <Input
                type="number"
                value={form.monthsRemaining}
                onChange={e => setForm(f => ({ ...f, monthsRemaining: e.target.value }))}
                placeholder="18"
              />
            </Field>
          )}

          <BankSelect
            value={form.bankAccountId}
            onChange={id => setForm(f => ({ ...f, bankAccountId: id }))}
            bankAccounts={state.bankAccounts}
            label="Linked Bank Account"
          />

          <Field id="fp-status" label="Status">
            <Select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={submit}>
              {editId ? 'Update Payment' : 'Save Payment'}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    paymentKind: 'instalment',
                    lender: '',
                    payee: '',
                    chequeNumber: '',
                    amount: '',
                    dueDay: '',
                    monthsRemaining: '',
                    frequency: 'monthly',
                    bankAccountId: '',
                    status: 'active',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Finance Payment"
          message="Are you sure you want to remove this finance payment?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_FINANCE_PAYMENT', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 6. LOANS TAB (Amortization & Repayments)
// ==========================================
function LoansTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    lender: '',
    amount: '',
    rate: '12',
    method: 'reducing_balance' as 'reducing_balance' | 'simple' | 'compound',
    interestBasis: 'annual' as 'annual' | 'monthly',
    tenureMonths: '12',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Repayment sheet state
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  // Amortization sheet state
  const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);

  // Live loan calculator preview
  const previewPrincipal = Number(form.amount) || 0;
  const previewRate = Number(form.rate) || 0;
  const previewTenure = Number(form.tenureMonths) || 12;
  const liveCalc = useMemo(() => {
    if (previewPrincipal <= 0) return null;
    const effectiveRate = form.interestBasis === 'monthly' ? previewRate * 12 : previewRate;
    return calculateLoan(previewPrincipal, effectiveRate, previewTenure, form.method);
  }, [previewPrincipal, previewRate, previewTenure, form.method, form.interestBasis]);

  const submit = () => {
    if (!form.lender || !form.amount) return;
    const principal = Number(form.amount);
    const rate = Number(form.rate) || 0;
    const tenure = Number(form.tenureMonths) || 12;
    const effectiveRate = form.interestBasis === 'monthly' ? rate * 12 : rate;
    const calc = calculateLoan(principal, effectiveRate, tenure, form.method);

    const startDate = form.startDate || new Date().toISOString().slice(0, 10);
    const defaultDue = new Date(startDate);
    defaultDue.setMonth(defaultDue.getMonth() + tenure);
    const dueDate = form.dueDate || defaultDue.toISOString().slice(0, 10);

    const entry: Loan = {
      id: editId || 'ln_' + Date.now(),
      lender: form.lender,
      principal,
      rate,
      method: form.method,
      interestBasis: form.interestBasis,
      tenureMonths: tenure,
      startDate,
      dueDate,
      balance: principal,
      monthlyPayment: calc.monthlyPayment,
      totalInterest: calc.totalInterest,
      repayments: [],
    };

    if (editId) {
      dispatch({ type: 'UPDATE_LOAN', entry });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_LOAN', entry });
    }

    setForm({
      lender: '',
      amount: '',
      rate: '12',
      method: 'reducing_balance',
      interestBasis: 'annual',
      tenureMonths: '12',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
    });
  };

  const handleRecordRepayment = () => {
    if (!repayingLoan || !repaymentForm.amount || Number(repaymentForm.amount) <= 0) return;
    dispatch({
      type: 'RECORD_LOAN_REPAYMENT',
      id: repayingLoan.id,
      amount: Number(repaymentForm.amount),
      note: repaymentForm.note,
      date: repaymentForm.date,
    });
    setRepayingLoan(null);
    setRepaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  const amortizationSchedule: AmortizationRow[] = useMemo(() => {
    if (!amortizingLoan) return [];
    const effectiveRate = amortizingLoan.interestBasis === 'monthly'
      ? (amortizingLoan.rate || 0) * 12
      : amortizingLoan.rate || 0;
    return calculateAmortizationSchedule(
      amortizingLoan.principal,
      effectiveRate,
      amortizingLoan.tenureMonths || 12
    );
  }, [amortizingLoan]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <h3 className="font-semibold text-sm text-text">Loans & Mortgages</h3>
        {state.loans.length === 0 ? (
          <EmptyState
            title="No active loans"
            helper="Add personal, business, or bank loans to calculate amortization and log repayments."
          />
        ) : (
          <div className="space-y-3">
            {state.loans.map(ln => {
              const paidAmount = ln.principal - ln.balance;
              const progressPct = ln.principal > 0 ? Math.min(100, Math.round((paidAmount / ln.principal) * 100)) : 0;
              return (
                <Card key={ln.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-text">{ln.lender}</div>
                      <div className="text-xs text-muted mt-0.5">
                        Principal <span className="font-semibold num text-text">{formatRs(ln.principal)}</span> · {ln.rate}% ({ln.interestBasis || 'annual'}) · {ln.tenureMonths || 12}M
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted">Remaining Balance</div>
                      <div className="text-base font-bold text-primary-text num">{formatRs(ln.balance)}</div>
                    </div>
                  </div>

                  <ProgressBar value={paidAmount} max={ln.principal} tone="primary" size="sm" />
                  <div className="flex justify-between text-xs text-muted">
                    <span>{progressPct}% repaid ({formatRs(paidAmount)})</span>
                    <span>Due: {ln.dueDate}</span>
                  </div>

                  {ln.monthlyPayment && (
                    <div className="p-2.5 rounded-xl bg-surface-hover/50 border border-border flex items-center justify-between text-xs">
                      <span className="text-muted">Calculated Monthly EMI:</span>
                      <span className="font-bold text-text num">{formatRs(ln.monthlyPayment)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRepayingLoan(ln);
                          setRepaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
                        }}
                      >
                        Log Repayment
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAmortizingLoan(ln)}
                      >
                        Amortization Schedule
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-text hover:text-danger-text !p-1.5"
                        onClick={() => setDeleteConfirmId(ln.id)}
                        aria-label="Delete loan"
                      >
                        <Icon name="trash" size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Previous Repayments list */}
                  {ln.repayments && ln.repayments.length > 0 && (
                    <div className="pt-2 border-t border-border/40 text-xs">
                      <span className="text-[11px] font-semibold text-muted mb-1 block">Recent Repayments:</span>
                      <div className="space-y-1">
                        {ln.repayments.slice(-3).reverse().map((r, idx) => (
                          <div key={idx} className="flex justify-between text-muted text-[11px]">
                            <span>{r.date} {r.note ? `· ${r.note}` : ''}</span>
                            <span className="font-medium text-success-text num">-{formatRs(r.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Loan Form */}
      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">{editId ? 'Edit loan' : 'Add Loan'}</h3>
        <div className="space-y-3.5">
          <Field id="loan-lender" label="Lender / Institution">
            <Input
              value={form.lender}
              onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
              placeholder="e.g. Commercial Bank, Mortgage"
            />
          </Field>
          <Field id="loan-principal" label="Principal Amount (Rs.)">
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="1,000,000"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-rate" label="Interest rate (%)">
              <Input
                type="number"
                step="0.1"
                value={form.rate}
                onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                placeholder="12"
              />
            </Field>
            <Field id="loan-basis" label="Interest Basis">
              <Select
                value={form.interestBasis}
                onChange={e => setForm(f => ({ ...f, interestBasis: e.target.value as any }))}
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-tenure" label="Tenure (Months)">
              <Input
                type="number"
                value={form.tenureMonths}
                onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))}
                placeholder="12"
              />
            </Field>
            <Field id="loan-method" label="Method">
              <Select
                value={form.method}
                onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
              >
                <option value="reducing_balance">Reducing Balance</option>
                <option value="simple">Simple / Flat</option>
                <option value="compound">Compound</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="loan-start" label="Start Date">
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field id="loan-due" label="Due Date (optional)">
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </Field>
          </div>

          {/* Live Loan Calculation Box */}
          {liveCalc && (
            <div className="p-3 rounded-xl bg-surface-hover/70 border border-primary-500/30 text-xs space-y-1.5">
              <div className="font-semibold text-text flex items-center gap-1.5">
                <Icon name="bolt" size={14} className="text-primary-text" />
                <span>Loan Projection</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Monthly EMI:</span>
                <span className="font-bold text-text num">{formatRs(liveCalc.monthlyPayment)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Total Interest:</span>
                <span className="font-semibold text-text num">{formatRs(liveCalc.totalInterest)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Total Payable:</span>
                <span className="font-bold text-primary-text num">{formatRs(liveCalc.totalPayment)}</span>
              </div>
            </div>
          )}

          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Loan
          </Button>
        </div>
      </Card>

      {/* Repayment Sheet */}
      <Sheet
        isOpen={Boolean(repayingLoan)}
        onClose={() => setRepayingLoan(null)}
        title="Record Loan Repayment"
        description={repayingLoan ? `Log a payment for ${repayingLoan.lender}` : ''}
      >
        <div className="space-y-4 pt-2">
          <Field id="repay-amount" label="Repayment Amount (Rs.)">
            <Input
              type="number"
              value={repaymentForm.amount}
              onChange={e => setRepaymentForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 25,000"
            />
          </Field>
          <Field id="repay-date" label="Payment Date">
            <Input
              type="date"
              value={repaymentForm.date}
              onChange={e => setRepaymentForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field id="repay-note" label="Notes (optional)">
            <Input
              value={repaymentForm.note}
              onChange={e => setRepaymentForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Regular monthly installment"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleRecordRepayment}>
              Save Repayment
            </Button>
            <Button variant="secondary" onClick={() => setRepayingLoan(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Amortization Schedule Sheet */}
      <Sheet
        isOpen={Boolean(amortizingLoan)}
        onClose={() => setAmortizingLoan(null)}
        title="Amortization Schedule"
        description={amortizingLoan ? `${amortizingLoan.lender} · ${formatRs(amortizingLoan.principal)} at ${amortizingLoan.rate}%` : ''}
      >
        <div className="overflow-x-auto max-h-[60vh] mt-2">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>M#</th>
                <th className="text-right">Payment</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Interest</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {amortizationSchedule.map(row => (
                <tr key={row.month}>
                  <td className="text-muted num">#{row.month}</td>
                  <td className="text-right font-medium text-text num">{formatRs(row.payment)}</td>
                  <td className="text-right text-success-text num">{formatRs(row.principal)}</td>
                  <td className="text-right text-danger-text num">{formatRs(row.interest)}</td>
                  <td className="text-right font-bold text-text num">{formatRs(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Loan"
          message="Are you sure you want to remove this loan record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_LOAN', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 7. PAWNED ITEMS TAB
// ==========================================
function PawnedTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    description: '',
    amountReceived: '',
    interestRate: '',
    nextDue: new Date().toISOString().slice(0, 10),
    redemptionDate: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const submit = () => {
    if (!form.description || !form.amountReceived) return;
    const nextDue = form.nextDue || new Date().toISOString().slice(0, 10);
    const defaultRedemption = new Date();
    defaultRedemption.setMonth(defaultRedemption.getMonth() + 6);
    const redemptionDate = form.redemptionDate || defaultRedemption.toISOString().slice(0, 10);

    dispatch({
      type: 'ADD_PAWNED',
      entry: {
        id: 'pw_' + Date.now(),
        description: form.description,
        amountReceived: Number(form.amountReceived),
        interestRate: Number(form.interestRate) || 0,
        nextDue,
        redemptionDate,
      },
    });
    setForm({
      description: '',
      amountReceived: '',
      interestRate: '',
      nextDue: new Date().toISOString().slice(0, 10),
      redemptionDate: '',
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-sm mb-3 text-text">Pawned items</h3>
        {state.pawnedItems.length === 0 ? (
          <EmptyState
            title="No pawned items"
            helper="Track pawned gold items, monthly interest rates, and redemption deadlines."
          />
        ) : (
          <div className="space-y-2.5">
            {state.pawnedItems.map(p => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-text">{p.description}</div>
                  <div className="text-xs text-muted mt-0.5">
                    <span className="num font-semibold text-text">{formatRs(p.amountReceived)}</span> · {p.interestRate}% / mo · Due {p.nextDue}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => dispatch({ type: 'RECORD_PAWN_PAYMENT', id: p.id })}
                  >
                    Pay Interest
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-text hover:text-danger-text !p-1.5"
                    onClick={() => setDeleteConfirmId(p.id)}
                    aria-label="Delete item"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-sm mb-4 text-text">Add pawned item</h3>
        <div className="space-y-3.5">
          <Field id="pawn-desc" label="Description">
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Gold chain (22g)"
            />
          </Field>
          <Field id="pawn-amount" label="Amount received (Rs.)">
            <Input
              type="number"
              value={form.amountReceived}
              onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))}
              placeholder="50,000"
            />
          </Field>
          <Field id="pawn-rate" label="Interest rate (% per month)">
            <Input
              type="number"
              value={form.interestRate}
              onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
              placeholder="2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pawn-due" label="Next due date">
              <Input
                type="date"
                value={form.nextDue}
                onChange={e => setForm(f => ({ ...f, nextDue: e.target.value }))}
              />
            </Field>
            <Field id="pawn-redemption" label="Redemption date">
              <Input
                type="date"
                value={form.redemptionDate}
                onChange={e => setForm(f => ({ ...f, redemptionDate: e.target.value }))}
              />
            </Field>
          </div>
          <Button variant="primary" className="w-full pt-1" onClick={submit}>
            Save Item
          </Button>
        </div>
      </Card>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Pawned Item"
          message="Are you sure you want to remove this pawned item record?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_PAWNED', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
