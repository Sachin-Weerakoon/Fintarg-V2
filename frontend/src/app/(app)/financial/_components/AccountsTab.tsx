'use client';
import { useState } from 'react';
import { useApp, formatRs } from '@/store';
import { Card } from '@/components/ui/Card';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { BankSelect } from '@/components/ui/BankSelect';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import {
  SRI_LANKAN_BANKS,
  SRI_LANKAN_BANK_DETAILS,
  detectCardNetwork,
  formatCardNumberInput,
  formatExpiryInput,
} from '@/utils/bankData';
import type { BankAccount, Card as CardType } from '@/types';

export function AccountsTab() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'cards'>('accounts');

  // Bank Account Form
  const [accountForm, setAccountForm] = useState({
    name: '',
    bankName: '',
    accountNumber: '',
    branch: '',
    branchCode: '',
    swiftCode: '',
    accountType: 'savings' as BankAccount['accountType'],
    currentBalance: '',
    notes: '',
  });
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [accountError, setAccountError] = useState('');
  const [viewAccountDetails, setViewAccountDetails] = useState<BankAccount | null>(null);

  // Card Form
  const [cardForm, setCardForm] = useState({
    name: '',
    bankAccountId: '',
    cardType: 'debit' as CardType['cardType'],
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    lastFourDigits: '',
    cardNetwork: 'visa' as CardType['cardNetwork'],
    creditLimit: '',
    currentBalance: '',
    billingDay: '',
    dueDay: '',
  });
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');
  const [viewCardDetails, setViewCardDetails] = useState<CardType | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDeleteAccount = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Bank Account',
      message: `Are you sure you want to remove "${name}"? Cards and transactions linked to this account may lose their reference.`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_BANK_ACCOUNT', id });
      toast.success(`Bank account "${name}" deleted`);
    }
  };

  const handleDeleteCard = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Payment Card',
      message: `Are you sure you want to remove payment card "${name}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_CARD', id });
      toast.success(`Payment card "${name}" deleted`);
    }
  };

  const totalBankBalance = state.bankAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2200);
      }
    } catch {
      // Fallback
    }
  };

  const handleBankSelectChange = (val: string) => {
    if (val === 'Other / Custom Bank') {
      if (SRI_LANKAN_BANKS.includes(accountForm.bankName)) {
        setAccountForm(f => ({ ...f, bankName: '', branchCode: '', swiftCode: '' }));
      }
    } else {
      const preset = SRI_LANKAN_BANK_DETAILS[val];
      setAccountForm(f => ({
        ...f,
        bankName: val,
        branchCode: preset ? preset.code : f.branchCode,
        swiftCode: preset ? preset.swift : f.swiftCode,
      }));
    }
    if (accountError) setAccountError('');
  };

  const submitAccount = () => {
    if (!accountForm.name.trim()) {
      setAccountError('Account nickname is required (e.g. Primary Savings, Business Ops).');
      return;
    }
    if (!accountForm.bankName.trim()) {
      setAccountError('Bank name is required. Please select or enter your bank.');
      return;
    }
    const sanitizedNumber = accountForm.accountNumber.replace(/\s+/g, '');
    if (!sanitizedNumber || sanitizedNumber.length < 4) {
      setAccountError('Valid bank account number is required (at least 4 digits).');
      return;
    }
    const balance = Number(accountForm.currentBalance) || 0;
    const entry: BankAccount = {
      id: editAccountId || 'ba_' + Date.now(),
      name: accountForm.name.trim(),
      bankName: accountForm.bankName.trim(),
      accountNumber: sanitizedNumber,
      branch: accountForm.branch.trim(),
      branchCode: accountForm.branchCode.trim(),
      swiftCode: accountForm.swiftCode.trim(),
      accountType: accountForm.accountType,
      currentBalance: balance,
      currency: 'LKR',
      notes: accountForm.notes.trim(),
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
      branchCode: '',
      swiftCode: '',
      accountType: 'savings',
      currentBalance: '',
      notes: '',
    });
    setAccountError('');
  };

  const submitCard = () => {
    if (!cardForm.name.trim()) {
      setCardError('Card label is required (e.g. Commercial Visa Platinum).');
      return;
    }
    const cleanNumber = cardForm.cardNumber.replace(/\s+/g, '');
    if (!editCardId && !cleanNumber && !cardForm.lastFourDigits) {
      setCardError('Card number is required.');
      return;
    }
    if (cleanNumber && (cleanNumber.length < 12 || cleanNumber.length > 19)) {
      setCardError('Please enter a valid card number (12 to 19 digits).');
      return;
    }
    if (cardForm.expiryDate) {
      const match = cardForm.expiryDate.match(/^(\d{2})\/(\d{2})$/);
      if (!match) {
        setCardError('Expiry date must be in MM/YY format (e.g. 12/28).');
        return;
      }
      const month = parseInt(match[1], 10);
      if (month < 1 || month > 12) {
        setCardError('Expiry month must be between 01 and 12.');
        return;
      }
    }
    if (cardForm.cvv && (cardForm.cvv.length < 3 || cardForm.cvv.length > 4)) {
      setCardError('CVV / CVC must be 3 or 4 digits.');
      return;
    }

    const lastFour = cleanNumber ? cleanNumber.slice(-4) : (cardForm.lastFourDigits || '0000');

    const entry: CardType = {
      id: editCardId || 'cd_' + Date.now(),
      name: cardForm.name.trim(),
      bankAccountId: cardForm.bankAccountId || undefined,
      cardType: cardForm.cardType,
      cardNumber: cardForm.cardNumber,
      lastFourDigits: lastFour,
      cardNetwork: cardForm.cardNetwork,
      expiryDate: cardForm.expiryDate,
      cvv: cardForm.cvv,
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
      cardNumber: '',
      expiryDate: '',
      cvv: '',
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
          <div className="text-xs text-muted mt-1 truncate font-mono">
            {state.profile?.accountNumber ? `A/C: ${state.profile.accountNumber}` : 'Set default in settings'}
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
          onChange={(v: string) => setActiveSubTab(v as any)}
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
                helper="Add your savings, current, or business accounts with standard banking details."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {state.bankAccounts.map(acc => {
                  return (
                    <Card
                      key={acc.id}
                      className="p-4 flex flex-col justify-between border-border hover:border-primary-500/40 transition-all shadow-sm"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-text truncate">{acc.name}</div>
                            <div className="text-xs text-muted font-medium truncate">
                              {acc.bankName} {acc.branch ? `· ${acc.branch}` : ''}
                            </div>
                          </div>
                          <Badge tone="primary" size="sm" className="uppercase text-[10px] shrink-0">
                            {acc.accountType || 'savings'}
                          </Badge>
                        </div>

                        {/* Visible Account Number Section with Copy Button */}
                        <div className="my-2.5 px-3 py-2 rounded-lg bg-surface-hover/80 border border-border flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                              Account Number
                            </span>
                            <span className="font-mono text-sm font-bold text-text tracking-wide truncate block">
                              {acc.accountNumber}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(acc.accountNumber, `acc_${acc.id}`)}
                            className="!p-1.5 shrink-0"
                            title="Copy account number"
                            aria-label="Copy account number"
                          >
                            <Icon
                              name={copiedId === `acc_${acc.id}` ? 'check' : 'copy'}
                              size={14}
                              className={copiedId === `acc_${acc.id}` ? 'text-primary-text' : ''}
                            />
                          </Button>
                        </div>

                        {/* Industry Banking Specifications */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted py-1 border-t border-border/50">
                          {acc.branchCode && (
                            <div>
                              <span className="text-muted/70 text-[10px] uppercase block">Branch Code</span>
                              <span className="font-medium font-mono text-text">{acc.branchCode}</span>
                            </div>
                          )}
                          {acc.swiftCode && (
                            <div>
                              <span className="text-muted/70 text-[10px] uppercase block">SWIFT / BIC</span>
                              <span className="font-medium font-mono text-text">{acc.swiftCode}</span>
                            </div>
                          )}
                        </div>

                        {/* Balance */}
                        <div className="mt-2">
                          <span className="text-[10px] uppercase text-muted block">Available Balance</span>
                          <div className="text-xl font-bold text-text num">
                            {formatRs(acc.currentBalance)}
                          </div>
                        </div>

                        {acc.notes && <p className="text-[11px] text-muted mt-1 truncate">{acc.notes}</p>}
                      </div>

                      {/* Actions: View Details, Edit, Delete */}
                      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewAccountDetails(acc)}
                          className="gap-1.5 text-xs flex-1 sm:flex-initial"
                        >
                          <Icon name="eye" size={13} />
                          <span>View Details</span>
                        </Button>

                        <div className="flex items-center gap-1">
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
                                branchCode: acc.branchCode || '',
                                swiftCode: acc.swiftCode || '',
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
                            onClick={() => handleDeleteAccount(acc.id, acc.name)}
                            aria-label="Delete account"
                          >
                            <Icon name="trash" size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Bank Account Form */}
          <Card className="p-5 h-fit">
            <h3 className="font-semibold text-sm mb-4 text-text flex items-center justify-between">
              <span>{editAccountId ? 'Edit Bank Account' : 'Add Bank Account'}</span>
              <span className="text-[11px] font-normal text-muted">Banking Standards</span>
            </h3>

            {accountError && (
              <Alert tone="danger" className="mb-4" onDismiss={() => setAccountError('')}>
                {accountError}
              </Alert>
            )}

            <div className="space-y-3.5">
              <Field id="acc-name" label="Account Nickname" hint="e.g. Primary Savings, Business Operations">
                <Input
                  value={accountForm.name}
                  onChange={e => {
                    setAccountForm(f => ({ ...f, name: e.target.value }));
                    if (accountError) setAccountError('');
                  }}
                  placeholder="e.g. Primary Savings"
                />
              </Field>

              <Field id="acc-bank" label="Bank Name" hint="Select standard preset or enter custom bank">
                <Select
                  id="acc-bank"
                  value={
                    SRI_LANKAN_BANKS.includes(accountForm.bankName)
                      ? accountForm.bankName
                      : 'Other / Custom Bank'
                  }
                  onChange={e => handleBankSelectChange(e.target.value)}
                >
                  {SRI_LANKAN_BANKS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </Select>
                {(!SRI_LANKAN_BANKS.includes(accountForm.bankName) || accountForm.bankName === '') && (
                  <Input
                    className="mt-2"
                    value={accountForm.bankName}
                    onChange={e => {
                      setAccountForm(f => ({ ...f, bankName: e.target.value }));
                      if (accountError) setAccountError('');
                    }}
                    placeholder="Enter custom bank name (e.g. Foreign bank, Union)"
                  />
                )}
              </Field>

              <Field id="acc-number" label="Account Number" hint="Full account number will be visible on your account details">
                <Input
                  value={accountForm.accountNumber}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9-]/g, '');
                    setAccountForm(f => ({ ...f, accountNumber: cleaned }));
                    if (accountError) setAccountError('');
                  }}
                  placeholder="e.g. 8001234567"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field id="acc-type" label="Account Type">
                  <Select
                    value={accountForm.accountType}
                    onChange={e => setAccountForm(f => ({ ...f, accountType: e.target.value as any }))}
                  >
                    <option value="savings">Savings Account</option>
                    <option value="current">Current / Checking</option>
                    <option value="business">Business Account</option>
                    <option value="other">Fixed Deposit / Other</option>
                  </Select>
                </Field>
                <Field id="acc-branch" label="Branch (optional)">
                  <Input
                    value={accountForm.branch}
                    onChange={e => setAccountForm(f => ({ ...f, branch: e.target.value }))}
                    placeholder="e.g. Kollupitiya"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field id="acc-branchcode" label="Branch Code" hint="e.g. 034">
                  <Input
                    value={accountForm.branchCode}
                    onChange={e => setAccountForm(f => ({ ...f, branchCode: e.target.value }))}
                    placeholder="034"
                  />
                </Field>
                <Field id="acc-swift" label="SWIFT / BIC" hint="e.g. COMB-LK-LX">
                  <Input
                    value={accountForm.swiftCode}
                    onChange={e => setAccountForm(f => ({ ...f, swiftCode: e.target.value }))}
                    placeholder="COMB-LK-LX"
                  />
                </Field>
              </div>

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
                        branchCode: '',
                        swiftCode: '',
                        accountType: 'savings',
                        currentBalance: '',
                        notes: '',
                      });
                      setAccountError('');
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
                icon={<Icon name="credit-card" size={24} />}
                title="No payment cards connected"
                helper="Add your debit and credit cards using standard bank card specifications."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {state.cards.map(c => {
                  const linkedAcc = state.bankAccounts.find(a => a.id === c.bankAccountId);
                  return (
                    <Card
                      key={c.id}
                      className="p-4 flex flex-col justify-between border-border relative overflow-hidden shadow-sm"
                      style={{
                        background: c.cardType === 'credit'
                          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.25))'
                          : undefined,
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-text truncate">{c.name}</div>
                            <div className="text-xs text-muted uppercase font-medium">
                              {c.cardNetwork || 'Card'} · {c.cardType}
                            </div>
                          </div>
                          <Badge tone={c.cardType === 'credit' ? 'warning' : 'primary'} size="sm" className="uppercase text-[10px] shrink-0">
                            {c.cardType}
                          </Badge>
                        </div>

                        {/* Masked Card Number */}
                        <div className="p-2.5 rounded-lg bg-surface-hover/80 border border-border/80 my-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Card Number</div>
                          <div className="text-base font-mono tracking-widest text-text font-bold">
                            •••• •••• •••• {c.lastFourDigits}
                          </div>
                        </div>

                        {/* Expiry Date */}
                        {c.expiryDate && (
                          <div className="text-xs text-muted font-mono flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted/70">EXP:</span>
                            <span className="text-text font-semibold">{c.expiryDate}</span>
                          </div>
                        )}

                        {linkedAcc && (
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-2">
                            <Icon name="bank" size={12} />
                            <span className="truncate">Linked: {linkedAcc.name} ({linkedAcc.bankName})</span>
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

                      {/* Card Actions: View Details, Edit, Delete */}
                      <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-border/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewCardDetails(c)}
                          className="gap-1.5 text-xs flex-1 sm:flex-initial"
                        >
                          <Icon name="eye" size={13} />
                          <span>View Details</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditCardId(c.id);
                              setCardForm({
                                name: c.name,
                                bankAccountId: c.bankAccountId || '',
                                cardType: c.cardType,
                                cardNumber: c.cardNumber || `•••• •••• •••• ${c.lastFourDigits}`,
                                expiryDate: c.expiryDate || '',
                                cvv: c.cvv || '',
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
                            onClick={() => handleDeleteCard(c.id, c.name)}
                            aria-label="Delete card"
                          >
                            <Icon name="trash" size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Card Form */}
          <Card className="p-5 h-fit">
            <h3 className="font-semibold text-sm mb-4 text-text flex items-center justify-between">
              <span>{editCardId ? 'Edit Card' : 'Add Bank Card'}</span>
              <span className="text-[11px] font-normal text-muted">Card Standards</span>
            </h3>

            {/* Live Interactive Visual Card Preview */}
            <div
              className="mb-4 p-4 rounded-xl relative overflow-hidden border border-border/80 shadow-md transition-all text-white"
              style={{
                background: cardForm.cardType === 'credit'
                  ? 'linear-gradient(135deg, var(--bg-surface-elevated, var(--bg-surface)) 0%, var(--bg-surface) 60%, var(--color-primary) 150%)'
                  : 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated, var(--bg-surface)) 70%, var(--color-primary) 150%)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 rounded bg-warning-tint border border-warning-solid/30 flex items-center justify-center">
                    <div className="w-4 h-3 border border-warning-solid/40 rounded-sm" />
                  </div>
                  <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                    <path d="M12 19a8.5 8.5 0 0 1 0-12" />
                  </svg>
                </div>
                <Badge tone="primary" size="sm" className="uppercase text-[10px] font-bold tracking-wider">
                  {cardForm.cardNetwork || 'CARD'} · {cardForm.cardType}
                </Badge>
              </div>

              {/* Formatted Number Preview */}
              <div className="font-mono text-base tracking-widest text-white font-bold my-2 select-all">
                {cardForm.cardNumber || (cardForm.lastFourDigits ? `•••• •••• •••• ${cardForm.lastFourDigits}` : '•••• •••• •••• ••••')}
              </div>

              {/* Bottom Row */}
              <div className="flex items-end justify-between mt-3 text-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block">Card Label</span>
                  <span className="font-semibold text-white truncate max-w-[150px] block">
                    {cardForm.name || 'CARD MEMBER'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block">Expires</span>
                  <span className="font-mono font-semibold text-white">
                    {cardForm.expiryDate || 'MM/YY'}
                  </span>
                </div>
              </div>
            </div>

            {cardError && (
              <Alert tone="danger" className="mb-4" onDismiss={() => setCardError('')}>
                {cardError}
              </Alert>
            )}

            <div className="space-y-3.5">
              <Field id="card-name" label="Card Label" hint="e.g. Commercial Visa Platinum, BOC Debit">
                <Input
                  value={cardForm.name}
                  onChange={e => {
                    setCardForm(f => ({ ...f, name: e.target.value }));
                    if (cardError) setCardError('');
                  }}
                  placeholder="e.g. Commercial Visa Platinum"
                />
              </Field>

              {/* Standard 4-digit Spacing Card Number Input */}
              <Field
                id="card-number"
                label="Card Number"
                hint="Auto-spaced 4 digits (standard banking format)"
              >
                <Input
                  maxLength={19}
                  value={cardForm.cardNumber}
                  onChange={e => {
                    const formatted = formatCardNumberInput(e.target.value);
                    const cleanDigits = formatted.replace(/\s+/g, '');
                    const detectedNet = detectCardNetwork(cleanDigits);
                    setCardForm(f => ({
                      ...f,
                      cardNumber: formatted,
                      lastFourDigits: cleanDigits.length >= 4 ? cleanDigits.slice(-4) : f.lastFourDigits,
                      cardNetwork: detectedNet !== 'other' ? detectedNet : f.cardNetwork,
                    }));
                    if (cardError) setCardError('');
                  }}
                  placeholder="4532 1100 2345 6789"
                />
              </Field>

              {/* Expiry Date (MM/YY) and CVC / CVV */}
              <div className="grid grid-cols-2 gap-3">
                <Field id="card-expiry" label="Expiry Date" hint="MM/YY">
                  <Input
                    maxLength={5}
                    value={cardForm.expiryDate}
                    onChange={e => {
                      const formatted = formatExpiryInput(e.target.value);
                      setCardForm(f => ({ ...f, expiryDate: formatted }));
                      if (cardError) setCardError('');
                    }}
                    placeholder="MM/YY"
                  />
                </Field>
                <Field id="card-cvv" label="CVC / CVV" hint="3-4 digits">
                  <Input
                    type="password"
                    maxLength={4}
                    value={cardForm.cvv}
                    onChange={e => {
                      setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }));
                      if (cardError) setCardError('');
                    }}
                    placeholder="•••"
                  />
                </Field>
              </div>

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
                        cardNumber: '',
                        expiryDate: '',
                        cvv: '',
                        lastFourDigits: '',
                        cardNetwork: 'visa',
                        creditLimit: '',
                        currentBalance: '',
                        billingDay: '',
                        dueDay: '',
                      });
                      setCardError('');
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

      {/* 1. View Bank Account Details Modal */}
      {viewAccountDetails && (
        <Modal
          isOpen={!!viewAccountDetails}
          onClose={() => setViewAccountDetails(null)}
          title="Bank Account Specifications"
          size="md"
        >
          <div className="space-y-4">
            {/* Visual Passbook / Digital Account Card */}
            <div
              className="p-5 rounded-xl border border-primary-500/40 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-surface-elevated via-surface to-primary-tint/20"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary-500/20 border border-primary-400/40 flex items-center justify-center text-primary-text">
                    <Icon name="bank" size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight text-white">{viewAccountDetails.bankName}</div>
                    <div className="text-[11px] text-white/70">{viewAccountDetails.name}</div>
                  </div>
                </div>
                <Badge tone="primary" size="sm" className="uppercase text-[10px] font-bold">
                  {viewAccountDetails.accountType || 'savings'}
                </Badge>
              </div>

              {/* Large prominent account number with 1-click copy */}
              <div className="my-3 p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 block mb-0.5">
                    Official Account Number
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-white tracking-widest truncate block">
                    {viewAccountDetails.accountNumber}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(viewAccountDetails.accountNumber, 'modal_acc')}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-1.5 shrink-0"
                >
                  <Icon name={copiedId === 'modal_acc' ? 'check' : 'copy'} size={13} />
                  <span>{copiedId === 'modal_acc' ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              <div className="flex items-end justify-between mt-4 pt-3 border-t border-white/15 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-white/60 block">Available Liquidity</span>
                  <span className="text-base font-bold text-white num">{formatRs(viewAccountDetails.currentBalance)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-white/60 block">Currency</span>
                  <span className="font-semibold text-white">{viewAccountDetails.currency || 'LKR'}</span>
                </div>
              </div>
            </div>

            {/* Industry Banking Specifications Grid */}
            <div className="bg-surface rounded-xl border border-border p-3.5 space-y-2.5 text-xs">
              <div className="font-semibold text-text text-[11px] uppercase tracking-wider text-muted pb-1 border-b border-border">
                Standard Banking Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted block text-[11px]">Bank Name</span>
                  <span className="font-medium text-text">{viewAccountDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Account Type</span>
                  <span className="font-medium text-text capitalize">{viewAccountDetails.accountType || 'Savings'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Branch Name</span>
                  <span className="font-medium text-text">{viewAccountDetails.branch || 'Main Branch'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Branch Code</span>
                  <span className="font-medium text-text font-mono">{viewAccountDetails.branchCode || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">SWIFT / BIC Code</span>
                  <span className="font-medium text-text font-mono">{viewAccountDetails.swiftCode || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Account Holder</span>
                  <span className="font-medium text-text">{viewAccountDetails.name}</span>
                </div>
              </div>
              {viewAccountDetails.notes && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-muted block text-[11px]">Notes / Instructions</span>
                  <span className="font-normal text-text">{viewAccountDetails.notes}</span>
                </div>
              )}
            </div>

            {/* Connected Cards */}
            {(() => {
              const linked = state.cards.filter(c => c.bankAccountId === viewAccountDetails.id);
              if (linked.length === 0) return null;
              return (
                <div className="bg-surface rounded-xl border border-border p-3.5 text-xs">
                  <div className="font-semibold text-text text-[11px] uppercase tracking-wider text-muted mb-2">
                    Linked Payment Cards ({linked.length})
                  </div>
                  <div className="space-y-1.5">
                    {linked.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-hover border border-border/60">
                        <div className="flex items-center gap-2">
                          <Icon name="credit-card" size={14} className="text-primary-text" />
                          <span className="font-medium text-text">{c.name}</span>
                          <span className="text-[10px] text-muted uppercase font-mono">•••• {c.lastFourDigits}</span>
                        </div>
                        <Badge tone="primary" size="sm" className="uppercase text-[9px]">{c.cardType}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button
                variant="primary"
                className="w-full sm:flex-1 gap-1.5 text-xs"
                onClick={() => {
                  const slip = [
                    `Bank: ${viewAccountDetails.bankName}`,
                    `Account Holder: ${viewAccountDetails.name}`,
                    `Account Number: ${viewAccountDetails.accountNumber}`,
                    viewAccountDetails.branch ? `Branch: ${viewAccountDetails.branch}` : '',
                    viewAccountDetails.branchCode ? `Branch Code: ${viewAccountDetails.branchCode}` : '',
                    viewAccountDetails.swiftCode ? `SWIFT / BIC: ${viewAccountDetails.swiftCode}` : '',
                  ].filter(Boolean).join('\n');
                  copyToClipboard(slip, 'transfer_slip');
                }}
              >
                <Icon name={copiedId === 'transfer_slip' ? 'check' : 'copy'} size={14} />
                <span>{copiedId === 'transfer_slip' ? 'Details Copied!' : 'Copy Transfer Details'}</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto text-xs"
                onClick={() => {
                  setEditAccountId(viewAccountDetails.id);
                  setAccountForm({
                    name: viewAccountDetails.name,
                    bankName: viewAccountDetails.bankName,
                    accountNumber: viewAccountDetails.accountNumber,
                    branch: viewAccountDetails.branch || '',
                    branchCode: viewAccountDetails.branchCode || '',
                    swiftCode: viewAccountDetails.swiftCode || '',
                    accountType: viewAccountDetails.accountType || 'savings',
                    currentBalance: String(viewAccountDetails.currentBalance),
                    notes: viewAccountDetails.notes || '',
                  });
                  setViewAccountDetails(null);
                }}
              >
                Edit Account
              </Button>
              <Button
                variant="ghost"
                className="w-full sm:w-auto text-xs"
                onClick={() => setViewAccountDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. View Card Details Modal */}
      {viewCardDetails && (
        <Modal
          isOpen={!!viewCardDetails}
          onClose={() => setViewCardDetails(null)}
          title="Payment Card Specifications"
          size="md"
        >
          <div className="space-y-4">
            {/* Card Mockup */}
            <div
              className="p-5 rounded-xl border border-primary-500/40 text-white shadow-lg relative overflow-hidden"
              style={{
                background: viewCardDetails.cardType === 'credit'
                  ? 'linear-gradient(135deg, var(--bg-surface-elevated, var(--bg-surface)) 0%, var(--bg-surface) 60%, var(--color-primary) 150%)'
                  : 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated, var(--bg-surface)) 70%, var(--color-primary) 150%)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 rounded bg-warning-tint border border-warning-solid/30 flex items-center justify-center">
                    <div className="w-4 h-3 border border-warning-solid/40 rounded-sm" />
                  </div>
                  <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                    <path d="M12 19a8.5 8.5 0 0 1 0-12" />
                  </svg>
                </div>
                <Badge tone="primary" size="sm" className="uppercase text-[10px] font-bold tracking-wider">
                  {viewCardDetails.cardNetwork || 'CARD'} · {viewCardDetails.cardType}
                </Badge>
              </div>

              <div className="font-mono text-base tracking-widest text-white font-bold my-2 select-all">
                •••• •••• •••• {viewCardDetails.lastFourDigits}
              </div>

              <div className="flex items-end justify-between mt-3 text-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block">Cardholder Label</span>
                  <span className="font-semibold text-white truncate max-w-[150px] block">
                    {viewCardDetails.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block">Expires</span>
                  <span className="font-mono font-semibold text-white">
                    {viewCardDetails.expiryDate || '••/••'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Specifications Table */}
            <div className="bg-surface rounded-xl border border-border p-3.5 space-y-2.5 text-xs">
              <div className="font-semibold text-text text-[11px] uppercase tracking-wider text-muted pb-1 border-b border-border">
                Card Attributes
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted block text-[11px]">Card Name</span>
                  <span className="font-medium text-text">{viewCardDetails.name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Card Type</span>
                  <span className="font-medium text-text capitalize">{viewCardDetails.cardType}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Network</span>
                  <span className="font-medium text-text capitalize">{viewCardDetails.cardNetwork || 'Visa'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Last 4 Digits</span>
                  <span className="font-medium font-mono text-text">•••• {viewCardDetails.lastFourDigits}</span>
                </div>
                {viewCardDetails.expiryDate && (
                  <div>
                    <span className="text-muted block text-[11px]">Expiry Date</span>
                    <span className="font-medium font-mono text-text">{viewCardDetails.expiryDate}</span>
                  </div>
                )}
                {viewCardDetails.cardType === 'credit' && (
                  <>
                    <div>
                      <span className="text-muted block text-[11px]">Credit Limit</span>
                      <span className="font-medium text-text num">{viewCardDetails.creditLimit ? formatRs(viewCardDetails.creditLimit) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Billing Day</span>
                      <span className="font-medium text-text">{viewCardDetails.billingDay ? `Day ${viewCardDetails.billingDay}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Payment Due Day</span>
                      <span className="font-medium text-text">{viewCardDetails.dueDay ? `Day ${viewCardDetails.dueDay}` : '—'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditCardId(viewCardDetails.id);
                  setCardForm({
                    name: viewCardDetails.name,
                    bankAccountId: viewCardDetails.bankAccountId || '',
                    cardType: viewCardDetails.cardType,
                    cardNumber: viewCardDetails.cardNumber || `•••• •••• •••• ${viewCardDetails.lastFourDigits}`,
                    expiryDate: viewCardDetails.expiryDate || '',
                    cvv: viewCardDetails.cvv || '',
                    lastFourDigits: viewCardDetails.lastFourDigits,
                    cardNetwork: viewCardDetails.cardNetwork || 'visa',
                    creditLimit: viewCardDetails.creditLimit ? String(viewCardDetails.creditLimit) : '',
                    currentBalance: viewCardDetails.currentBalance ? String(viewCardDetails.currentBalance) : '',
                    billingDay: viewCardDetails.billingDay ? String(viewCardDetails.billingDay) : '',
                    dueDay: viewCardDetails.dueDay ? String(viewCardDetails.dueDay) : '',
                  });
                  setViewCardDetails(null);
                }}
              >
                Edit Card
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewCardDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}


    </div>
  );
}
