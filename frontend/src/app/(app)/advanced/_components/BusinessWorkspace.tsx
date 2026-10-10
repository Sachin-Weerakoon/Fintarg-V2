'use client';
import React, { useState } from 'react';
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
import type { BusinessBranch, BranchEntry } from '@/types';

type BranchTab = 'overview' | 'income' | 'costs' | 'targets';

export function BusinessWorkspace() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const [companyId, setCompanyId] = useState(state.companies[0]?.id || '');
  const companyBranches = state.businessBranches.filter(b => b.companyId === companyId);
  const [branchId, setBranchId] = useState(companyBranches[0]?.id || '');
  const branch = state.businessBranches.find(b => b.id === branchId && b.companyId === companyId) || companyBranches[0];

  const [activeTab, setActiveTab] = useState<BranchTab>('overview');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);

  // Quick sales
  const [quickSales, setQuickSales] = useState('');
  const [quickSalesNote, setQuickSalesNote] = useState('');

  // Cost entry form
  const [costAmount, setCostAmount] = useState('');
  const [costCategory, setCostCategory] = useState('Electricity');
  const [costNote, setCostNote] = useState('');
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));

  // Income entry form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));

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

  const recordSales = () => {
    const amt = Number(quickSales) || 0;
    if (amt <= 0 || !branch) {
      showToast('Please enter a valid sales amount.', 'error');
      return;
    }
    const newEntry: BranchEntry = {
      id: 'entry_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
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
    { id: 'overview' as BranchTab, label: 'Overview' },
    { id: 'income' as BranchTab, label: 'Inflows' },
    { id: 'costs' as BranchTab, label: 'Costs & Bills' },
    { id: 'targets' as BranchTab, label: 'Targets' },
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

            <FormField id="branch-selector" label="Operating Branch / Unit">
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
                  <option value="Warehouse / Hub">Warehouse / Hub</option>
                  <option value="Service Center">Service Center</option>
                  <option value="Online / E-Commerce">Online / E-Commerce</option>
                </Select>
              </FormField>

              <FormField id="new-br-loc" label="Location / City">
                <Input
                  id="new-br-loc"
                  placeholder="e.g. Peradeniya Road, Kandy"
                  value={branchForm.location}
                  onChange={e => setBranchForm(f => ({ ...f, location: e.target.value }))}
                />
              </FormField>

              <FormField id="new-br-target" label="Monthly Revenue Target (Rs.)">
                <MoneyField
                  id="new-br-target"
                  value={branchForm.monthlyTarget}
                  onChange={v => setBranchForm(f => ({ ...f, monthlyTarget: String(v) }))}
                  placeholder="500,000"
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

      {branch ? (
        <>
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

          {/* Tab 2: Inflows */}
          {activeTab === 'income' && (
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <h4 className="text-sm font-bold text-text">Log Commercial Inflow</h4>
                <FormGrid columns={3}>
                  <FormField id="inc-date" label="Date">
                    <DateField id="inc-date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} />
                  </FormField>
                  <FormField id="inc-amt" label="Amount (Rs.) *" required>
                    <MoneyField
                      id="inc-amt"
                      placeholder="150,000"
                      value={incomeAmount}
                      onChange={v => setIncomeAmount(String(v))}
                    />
                  </FormField>
                  <FormField id="inc-note" label="Customer / Order Note">
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

          {/* Tab 3: Costs & Bills */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <h4 className="text-sm font-bold text-text">Log Operational Expense or Utility Bill</h4>
                <FormGrid columns={3}>
                  <FormField id="cost-cat" label="Expense Category">
                    <Select id="cost-cat" value={costCategory} onChange={e => setCostCategory(e.target.value)}>
                      <option value="Electricity">Electricity Bill (CEB)</option>
                      <option value="Water">Water Supply (NWSDB)</option>
                      <option value="Rent">Shop / Facility Rent</option>
                      <option value="Inventory">Raw Materials / Inventory</option>
                      <option value="Salaries">Branch Staff Salaries</option>
                      <option value="Logistics">Logistics & Transport</option>
                      <option value="Marketing">Advertising & Marketing</option>
                      <option value="Other">Other Operating Cost</option>
                    </Select>
                  </FormField>
                  <FormField id="cost-amt" label="Amount (Rs.) *" required>
                    <MoneyField
                      id="cost-amt"
                      placeholder="35,000"
                      value={costAmount}
                      onChange={v => setCostAmount(String(v))}
                    />
                  </FormField>
                  <FormField id="cost-date" label="Date Incurred">
                    <DateField id="cost-date" value={costDate} onChange={e => setCostDate(e.target.value)} />
                  </FormField>
                  <div className="md:col-span-3">
                    <FormField id="cost-note" label="Bill / Reference Note">
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

          {/* Tab 4: Targets */}
          {activeTab === 'targets' && (
            <Card className="p-6 space-y-4">
              <h4 className="text-base font-bold text-text">Branch Revenue Target Setting</h4>
              <p className="text-xs text-muted">
                Define the monthly revenue benchmark to monitor team performance and growth pace.
              </p>

              <div className="max-w-md pt-2">
                <FormField id="br-target-input" label="Monthly Target Ceiling (Rs.)">
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
                </FormField>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text">Current Month Achievement</span>
                  <span className="text-xs font-bold text-primary-text">{targetPct}%</span>
                </div>
                <ProgressBar value={targetPct} max={100} />
                <p className="text-xs text-muted mt-3">
                  {targetPct >= 100
                    ? 'Target achieved! Outstanding commercial performance for this branch.'
                    : `Requires ${formatRs(Math.max(0, target - monthlyRevenue))} more to reach monthly target.`}
                </p>
              </div>
            </Card>
          )}
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
