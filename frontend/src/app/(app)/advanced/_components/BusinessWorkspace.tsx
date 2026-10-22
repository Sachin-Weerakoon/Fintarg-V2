'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp, formatRs } from '@/store';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField, FormGrid } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyField } from '@/components/ui/MoneyField';
import { DateField } from '@/components/ui/DateField';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import type { BusinessBranch, BranchEntry, SavingsGoal } from '@/types';
import { SalaryWorkspace } from './SalaryWorkspace';
import { AgreementsTab } from './AgreementsTab';
import { getLocalDate } from '@/utils/date';

type BranchTab = 'overview' | 'finances' | 'salary' | 'targets' | 'agreements' | 'letters';

export function BusinessWorkspace() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams?.get('companyId');

  const [companyId, setCompanyId] = useState(
    urlCompanyId && state.companies.some(c => c.id === urlCompanyId)
      ? urlCompanyId
      : state.companies[0]?.id || ''
  );

  useEffect(() => {
    if (urlCompanyId && state.companies.some(c => c.id === urlCompanyId) && urlCompanyId !== companyId) {
      setCompanyId(urlCompanyId);
      const firstBr = state.businessBranches.find(b => b.companyId === urlCompanyId);
      setBranchId(firstBr?.id || '');
    }
  }, [urlCompanyId, state.companies, companyId]);

  const selectedCompany = state.companies.find(c => c.id === companyId) || state.companies[0];
  const companyBranches = state.businessBranches.filter(b => b.companyId === (selectedCompany?.id || companyId));
  const [branchId, setBranchId] = useState(companyBranches[0]?.id || '');
  const branch = state.businessBranches.find(b => b.id === branchId && b.companyId === (selectedCompany?.id || companyId)) || companyBranches[0];

  const [activeTab, setActiveTab] = useState<BranchTab>('overview');
  const [financeSubTab, setFinanceSubTab] = useState<'inflows' | 'costs' | 'expenses'>('inflows');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);

  // Quick sales
  const [quickSales, setQuickSales] = useState('');
  const [quickSalesNote, setQuickSalesNote] = useState('');

  // Cost entry form
  const [costAmount, setCostAmount] = useState('');
  const [costCategory, setCostCategory] = useState('Electricity');
  const [costNote, setCostNote] = useState('');
  const [costDate, setCostDate] = useState(getLocalDate());

  // Income entry form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeDate, setIncomeDate] = useState(getLocalDate());

  // Company Form
  const [businessForm, setBusinessForm] = useState({
    name: '',
    brNumber: '',
    tinNumber: '',
    entityType: 'pvt_ltd',
    sector: 'Technology & IT',
    address: '',
    contact: '',
  });

  // Branch Form
  const [branchForm, setBranchForm] = useState({
    name: '',
    branchType: 'Retail Outlet',
    location: '',
    monthlyTarget: '',
  });

  const addBusiness = async () => {
    if (!businessForm.name.trim()) {
      showToast('Please enter a company name.', 'error');
      return;
    }
    const localId = 'co_' + Date.now();
    const serverId = await dispatch({
      type: 'ADD_COMPANY',
      entry: { id: localId, ...businessForm, email: '', logo: '' },
    });
    setCompanyId(serverId || localId);
    setShowBusinessForm(false);
    setBusinessForm({
      name: '',
      brNumber: '',
      tinNumber: '',
      entityType: 'pvt_ltd',
      sector: 'Technology & IT',
      address: '',
      contact: '',
    });
    showToast('Company created.', 'success');
  };

  const addBranch = async () => {
    if (!branchForm.name.trim() || !companyId) {
      showToast('Branch name and company selection are required.', 'error');
      return;
    }
    const targetVal = Number(branchForm.monthlyTarget) || 0;
    const newBranch: BusinessBranch = {
      id: 'br_' + Date.now(),
      companyId,
      name: branchForm.name.trim(),
      branchType: branchForm.branchType.trim(),
      location: branchForm.location.trim(),
      monthlyTarget: targetVal,
      annualTarget: targetVal * 12,
      entries: [],
    };
    dispatch({ type: 'ADD_BRANCH', entry: newBranch });
    setBranchId(newBranch.id);
    setShowBranchForm(false);
    setBranchForm({ name: '', branchType: 'Retail Outlet', location: '', monthlyTarget: '' });
    showToast('Branch registered.', 'success');
  };

  // Branch Milestone Goal Form
  const [showBranchGoalForm, setShowBranchGoalForm] = useState(false);
  const [branchGoalName, setBranchGoalName] = useState('');
  const [branchGoalAmount, setBranchGoalAmount] = useState('');
  const [branchGoalDate, setBranchGoalDate] = useState('');
  const [branchGoalType, setBranchGoalType] = useState('expansion');

  const addBranchGoal = () => {
    if (!branchGoalName.trim() || !branchGoalAmount || !branch) {
      showToast('Please enter a goal title and target amount.', 'error');
      return;
    }
    const amt = Number(branchGoalAmount) || 0;
    const goalId = 'g_' + Date.now();
    dispatch({
      type: 'ADD_GOAL',
      entry: {
        id: goalId,
        name: branchGoalName.trim(),
        dailyAmount: Math.ceil(amt / 90),
        monthlyTarget: Math.ceil(amt / 3),
        targetAmount: amt,
        targetDate: branchGoalDate || undefined,
        endDate: branchGoalDate || getLocalDate(),
        savedAmount: 0,
        contributions: [],
        scope: 'branch',
        companyId: branch.companyId,
        branchId: branch.id,
        targetType: branchGoalType as SavingsGoal['targetType'],
      },
    });
    setBranchGoalName('');
    setBranchGoalAmount('');
    setBranchGoalDate('');
    setShowBranchGoalForm(false);
    showToast('Branch milestone goal created.', 'success');
  };

  const recordSales = () => {
    const amt = Number(quickSales) || 0;
    if (amt <= 0 || !branch) {
      showToast('Please enter a valid sales amount.', 'error');
      return;
    }
    const newEntry: BranchEntry = {
      id: 'entry_' + Date.now(),
      date: getLocalDate(),
      type: 'revenue',
      category: 'Daily Sales',
      amount: amt,
      note: quickSalesNote.trim() || 'Daily revenue',
    };
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: {
        ...branch,
        entries: [newEntry, ...branch.entries],
      },
    });
    setQuickSales('');
    setQuickSalesNote('');
    showToast('Revenue recorded.', 'success');
  };

  const recordIncome = () => {
    const amt = Number(incomeAmount) || 0;
    if (amt <= 0 || !branch) {
      showToast('Please enter a valid income amount.', 'error');
      return;
    }
    const newEntry: BranchEntry = {
      id: 'entry_' + Date.now(),
      date: incomeDate,
      type: 'revenue',
      category: 'Operating Inflow',
      amount: amt,
      note: incomeNote.trim() || 'Commercial revenue',
    };
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: {
        ...branch,
        entries: [newEntry, ...branch.entries],
      },
    });
    setIncomeAmount('');
    setIncomeNote('');
    showToast('Inflow recorded.', 'success');
  };

  const recordCost = () => {
    const amt = Number(costAmount) || 0;
    if (amt <= 0 || !branch) {
      showToast('Please enter a valid cost amount.', 'error');
      return;
    }
    const isUtility = ['Electricity', 'Water', 'Internet', 'Phone'].includes(costCategory);
    const newEntry: BranchEntry = {
      id: 'entry_' + Date.now(),
      date: costDate,
      type: isUtility ? 'utility' : 'other-cost',
      category: costCategory,
      amount: amt,
      note: costNote.trim() || costCategory,
    };
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: {
        ...branch,
        entries: [newEntry, ...branch.entries],
      },
    });
    setCostAmount('');
    setCostNote('');
    showToast('Operating cost recorded.', 'success');
  };

  const deleteEntry = async (entryId: string) => {
    if (!branch) return;
    const ok = await confirm({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this ledger entry?',
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (ok) {
      dispatch({
        type: 'UPDATE_BRANCH',
        entry: {
          ...branch,
          entries: branch.entries.filter(e => e.id !== entryId),
        },
      });
      showToast('Entry removed.', 'info');
    }
  };

  // Branch statistics
  const currentMonth = state.selectedMonth;
  const branchEntries = branch?.entries || [];
  const monthlyRevenue = branchEntries
    .filter(e => e.type === 'revenue' && e.date.startsWith(currentMonth))
    .reduce((s, e) => s + e.amount, 0);
  const monthlyCosts = branchEntries
    .filter(e => e.type !== 'revenue' && e.date.startsWith(currentMonth))
    .reduce((s, e) => s + e.amount, 0);
  const netProfit = monthlyRevenue - monthlyCosts;
  const target = branch?.monthlyTarget || 0;
  const targetPct = target > 0 ? Math.min(100, Math.round((monthlyRevenue / target) * 100)) : 0;

  const tabOptions = [
    { id: 'overview' as BranchTab, label: 'Outlets & Sales' },
    { id: 'finances' as BranchTab, label: 'Finances & Ledger' },
    { id: 'salary' as BranchTab, label: 'Salary & Compensation' },
    { id: 'targets' as BranchTab, label: 'Goals & Targets' },
    { id: 'agreements' as BranchTab, label: 'Contracts' },
    { id: 'letters' as BranchTab, label: 'Official Letters' },
  ];

  return (
    <div className="space-y-6">
      {/* Company & Branch Selector Toolbar */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid sm:grid-cols-2 gap-4 flex-1">
            <FormField id="company-selector" label="Enterprise Company">
              <Select
                id="company-selector"
                value={companyId}
                onChange={e => {
                  setCompanyId(e.target.value);
                  const firstBr = state.businessBranches.find(b => b.companyId === e.target.value);
                  setBranchId(firstBr?.id || '');
                }}
              >
                {state.companies.length === 0 ? (
                  <option value="">No registered companies</option>
                ) : (
                  state.companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </Select>
            </FormField>

            <FormField id="branch-selector" label="Operating Branch">
              <Select
                id="branch-selector"
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                disabled={companyBranches.length === 0}
              >
                {companyBranches.length === 0 ? (
                  <option value="">No branches in this company</option>
                ) : (
                  companyBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.location || 'HQ'}
                    </option>
                  ))
                )}
              </Select>
            </FormField>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            {selectedCompany && (
              <Link href={`/analysis?scope=company&companyId=${selectedCompany.id}`}>
                <Button variant="secondary" size="md" iconLeft={<Icon name="analysis" size={14} />}>
                  Analyze Business
                </Button>
              </Link>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowBusinessForm(v => !v)}
              iconLeft={<Icon name="plus" size={14} />}
            >
              New Company
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowBranchForm(v => !v)}
              disabled={!companyId}
              iconLeft={<Icon name="plus" size={14} />}
            >
              New Branch
            </Button>
          </div>
        </div>

        {/* New Company Drawer */}
        {showBusinessForm && (
          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <h4 className="text-sm font-bold text-text">Register Enterprise Company</h4>
            <FormGrid columns={2}>
              <FormField id="new-comp-name" label="Legal Company Name *" required>
                <Input
                  id="new-comp-name"
                  placeholder="e.g. Colombo Agro Exports (Pvt) Ltd"
                  value={businessForm.name}
                  onChange={e => setBusinessForm(f => ({ ...f, name: e.target.value }))}
                />
              </FormField>

              <FormField id="new-comp-br" label="BR Number">
                <Input
                  id="new-comp-br"
                  placeholder="PV 00219481"
                  value={businessForm.brNumber}
                  onChange={e => setBusinessForm(f => ({ ...f, brNumber: e.target.value }))}
                />
              </FormField>

              <FormField id="new-comp-addr" label="Address">
                <Input
                  id="new-comp-addr"
                  placeholder="Colombo 03"
                  value={businessForm.address}
                  onChange={e => setBusinessForm(f => ({ ...f, address: e.target.value }))}
                />
              </FormField>

              <FormField id="new-comp-contact" label="Contact Mobile">
                <Input
                  id="new-comp-contact"
                  placeholder="+94 11 234 5678"
                  value={businessForm.contact}
                  onChange={e => setBusinessForm(f => ({ ...f, contact: e.target.value }))}
                />
              </FormField>
            </FormGrid>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowBusinessForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={addBusiness}>
                Save Company
              </Button>
            </div>
          </div>
        )}

        {/* New Branch Drawer */}
        {showBranchForm && (
          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <h4 className="text-sm font-bold text-text">Add Operating Branch</h4>
            <FormGrid columns={2}>
              <FormField id="new-br-name" label="Branch Name *" required>
                <Input
                  id="new-br-name"
                  placeholder="e.g. Kandy Central Branch, Outlet 02"
                  value={branchForm.name}
                  onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))}
                />
              </FormField>

              <FormField id="new-br-type" label="Branch Type">
                <Select
                  id="new-br-type"
                  value={branchForm.branchType}
                  onChange={e => setBranchForm(f => ({ ...f, branchType: e.target.value }))}
                >
                  <option value="Retail Outlet">Retail Outlet</option>
                  <option value="Warehouse / Hub">Warehouse</option>
                  <option value="Service Center">Service Center</option>
                  <option value="Online / E-Commerce">Online</option>
                </Select>
              </FormField>

              <FormField id="new-br-loc" label="Location">
                <Input
                  id="new-br-loc"
                  placeholder="e.g. Peradeniya Road, Kandy"
                  value={branchForm.location}
                  onChange={e => setBranchForm(f => ({ ...f, location: e.target.value }))}
                />
              </FormField>

              <FormField id="new-br-target" label="Monthly Revenue Target">
                <MoneyField
                  id="new-br-target"
                  value={branchForm.monthlyTarget}
                  onChange={v => setBranchForm(f => ({ ...f, monthlyTarget: String(v) }))}
                  placeholder="e.g. 500,000"
                />
              </FormField>
            </FormGrid>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowBranchForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={addBranch}>
                Save Branch
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Enterprise Company Overview & Financial Intelligence Banner */}
      {selectedCompany && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-tint/60 via-surface to-surface border border-primary/25 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                <Icon name="briefcase" size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-primary-text">Business Entity</span>
                  <h3 className="font-extrabold text-base text-text">{selectedCompany.name}</h3>
                  {selectedCompany.entityType && (
                    <Badge tone="primary" size="sm">
                      {selectedCompany.entityType.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  )}
                  {selectedCompany.brNumber && (
                    <Badge tone="neutral" size="sm">
                      BR: {selectedCompany.brNumber}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span>
                    {companyBranches.length} {companyBranches.length === 1 ? 'operating outlet / branch' : 'operating outlets / branches'}
                  </span>
                  {selectedCompany.address && <span>· {selectedCompany.address}</span>}
                  {selectedCompany.contact && <span>· {selectedCompany.contact}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link href={`/analysis?scope=company&companyId=${selectedCompany.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Icon name="analysis" size={14} />}
                  iconRight={<Icon name="chevron-right" size={13} />}
                  className="font-bold shadow-sm"
                >
                  View Business Analysis & Waterfall
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {branch ? (
        <>
          {/* Branch Analytics Deep-Link Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-tint text-primary-text flex items-center justify-center">
                <Icon name="bank" size={18} />
              </span>
              <div>
                <div className="font-bold text-sm text-text flex items-center gap-2">
                  <span>{branch.name}</span>
                  <Badge tone="primary">{branch.branchType || 'Outlet'}</Badge>
                </div>
                <div className="text-xs text-muted">{branch.location || 'Headquarters'}</div>
              </div>
            </div>

            <Link href={`/analysis?scope=branch&companyId=${companyId}&branchId=${branch.id}`}>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="analysis" size={14} />} iconRight={<Icon name="chevron-right" size={13} />}>
                Detailed Branch Analytics & Pacing
              </Button>
            </Link>
          </div>

          {/* Key Branch Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Branch Revenue"
              value={formatRs(monthlyRevenue)}
              detail={`for ${currentMonth}`}
              tone="success"
              icon={<Icon name="arrow-up" size={18} />}
            />
            <StatCard
              label="Operational Costs"
              value={formatRs(monthlyCosts)}
              detail="Total branch overheads"
              tone={monthlyCosts > monthlyRevenue ? 'danger' : 'warning'}
              icon={<Icon name="arrow-down" size={18} />}
            />
            <StatCard
              label="Operating Profit"
              value={formatRs(netProfit)}
              detail={netProfit >= 0 ? 'Surplus buffer' : 'Operating shortfall'}
              tone={netProfit >= 0 ? 'success' : 'danger'}
              icon={<Icon name="wallet" size={18} />}
            />
            <StatCard
              label="Target Progress"
              value={`${targetPct}%`}
              detail={target > 0 ? `Target ${formatRs(target)}` : 'No target set'}
              tone={targetPct >= 100 ? 'success' : 'default'}
              icon={<Icon name="target" size={18} />}
            />
          </div>

          {/* Sub-tab Navigation */}
          <SegmentedTabs options={tabOptions} value={activeTab} onChange={setActiveTab} />

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Record Sales Strip */}
              <Card className="p-6">
                <h4 className="text-sm font-bold text-text mb-3">Quick Record Daily Sales</h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <MoneyField
                      placeholder="Enter today's sales amount (Rs.)"
                      value={quickSales}
                      onChange={v => setQuickSales(String(v))}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      placeholder="Note / Payment mode (optional)"
                      value={quickSalesNote}
                      onChange={e => setQuickSalesNote(e.target.value)}
                    />
                  </div>
                  <Button variant="primary" onClick={recordSales} className="w-full sm:w-auto shrink-0">
                    Record Sales
                  </Button>
                </div>
              </Card>

              {/* Target Achievement Bar */}
              {target > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-text">Revenue Target Goal</h4>
                      <p className="text-xs text-muted">
                        Achieved {formatRs(monthlyRevenue)} of {formatRs(target)} monthly target
                      </p>
                    </div>
                    <Badge tone={targetPct >= 100 ? 'success' : 'neutral'} size="sm">
                      {targetPct}% achieved
                    </Badge>
                  </div>
                  <ProgressBar value={targetPct} max={100} />
                </Card>
              )}

              {/* Recent Activity Ledger */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text">Recent Ledger Activity</h4>
                  <Badge tone="neutral" size="sm">
                    {branchEntries.length} entries
                  </Badge>
                </div>

                {branchEntries.length === 0 ? (
                  <EmptyState
                    title="No records in branch ledger"
                    helper="Record daily sales or operational costs to see ledger entries here."
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-2">
                    {branchEntries.slice(0, 8).map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-text flex items-center gap-2">
                            <span>{entry.category}</span>
                            <Badge tone={entry.type === 'revenue' ? 'success' : 'danger'} size="sm">
                              {entry.type === 'revenue' ? 'Inflow' : 'Cost'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted">
                            {entry.date} {entry.note ? `· ${entry.note}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold num ${
                              entry.type === 'revenue' ? 'text-success-text' : 'text-danger-text'
                            }`}
                          >
                            {entry.type === 'revenue' ? '+' : '-'}
                            {formatRs(entry.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(entry.id)}
                            className="!text-danger-text hover:!bg-danger-tint !p-1"
                            iconLeft={<Icon name="trash" size={14} />}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab 2: Finances & Ledger (Entire Business & Branches) */}
          {activeTab === 'finances' && (
            <div className="space-y-6">
              {/* Finance sub-navigation and link to main ledger */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SegmentedTabs
                  size="sm"
                  options={[
                    { id: 'inflows', label: 'Commercial Inflows' },
                    { id: 'costs', label: 'Branch Costs & Utilities' },
                    { id: 'expenses', label: `Logged Operating Expenses (${state.expenses.filter(e => e.companyId === selectedCompany?.id).length})` },
                  ]}
                  value={financeSubTab}
                  onChange={v => setFinanceSubTab(v as any)}
                />

                <Link href={`/financial?stream=business`}>
                  <Button variant="secondary" size="sm" iconLeft={<Icon name="financial" size={13} />}>
                    Open Main Financial Ledger
                  </Button>
                </Link>
              </div>

              {/* Sub-view: Commercial Inflows */}
              {financeSubTab === 'inflows' && (
                <div className="space-y-6">
                  <Card className="p-6 space-y-4">
                    <h4 className="text-sm font-bold text-text">Log Commercial Inflow</h4>
                    <FormGrid columns={3}>
                      <FormField id="inc-date" label="Date">
                        <DateField id="inc-date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} />
                      </FormField>
                      <FormField id="inc-amt" label="Amount" required>
                        <MoneyField
                          id="inc-amt"
                          placeholder="e.g. 150,000"
                          value={incomeAmount}
                          onChange={v => setIncomeAmount(String(v))}
                        />
                      </FormField>
                      <FormField id="inc-note" label="Customer Note">
                        <Input
                          id="inc-note"
                          placeholder="Invoice #048, Client payment"
                          value={incomeNote}
                          onChange={e => setIncomeNote(e.target.value)}
                        />
                      </FormField>
                    </FormGrid>
                    <div className="flex justify-end pt-2">
                      <Button variant="primary" onClick={recordIncome}>
                        Save Inflow
                      </Button>
                    </div>
                  </Card>

                  {/* Inflows List */}
                  <Card className="p-6 space-y-3">
                    <h4 className="text-sm font-bold text-text">Inflow History</h4>
                    {branchEntries.filter(e => e.type === 'revenue').length === 0 ? (
                      <EmptyState title="No inflows recorded" helper="Revenue transactions logged for this branch will appear here." className="py-8" />
                    ) : (
                      <div className="space-y-2">
                        {branchEntries
                          .filter(e => e.type === 'revenue')
                          .map(e => (
                            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                              <div>
                                <div className="text-xs font-semibold text-text">{e.category}</div>
                                <div className="text-[11px] text-muted">{e.date} · {e.note || 'No note'}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-success-text num">+{formatRs(e.amount)}</span>
                                <Button variant="ghost" size="sm" onClick={() => deleteEntry(e.id)} className="!text-danger-text hover:!bg-danger-tint" iconLeft={<Icon name="trash" size={14} />} />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Sub-view: Costs & Utilities */}
              {financeSubTab === 'costs' && (
                <div className="space-y-6">
                  <Card className="p-6 space-y-4">
                    <h4 className="text-sm font-bold text-text">Log Operational Expense or Utility Bill</h4>
                    <FormGrid columns={3}>
                      <FormField id="cost-cat" label="Expense Category">
                        <Select id="cost-cat" value={costCategory} onChange={e => setCostCategory(e.target.value)}>
                          <option value="Electricity">Electricity Bill</option>
                          <option value="Water">Water Supply</option>
                          <option value="Rent">Shop Rent</option>
                          <option value="Inventory">Raw Materials</option>
                          <option value="Salaries">Branch Staff Salaries</option>
                          <option value="Logistics">Logistics & Transport</option>
                          <option value="Marketing">Advertising & Marketing</option>
                          <option value="Other">Other Operating Cost</option>
                        </Select>
                      </FormField>
                      <FormField id="cost-amt" label="Amount" required>
                        <MoneyField
                          id="cost-amt"
                          placeholder="e.g. 35,000"
                          value={costAmount}
                          onChange={v => setCostAmount(String(v))}
                        />
                      </FormField>
                      <FormField id="cost-date" label="Date Incurred">
                        <DateField id="cost-date" value={costDate} onChange={e => setCostDate(e.target.value)} />
                      </FormField>
                      <div className="md:col-span-3">
                        <FormField id="cost-note" label="Bill Note">
                          <Input
                            id="cost-note"
                            placeholder="Account number, month, or receipt notes"
                            value={costNote}
                            onChange={e => setCostNote(e.target.value)}
                          />
                        </FormField>
                      </div>
                    </FormGrid>
                    <div className="flex justify-end pt-2">
                      <Button variant="danger" onClick={recordCost}>
                        Save Cost Entry
                      </Button>
                    </div>
                  </Card>

                  {/* Costs List */}
                  <Card className="p-6 space-y-3">
                    <h4 className="text-sm font-bold text-text">Operational Costs History</h4>
                    {branchEntries.filter(e => e.type !== 'revenue').length === 0 ? (
                      <EmptyState title="No costs logged" helper="Operating overheads and bill payments will appear here." className="py-8" />
                    ) : (
                      <div className="space-y-2">
                        {branchEntries
                          .filter(e => e.type !== 'revenue')
                          .map(e => (
                            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                              <div>
                                <div className="text-xs font-semibold text-text">{e.category}</div>
                                <div className="text-[11px] text-muted">{e.date} · {e.note || 'No note'}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-danger-text num">-{formatRs(e.amount)}</span>
                                <Button variant="ghost" size="sm" onClick={() => deleteEntry(e.id)} className="!text-danger-text hover:!bg-danger-tint" iconLeft={<Icon name="trash" size={14} />} />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Sub-view: Cross-synced expenses from /financial */}
              {financeSubTab === 'expenses' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-text">Cross-Ledger Business Expenses</h4>
                      <p className="text-xs text-muted">
                        Expenses paid out from {selectedCompany?.name}&apos;s operating cash logged via the Financial Hub.
                      </p>
                    </div>
                    <Link href="/financial?tab=expenses&stream=business">
                      <Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={13} />}>
                        Record Expense
                      </Button>
                    </Link>
                  </div>

                  {state.expenses.filter(e => e.companyId === selectedCompany?.id).length === 0 ? (
                    <EmptyState
                      title="No business expenses logged"
                      helper="When logging expenses in the Financial Ledger with 'Business Cash', they will automatically appear here."
                      className="py-8"
                    />
                  ) : (
                    <div className="space-y-2">
                      {state.expenses.filter(e => e.companyId === selectedCompany?.id).slice().reverse().map(e => {
                        const br = state.businessBranches.find(b => b.id === e.branchId);
                        return (
                          <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                            <div>
                              <div className="text-xs font-semibold text-text flex items-center gap-2">
                                <span>{e.category}</span>
                                {br && <Badge tone="primary" size="sm">{br.name}</Badge>}
                              </div>
                              <div className="text-[11px] text-muted">{e.date} · {e.note || (e.paymentMethod || 'cash').replace('_', ' ')}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-danger-text num">-{formatRs(e.amount)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  dispatch({ type: 'DELETE_EXPENSE', id: e.id });
                                  showToast('Expense removed from business ledger', 'info');
                                }}
                                className="!text-danger-text hover:!bg-danger-tint !p-1"
                                iconLeft={<Icon name="trash" size={14} />}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Salary, Payday & Director Compensation */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <SalaryWorkspace companyName={selectedCompany?.name} companyId={selectedCompany?.id} />
            </div>
          )}

          {/* Tab 4: Targets */}
          {activeTab === 'targets' && (() => {
            const daysInMonth = 30;
            const todayDate = new Date();
            const currentDay = todayDate.getDate();
            const daysRemaining = Math.max(1, daysInMonth - currentDay);
            const shortfall = Math.max(0, target - monthlyRevenue);
            const requiredDailyPace = Math.ceil(shortfall / daysRemaining);
            const currentDailyPace = currentDay > 0 ? Math.round(monthlyRevenue / currentDay) : 0;
            const pacingStatus =
              target === 0
                ? 'no-target'
                : monthlyRevenue >= target
                ? 'achieved'
                : currentDailyPace >= requiredDailyPace
                ? 'on-track'
                : 'behind';

            const branchMilestoneGoals = (state.savingsGoals || []).filter(
              g => g.scope === 'branch' && g.branchId === branch.id
            );

            return (
              <div className="space-y-6">
                {/* 1. Branch Revenue Target & Daily Run-Rate */}
                <Card className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-text flex items-center gap-2">
                        <span>Branch Revenue Benchmark & Daily Run-Rate</span>
                        <Badge
                          tone={
                            pacingStatus === 'achieved'
                              ? 'success'
                              : pacingStatus === 'on-track'
                              ? 'primary'
                              : pacingStatus === 'behind'
                              ? 'danger'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {pacingStatus === 'achieved'
                            ? 'Target Achieved'
                            : pacingStatus === 'on-track'
                            ? 'Pacing On Track'
                            : pacingStatus === 'behind'
                            ? 'Behind Run-Rate'
                            : 'No Target'}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        Define monthly benchmark to monitor outlet sales throughput and run-rate pacing.
                      </p>
                    </div>

                    <Link href={`/goals?domain=branch&companyId=${companyId}&branchId=${branch.id}`}>
                      <Button variant="ghost" size="sm" iconLeft={<Icon name="target" size={14} />}>
                        Manage In Goals Hub →
                      </Button>
                    </Link>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl border border-border bg-surface-hover/50">
                      <div className="text-[11px] text-muted mb-1">Monthly Target Ceiling</div>
                      <MoneyField
                        id="br-target-input"
                        value={target}
                        onChange={v => {
                          dispatch({
                            type: 'UPDATE_BRANCH',
                            entry: { ...branch, monthlyTarget: Number(v) || 0, annualTarget: (Number(v) || 0) * 12 },
                          });
                          showToast('Monthly target updated.', 'success');
                        }}
                      />
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-surface-hover/50 flex flex-col justify-between">
                      <div className="text-[11px] text-muted">Achieved Inflows</div>
                      <div className="text-lg font-bold text-success-text num">{formatRs(monthlyRevenue)}</div>
                      <div className="text-[11px] text-muted">{currentDay} days recorded</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-surface-hover/50 flex flex-col justify-between">
                      <div className="text-[11px] text-muted">Actual Daily Pace</div>
                      <div className="text-lg font-bold text-text num">{formatRs(currentDailyPace)}/day</div>
                      <div className="text-[11px] text-muted">Average daily revenue</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-surface-hover/50 flex flex-col justify-between">
                      <div className="text-[11px] text-muted">Required Daily Pace</div>
                      <div className={`text-lg font-bold num ${shortfall > 0 && requiredDailyPace > currentDailyPace ? 'text-warning-text' : 'text-primary-text'}`}>
                        {shortfall > 0 ? `${formatRs(requiredDailyPace)}/day` : 'Target Met!'}
                      </div>
                      <div className="text-[11px] text-muted">{daysRemaining} days remaining</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-text">Month Completion Pace</span>
                      <span className="text-xs font-bold text-primary-text num">{targetPct}%</span>
                    </div>
                    <ProgressBar value={targetPct} max={100} tone={targetPct >= 100 ? 'success' : 'primary'} />
                    <p className="text-xs text-muted mt-2.5">
                      {targetPct >= 100
                        ? 'Target achieved! Outstanding commercial performance for this branch.'
                        : `Requires ${formatRs(shortfall)} more over the next ${daysRemaining} days (${formatRs(requiredDailyPace)}/day) to hit monthly ceiling.`}
                    </p>
                  </div>
                </Card>

                {/* 2. Branch Milestone & Equipment Goals */}
                <Card className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-text">Branch Unit Milestones & Equipment Funds</h4>
                      <p className="text-xs text-muted mt-0.5">
                        Specific capital projects, equipment upgrades, and local sales milestones for {branch.name}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft={<Icon name="plus" size={14} />}
                      onClick={() => setShowBranchGoalForm(v => !v)}
                    >
                      {showBranchGoalForm ? 'Cancel' : 'New Milestone Goal'}
                    </Button>
                  </div>

                  {/* Add Branch Goal Inline Drawer */}
                  {showBranchGoalForm && (
                    <div className="p-4 rounded-2xl border border-primary/25 bg-primary-tint/20 space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-primary-text">Create Branch Milestone Goal</h5>
                      <FormGrid columns={3}>
                        <FormField id="br-goal-name" label="Goal Title *" required>
                          <Input
                            id="br-goal-name"
                            placeholder="e.g. Store Renovation, New POS Terminal"
                            value={branchGoalName}
                            onChange={e => setBranchGoalName(e.target.value)}
                          />
                        </FormField>
                        <FormField id="br-goal-amt" label="Target Total" required>
                          <MoneyField
                            id="br-goal-amt"
                            placeholder="e.g. 350,000"
                            value={branchGoalAmount}
                            onChange={v => setBranchGoalAmount(String(v))}
                          />
                        </FormField>
                        <FormField id="br-goal-date" label="Target Date">
                          <DateField
                            id="br-goal-date"
                            value={branchGoalDate}
                            onChange={e => setBranchGoalDate(e.target.value)}
                          />
                        </FormField>
                      </FormGrid>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => setShowBranchGoalForm(false)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={addBranchGoal}>
                          Save Branch Goal
                        </Button>
                      </div>
                    </div>
                  )}

                  {branchMilestoneGoals.length === 0 ? (
                    <EmptyState
                      title="No milestone goals for this branch yet"
                      helper="Create renovation, hardware, or peak month milestones to track alongside daily revenue."
                      className="py-6"
                    />
                  ) : (
                    <div className="space-y-3">
                      {branchMilestoneGoals.map(goal => {
                        const effectiveTarget = goal.targetAmount || goal.monthlyTarget;
                        const pct = Math.min(100, Math.round((goal.savedAmount / (effectiveTarget || 1)) * 100));
                        return (
                          <div
                            key={goal.id}
                            className="p-4 rounded-xl border border-border bg-surface-hover/30 hover:bg-surface-hover transition-colors space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <span className="font-bold text-sm text-text">{goal.name}</span>
                                {goal.targetDate && (
                                  <span className="text-xs text-muted ml-2">Due: {goal.targetDate}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-primary-text num">{formatRs(goal.savedAmount)}</span>
                                <span className="text-xs text-muted num"> / {formatRs(effectiveTarget)}</span>
                              </div>
                            </div>
                            <ProgressBar value={goal.savedAmount} max={effectiveTarget} tone={pct >= 100 ? 'success' : 'primary'} />
                            <div className="flex items-center justify-between text-xs text-muted">
                              <span>{pct}% funded</span>
                              <Link href={`/goals?domain=branch&companyId=${companyId}&branchId=${branch.id}`}>
                                <span className="text-primary-text font-semibold hover:underline">Manage / Fund →</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* 3. Corporate Enterprise Target Reference Card */}
                {selectedCompany && (
                  <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0">
                        <Icon name="briefcase" size={16} />
                      </span>
                      <div>
                        <div className="font-bold text-xs text-text flex items-center gap-2">
                          <span>{selectedCompany.name} Corporate Revenue Benchmark:</span>
                          <span className="text-primary-text font-extrabold num">
                            {(selectedCompany.monthlyRevenueTarget ?? 0) > 0 ? formatRs(selectedCompany.monthlyRevenueTarget!) : 'Not configured'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          Set company-wide revenue milestones and corporate reserve funds in the Goals Hub.
                        </p>
                      </div>
                    </div>

                    <Link href={`/goals?domain=business&companyId=${companyId}`}>
                      <Button variant="secondary" size="sm" iconLeft={<Icon name="briefcase" size={13} />}>
                        Configure Corporate Goals
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab 5: Agreements & Legal Contracts */}
          {activeTab === 'agreements' && (
            <div className="space-y-6">
              <AgreementsTab companyId={selectedCompany?.id} />
            </div>
          )}

          {/* Tab 6: Formal Letters & Notices */}
          {activeTab === 'letters' && (() => {
            const companyLetters = state.letters.filter(l => l.companyId === selectedCompany?.id);
            return (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-text flex items-center gap-2">
                        <span>Corporate Formal Letters & Official Notices</span>
                        <Badge tone="primary" size="sm">{companyLetters.length} issued</Badge>
                      </h4>
                      <p className="text-xs text-muted mt-1">
                        Draft, export, and manage official business correspondence printed with {selectedCompany?.name || 'the enterprise'}&apos;s legal letterhead (BR: {selectedCompany?.brNumber || 'Pending'}, TIN: {selectedCompany?.tinNumber || 'Pending'}).
                      </p>
                    </div>

                    <Link href={`/advanced/letters?companyId=${selectedCompany?.id}`}>
                      <Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={14} />}>
                        Draft Formal Letter
                      </Button>
                    </Link>
                  </div>
                </Card>

                {companyLetters.length === 0 ? (
                  <EmptyState
                    icon={<Icon name="documents" size={28} />}
                    title={`No formal letters issued for ${selectedCompany?.name || 'this company'}`}
                    helper="Generate bank inquiries, formal quotations, proof of business letters, or corporate resolutions with official Sri Lankan business letterhead."
                    action={
                      <Link href={`/advanced/letters?companyId=${selectedCompany?.id}`}>
                        <Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={14} />}>
                          Draft Formal Letter
                        </Button>
                      </Link>
                    }
                    className="py-12"
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {companyLetters.map(letter => (
                      <Card key={letter.id} className="p-5 flex flex-col justify-between hover:border-primary-300 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone={letter.type === 'bank' ? 'primary' : letter.type === 'offer' ? 'success' : 'neutral'} size="sm">
                              {letter.type === 'bank' ? 'Bank Letter' : letter.type === 'offer' ? 'Offer / Quotation' : 'General Notice'}
                            </Badge>
                            <span className="text-xs text-muted num">{letter.date}</span>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Addressed To</div>
                            <div className="text-sm font-bold text-text truncate">{letter.addressedTo || 'Recipient / Bank Manager'}</div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Purpose</div>
                            <div className="text-xs text-text line-clamp-2">{letter.purpose || 'Official Business Correspondence'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                          <Link href={`/print/letter/${letter.id}`}>
                            <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={14} />}>
                              Print / PDF
                            </Button>
                          </Link>

                          <div className="flex items-center gap-2">
                            <Link href={`/advanced/letters?companyId=${selectedCompany?.id}`}>
                              <Button variant="ghost" size="sm" iconLeft={<Icon name="edit" size={14} />}>
                                Edit
                              </Button>
                            </Link>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="!text-danger-text hover:!bg-danger-tint"
                              iconLeft={<Icon name="trash" size={14} />}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Delete Formal Letter?',
                                  message: 'Are you sure you want to remove this letter from company records?',
                                  confirmLabel: 'Delete',
                                  tone: 'danger',
                                });
                                if (ok) {
                                  dispatch({ type: 'DELETE_LETTER', id: letter.id });
                                  showToast('Letter removed', 'info');
                                }
                              }}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <EmptyState
          title="No branch selected"
          helper="Create a branch or select an enterprise company to manage daily sales, operational costs, and revenue targets."
          action={
            <Button variant="primary" onClick={() => setShowBranchForm(true)} disabled={!companyId}>
              Add Branch
            </Button>
          }
          className="py-12"
        />
      )}
    </div>
  );
}
