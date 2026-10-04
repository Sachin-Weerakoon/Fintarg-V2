import React, { lazy, useState, useRef } from 'react';
import { useApp, formatRs } from '../store';
import type { Agreement, BusinessBranch, EmploymentProfile } from '../types';

const Letters = lazy(() => import('./Letters'));
const Medical = lazy(() => import('./Medical'));

type Tab = 'hub' | 'businesses' | 'salary' | 'letters' | 'medical' | 'agreements';

function statusBadge(status: Agreement['status']) {
  if (status === 'active') return <span className="badge-success">Active</span>;
  if (status === 'expired') return <span className="badge-danger">Expired</span>;
  return <span className="badge-muted">Draft</span>;
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

const BLANK_FORM = { title: '', otherParty: '', startDate: '', endDate: '', value: '', summary: '', status: 'draft' as Agreement['status'], fileName: '' };

export default function Advanced() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('hub');
  const hasBusiness = state.profile.workMode !== 'salary';

  return (
    <div className="max-w-6xl mx-auto">
      {tab !== 'hub' && (
        <button className="btn-ghost mb-4" onClick={() => setTab('hub')}>← Advanced Features</button>
      )}
      {tab === 'hub' && <AdvancedHub hasBusiness={hasBusiness} onOpen={setTab} />}
      {tab === 'businesses' && <BusinessWorkspace />}
      {tab === 'salary' && <SalaryWorkspace />}
      {tab === 'letters' && <Letters />}
      {tab === 'medical' && <Medical />}
      {tab === 'agreements' && <AgreementsTab />}
    </div>
  );
}

function AdvancedHub({ hasBusiness, onOpen }: { hasBusiness: boolean; onOpen: (tab: Tab) => void }) {
  const allCards: { tab: Tab; title: string; description: string }[] = [
    { tab: 'letters', title: 'Letters', description: 'Create personal and business letters from ready-made templates.' },
    { tab: 'medical', title: 'Medical', description: 'Track health costs, reports, and appointment reminders.' },
    { tab: 'agreements', title: 'Business Agreements', description: 'Keep contracts, renewal dates, and signed copies together.' },
    { tab: 'businesses', title: 'Businesses', description: 'Manage businesses, branches, targets, costs, and daily sales.' },
  ];
  const cards = allCards.filter(card => hasBusiness || (card.tab !== 'businesses' && card.tab !== 'agreements'));

  return (
    <div>
      <div className="mb-6">
        <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Advanced Features</div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Choose a tool. Your personal and business records stay separate.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map(card => (
          <button key={card.tab} className="card text-left min-h-40 flex flex-col items-start justify-between" onClick={() => onOpen(card.tab)}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-primary-tint)', color: 'var(--color-primary)' }}><HubIcon type={card.tab} /></span>
            <span className="mt-5">
              <span className="block font-semibold" style={{ color: 'var(--color-text)' }}>{card.title}</span>
              <span className="block text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>{card.description}</span>
            </span>
          </button>
        ))}
      </div>
      <NavigationFlowFrame hasBusiness={hasBusiness} />
    </div>
  );
}

function HubIcon({ type }: { type: Tab }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (type === 'letters') return <svg {...common}><path d="M4 6.5h16v11H4z" /><path d="m4 7 8 6 8-6" /></svg>;
  if (type === 'medical') return <svg {...common}><path d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.8-7 10-7 10Z" /><path d="M9 12h6M12 9v6" /></svg>;
  if (type === 'agreements') return <svg {...common}><path d="M7 3h8l3 3v15H7z" /><path d="M15 3v4h4M10 11h5M10 15h5" /></svg>;
  return <svg {...common}><path d="M4 21V8l8-4 8 4v13" /><path d="M8 21v-6h8v6M8 10h.01M12 10h.01M16 10h.01" /></svg>;
}

function NavigationFlowFrame({ hasBusiness }: { hasBusiness: boolean }) {
  return (
    <div className="card mt-6">
      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Navigation update</div>
      <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-muted)' }}>Letters and Medical now live inside Advanced Features.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="nav-flow before">
          <span className="badge-muted">Before</span>
          <p>Home → Financial → Analysis → Goals → Documents → Letters → Medical → Advanced → Settings</p>
        </div>
        <div className="nav-flow after">
          <span className="badge-success">✓ After</span>
          <p>Home → Financial → Analysis → Goals → Documents → Advanced Features → Settings</p>
          <small>{hasBusiness ? 'Mobile: Advanced Features is in the bottom bar.' : 'Mobile: Advanced Features is inside More.'}</small>
        </div>
      </div>
    </div>
  );
}

function WorkOverview({ onOpen }: { onOpen: (tab: Tab) => void }) {
  const { state } = useApp();
  const salaryNet = state.employmentProfiles.reduce((sum, job) => sum + job.monthlyGross - job.monthlyDeductions, 0);
  const businessRevenue = state.businessBranches.flatMap(branch => branch.entries)
    .filter(entry => entry.type === 'revenue' && entry.date.startsWith(state.selectedMonth))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const businessCosts = state.businessBranches.flatMap(branch => branch.entries)
    .filter(entry => entry.type !== 'revenue' && entry.date.startsWith(state.selectedMonth))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const combined = salaryNet + businessRevenue - businessCosts;
  const hasBusiness = state.profile.workMode !== 'salary';
  const hasSalary = state.profile.workMode !== 'business';

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasSalary && <Metric label="Salary take-home" value={formatRs(salaryNet)} detail={`${state.employmentProfiles.length} job source${state.employmentProfiles.length === 1 ? '' : 's'}`} />}
        {hasBusiness && <Metric label="Business revenue" value={formatRs(businessRevenue)} detail={`${state.businessBranches.length} active branches`} />}
        {hasBusiness && <Metric label="Business costs" value={formatRs(businessCosts)} detail="Utilities and other costs" warning />}
        <Metric label="Combined position" value={formatRs(combined)} detail="Estimated this month" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {hasSalary && (
          <button className="card text-left group" onClick={() => onOpen('salary')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Salary & job workspace</div>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Plan payday, deductions, savings, and career targets.</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Open →</span>
            </div>
          </button>
        )}
        {hasBusiness && (
          <button className="card text-left group" onClick={() => onOpen('businesses')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Business workspace</div>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Compare businesses and branches, then record daily activity.</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Open →</span>
            </div>
          </button>
        )}
      </div>
      <div className="card">
        <div className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Quick tools</div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => onOpen('letters')}>Create a letter</button>
          <button className="btn-secondary" onClick={() => onOpen('medical')}>Update medical records</button>
          {hasBusiness && <button className="btn-secondary" onClick={() => onOpen('agreements')}>Review agreements</button>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{label}</div>
      <div className="text-xl font-semibold mt-2" style={{ color: warning ? 'var(--color-warning)' : 'var(--color-text)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{detail}</div>
    </div>
  );
}

function BusinessWorkspace() {
  const { state, dispatch } = useApp();
  const [companyId, setCompanyId] = useState(state.companies[0]?.id || '');
  const companyBranches = state.businessBranches.filter(branch => branch.companyId === companyId);
  const [branchId, setBranchId] = useState(companyBranches[0]?.id || '');
  const branch = state.businessBranches.find(item => item.id === branchId && item.companyId === companyId) || companyBranches[0];
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [quickSalesOpen, setQuickSalesOpen] = useState(false);
  const [quickSales, setQuickSales] = useState('');
  const [branchTab, setBranchTab] = useState<'overview' | 'income' | 'costs' | 'targets'>('overview');
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('month');
  const [incomePeriod, setIncomePeriod] = useState<'day' | 'month' | 'year'>('month');
  const [paidBills, setPaidBills] = useState<string[]>([]);
  const [costOpen, setCostOpen] = useState(false);
  const [costAmount, setCostAmount] = useState('');
  const [costCategory, setCostCategory] = useState('Electricity');
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [businessForm, setBusinessForm] = useState({ name: '', address: '', contact: '', businessType: '', openingDate: '' });
  const [branchForm, setBranchForm] = useState({ name: '', branchType: '', location: '', openingDate: '', monthlyTarget: '' });

  const selectCompany = (id: string) => {
    setLoadingCompany(true);
    setCompanyId(id);
    setBranchId(state.businessBranches.find(item => item.companyId === id)?.id || '');
    window.setTimeout(() => setLoadingCompany(false), 350);
  };
  const addBusiness = () => {
    if (!businessForm.name) return;
    const id = 'co_' + Date.now();
    dispatch({ type: 'ADD_COMPANY', entry: { id, ...businessForm, logo: '' } });
    setCompanyId(id);
    setBranchId('');
    setBusinessForm({ name: '', address: '', contact: '', businessType: '', openingDate: '' });
    setShowBusinessForm(false);
  };
  const addBranch = () => {
    if (!companyId || !branchForm.name || Number(branchForm.monthlyTarget) <= 0) return;
    const entry: BusinessBranch = {
      id: 'branch_' + Date.now(), companyId, name: branchForm.name, branchType: branchForm.branchType, location: branchForm.location, openingDate: branchForm.openingDate,
      monthlyTarget: Number(branchForm.monthlyTarget), annualTarget: Number(branchForm.monthlyTarget) * 12, entries: [],
    };
    dispatch({ type: 'ADD_BRANCH', entry });
    setBranchId(entry.id);
    setBranchForm({ name: '', branchType: '', location: '', openingDate: '', monthlyTarget: '' });
  };
  const monthEntries = branch?.entries.filter(entry => entry.date.startsWith(state.selectedMonth)) || [];
  const revenue = monthEntries.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
  const utilities = monthEntries.filter(entry => entry.type === 'utility').reduce((sum, entry) => sum + entry.amount, 0);
  const otherCosts = monthEntries.filter(entry => entry.type === 'other-cost').reduce((sum, entry) => sum + entry.amount, 0);
  const profit = revenue - utilities - otherCosts;
  const progress = branch ? Math.min(100, Math.round((revenue / branch.monthlyTarget) * 100)) : 0;
  const projected = revenue * (30 / 28);
  const todayIncome = monthEntries.filter(entry => entry.type === 'revenue' && entry.date === '2026-09-28').reduce((sum, entry) => sum + entry.amount, 0);
  const companySummaries = state.companies.map(company => {
    const branches = state.businessBranches.filter(item => item.companyId === company.id);
    const entries = branches.flatMap(item => item.entries);
    const companyRevenue = entries.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0);
    const companyCosts = entries.filter(item => item.type !== 'revenue').reduce((sum, item) => sum + item.amount, 0);
    const target = branches.reduce((sum, item) => sum + item.monthlyTarget, 0);
    const pace = target ? Math.round((companyRevenue * 3.9 / target) * 100) : 0;
    return { company, branches: branches.length, revenue: companyRevenue, profit: companyRevenue - companyCosts, pace };
  });
  const saveQuickSales = () => {
    if (!branch || Number(quickSales) <= 0) return;
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: { ...branch, entries: [...branch.entries, { id: 'sales_' + Date.now(), date: '2026-09-28', type: 'revenue', category: 'Sales', amount: Number(quickSales), note: 'Today’s sales' }] },
    });
    setQuickSales('');
    setQuickSalesOpen(false);
  };
  const companyEntries = companyBranches.flatMap(item => item.entries);
  const companyMonthRevenue = companyEntries.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0);
  const companyMonthCosts = companyEntries.filter(item => item.type !== 'revenue').reduce((sum, item) => sum + item.amount, 0);
  const periodFactor = period === 'today' ? 0.12 : period === 'year' ? 11.4 : 1;
  const displayRevenue = Math.round(companyMonthRevenue * periodFactor);
  const displayCosts = Math.round(companyMonthCosts * periodFactor);
  const companyTarget = companyBranches.reduce((sum, item) => sum + item.monthlyTarget, 0);
  const companyProjection = Math.round(companyMonthRevenue * 3.9);
  const branchRanking = companyBranches.map(item => {
    const branchRevenue = item.entries.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    const branchCosts = item.entries.filter(entry => entry.type !== 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    return { item, revenue: branchRevenue, profit: branchRevenue - branchCosts, progress: Math.round(branchRevenue * 3.9 / item.monthlyTarget * 100) };
  }).sort((a, b) => b.progress - a.progress);
  const fixedBills = [
    { id: 'electricity', label: 'Electricity', amount: 14500, due: 'Sep 30' },
    { id: 'water', label: 'Water', amount: 6500, due: 'Sep 30' },
    { id: 'rent', label: 'Rent', amount: 60000, due: 'Sep 5' },
    { id: 'internet', label: 'Internet', amount: 8500, due: 'Sep 18' },
    { id: 'wages', label: 'Wages', amount: 95000, due: 'Sep 25' },
    { id: 'tax', label: 'Tax', amount: 24000, due: 'Oct 15' },
  ];
  const saveCost = () => {
    if (!branch || Number(costAmount) <= 0) return;
    dispatch({
      type: 'UPDATE_BRANCH',
      entry: { ...branch, entries: [...branch.entries, { id: 'cost_' + Date.now(), date: '2026-09-28', type: costCategory === 'Electricity' || costCategory === 'Water' || costCategory === 'Internet' ? 'utility' : 'other-cost', category: costCategory, amount: Number(costAmount), note: 'Branch cost' }] },
    });
    setCostAmount('');
    setCostOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>My Businesses</div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Choose a business to compare branches and update today’s numbers.</p>
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={() => setShowBusinessForm(true)}>Add business</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {companySummaries.map(summary => (
          <button key={summary.company.id} className="card text-left" onClick={() => selectCompany(summary.company.id)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{summary.company.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{summary.branches} branches</div>
              </div>
              <span className={summary.pace >= 75 ? 'badge-success' : summary.pace >= 45 ? 'badge-warning' : 'badge-danger'}>
                {summary.pace >= 75 ? '✓ On track' : summary.pace >= 45 ? '! At risk' : '↓ Behind'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>This-month revenue</div><div className="font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{formatRs(summary.revenue)}</div></div>
              <div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>Profit</div><div className="font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{formatRs(summary.profit)}</div></div>
            </div>
          </button>
        ))}
      </div>
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="form-label">Business</label>
            <select className="form-input" value={companyId} onChange={event => selectCompany(event.target.value)}>
              {state.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => setShowBusinessForm(value => !value)}>Add business</button>
        </div>
        {showBusinessForm && (
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <input className="form-input" placeholder="Business name" value={businessForm.name} onChange={event => setBusinessForm(form => ({ ...form, name: event.target.value }))} />
            <input className="form-input" placeholder="Business type" value={businessForm.businessType} onChange={event => setBusinessForm(form => ({ ...form, businessType: event.target.value }))} />
            <input className="form-input" placeholder="Address" value={businessForm.address} onChange={event => setBusinessForm(form => ({ ...form, address: event.target.value }))} />
            <input className="form-input" type="date" aria-label="Opening date" value={businessForm.openingDate} onChange={event => setBusinessForm(form => ({ ...form, openingDate: event.target.value }))} />
            <input className="form-input" placeholder="Contact" value={businessForm.contact} onChange={event => setBusinessForm(form => ({ ...form, contact: event.target.value }))} />
            <input className="form-input" type="file" accept="image/*" aria-label="Optional business logo" />
            <button className="btn-primary" onClick={addBusiness}>Save business</button>
          </div>
        )}
      </div>

      {loadingCompany && <BusinessLoading />}
      {companyId && !loadingCompany && (
        <>
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{state.companies.find(company => company.id === companyId)?.name} overview</div>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Revenue, costs, profit, and branch performance.</p>
              </div>
              <div className="workspace-switcher">
                {(['today', 'month', 'year'] as const).map(value => (
                  <button key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>
                    {value === 'today' ? 'Today' : value === 'month' ? 'This month' : 'This year'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>Revenue</div><div className="text-lg md:text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{formatRs(displayRevenue)}</div></div>
              <div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>Costs</div><div className="text-lg md:text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{formatRs(displayCosts)}</div></div>
              <div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>Profit</div><div className="text-lg md:text-2xl font-bold mt-1" style={{ color: 'var(--color-success)' }}>{formatRs(displayRevenue - displayCosts)}</div></div>
            </div>
            <div className="comparison-chart mt-6" aria-label="Revenue compared with costs">
              <div><span style={{ width: `${Math.min(100, displayRevenue / Math.max(displayRevenue, displayCosts, 1) * 100)}%` }} /><strong>Revenue</strong><em>{formatRs(displayRevenue)}</em></div>
              <div><span className="cost" style={{ width: `${Math.min(100, displayCosts / Math.max(displayRevenue, displayCosts, 1) * 100)}%` }} /><strong>Costs</strong><em>{formatRs(displayCosts)}</em></div>
            </div>
          </div>
          <div className={`card projection-card ${companyProjection < companyTarget ? 'is-behind' : ''}`}>
            <span className={companyProjection < companyTarget ? 'badge-danger' : 'badge-success'}>{companyProjection < companyTarget ? '↓ Behind target' : '✓ On track'}</span>
            <div className="font-semibold mt-3" style={{ color: 'var(--color-text)' }}>At this pace you will reach {formatRs(companyProjection)} of your {formatRs(companyTarget)} monthly target</div>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{companyProjection < companyTarget ? `${branchRanking.at(-1)?.item.name || 'One branch'} is down 18% vs last month.` : 'All branches are contributing enough to reach the target.'}</p>
            <div className="projection-line mt-5">
              <span className="actual" style={{ width: `${Math.min(100, companyMonthRevenue / Math.max(companyTarget, 1) * 100)}%` }} />
              <span className="projected" style={{ left: `${Math.min(96, companyProjection / Math.max(companyTarget, 1) * 100)}%` }} />
              <span className="target" />
            </div>
            <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--color-muted)' }}><span>Actual</span><span>Projected</span><span>Target</span></div>
          </div>
          <div className="card">
            <div className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Branch comparison</div>
            <div className="space-y-2">
              {branchRanking.map((item, index) => (
                <button key={item.item.id} className="branch-rank w-full text-left" onClick={() => { setBranchId(item.item.id); setBranchTab('overview'); }}>
                  <span className="rank-number">{index + 1}</span>
                  <span className="flex-1"><strong className="block text-sm" style={{ color: 'var(--color-text)' }}>{item.item.name}</strong><span className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatRs(item.revenue)} revenue · {formatRs(item.profit)} profit</span></span>
                  <span className={item.progress >= 75 ? 'badge-success' : item.progress >= 45 ? 'badge-warning' : 'badge-danger'}>{item.progress >= 75 ? '✓ On track' : item.progress >= 45 ? '! At risk' : '↓ Behind'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {companyBranches.map(item => (
              <button key={item.id} className={`tab-btn whitespace-nowrap${branch?.id === item.id ? ' active' : ''}`} onClick={() => setBranchId(item.id)}>{item.name}</button>
            ))}
            <button className="tab-btn whitespace-nowrap" onClick={() => setBranchId('')}>Add branch</button>
          </div>

          {!branch || branchId === '' ? (
            <div className="card max-w-2xl">
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Create a branch</div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Set a monthly revenue target now. The annual target is calculated automatically.</p>
              <div className="grid md:grid-cols-3 gap-3">
                <input className="form-input" placeholder="Branch name" value={branchForm.name} onChange={event => setBranchForm(form => ({ ...form, name: event.target.value }))} />
                <input className="form-input" placeholder="Branch type" value={branchForm.branchType} onChange={event => setBranchForm(form => ({ ...form, branchType: event.target.value }))} />
                <input className="form-input" placeholder="Location" value={branchForm.location} onChange={event => setBranchForm(form => ({ ...form, location: event.target.value }))} />
                <input className="form-input" type="date" aria-label="Opening date" value={branchForm.openingDate} onChange={event => setBranchForm(form => ({ ...form, openingDate: event.target.value }))} />
                <input className="form-input" type="number" placeholder="Monthly target" value={branchForm.monthlyTarget} onChange={event => setBranchForm(form => ({ ...form, monthlyTarget: event.target.value }))} />
                <input className="form-input" type="file" accept="image/*" aria-label="Optional branch logo" />
              </div>
              <button className="btn-primary mt-4" onClick={addBranch}>Create branch</button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>{branch.name}</div>
                  <div className="text-sm" style={{ color: 'var(--color-muted)' }}>{branch.location || 'No location added'} · {state.selectedMonth}</div>
                </div>
                <span className={projected >= branch.monthlyTarget ? 'badge-success' : 'badge-warning'}>{projected >= branch.monthlyTarget ? '✓ On track' : '! At risk'}</span>
              </div>
              <div className="hero-stat flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div><div className="text-sm text-white/75">Today’s income</div><div className="text-3xl font-bold text-white mt-2">{formatRs(todayIncome)}</div></div>
                <button className="btn-primary bg-white" style={{ color: 'var(--color-primary)', background: '#fff' }} onClick={() => setQuickSalesOpen(true)}>Add today’s sales</button>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {(['overview', 'income', 'costs', 'targets'] as const).map(value => <button key={value} className={`tab-btn capitalize${branchTab === value ? ' active' : ''}`} onClick={() => setBranchTab(value)}>{value}</button>)}
              </div>
              {branchTab === 'overview' && (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Metric label="Revenue" value={formatRs(revenue)} detail={`Target ${formatRs(branch.monthlyTarget)}`} />
                    <Metric label="Utilities" value={formatRs(utilities)} detail="Branch utility bills" warning />
                    <Metric label="Other costs" value={formatRs(otherCosts)} detail="Operating costs" warning />
                    <Metric label="Net profit" value={formatRs(profit)} detail={`Projected ${formatRs(projected - utilities - otherCosts)}`} />
                  </div>
                  <div className={`card projection-card ${projected < branch.monthlyTarget ? 'is-behind' : ''}`}>
                    <span className={projected < branch.monthlyTarget ? 'badge-danger' : 'badge-success'}>{projected < branch.monthlyTarget ? '↓ Behind target' : '✓ On track'}</span>
                    <div className="font-semibold mt-3" style={{ color: 'var(--color-text)' }}>At this pace you will reach {formatRs(projected)} of your {formatRs(branch.monthlyTarget)} monthly target</div>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{projected < branch.monthlyTarget ? 'Daily income is 18% below last month.' : 'Daily income is keeping pace with the monthly target.'}</p>
                  </div>
                </>
              )}
              {branchTab === 'income' && (
                <div className="grid lg:grid-cols-3 gap-5">
                  <div className="card lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Daily income</div>
                      <div className="workspace-switcher">
                        {(['day', 'month', 'year'] as const).map(value => <button key={value} className={incomePeriod === value ? 'active' : ''} onClick={() => setIncomePeriod(value)}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}
                      </div>
                    </div>
                    <div className="heatmap mb-5" aria-label="Income calendar heatmap">
                      {Array.from({ length: 30 }, (_, index) => {
                        const level = [0, 2, 3, 1, 4, 2, 0][index % 7];
                        return <span key={index} className={`level-${level}`} title={`September ${index + 1}`} />;
                      })}
                    </div>
                    <div className="space-y-2">
                      {monthEntries.filter(entry => entry.type === 'revenue').slice().reverse().map(entry => (
                        <div key={entry.id} className="check-row"><span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.date}</span><span className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{entry.note}</span><strong className="text-sm" style={{ color: 'var(--color-success)' }}>{formatRs(entry.amount)}</strong></div>
                      ))}
                    </div>
                  </div>
                  <div className="card h-fit">
                    <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Income summary</div>
                    <div className="text-2xl font-bold mt-3" style={{ color: 'var(--color-text)' }}>{formatRs(revenue)}</div>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>For this {incomePeriod}</p>
                    <button className="btn-primary w-full mt-5" onClick={() => setQuickSalesOpen(true)}>Add today’s sales</button>
                  </div>
                </div>
              )}
              {branchTab === 'costs' && (
                <div className="grid lg:grid-cols-3 gap-5">
                  <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div><div className="font-semibold" style={{ color: 'var(--color-text)' }}>Fixed bills</div><p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Mark each bill paid when it clears.</p></div>
                      <span className="badge-warning">! {fixedBills.length - paidBills.length} due</span>
                    </div>
                    <div className="space-y-2">
                      {fixedBills.map(bill => {
                        const isPaid = paidBills.includes(bill.id);
                        return <button key={bill.id} className="check-row" onClick={() => setPaidBills(current => isPaid ? current.filter(id => id !== bill.id) : [...current, bill.id])}><span className={`check-box ${isPaid ? 'checked' : ''}`}>{isPaid ? '✓' : ''}</span><span className="flex-1 text-left"><strong className="block text-sm" style={{ color: 'var(--color-text)' }}>{bill.label}</strong><span className="text-xs" style={{ color: 'var(--color-muted)' }}>{bill.due} · {isPaid ? 'Paid' : 'Due'}</span></span><strong className="text-sm" style={{ color: 'var(--color-text)' }}>{formatRs(bill.amount)}</strong></button>;
                      })}
                    </div>
                  </div>
                  <div className="card h-fit">
                    <div className="font-semibold" style={{ color: 'var(--color-text)' }}>Other costs</div>
                    <div className="text-2xl font-bold mt-3" style={{ color: 'var(--color-text)' }}>{formatRs(otherCosts)}</div>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Supplies, repairs, transport, and tax.</p>
                    <button className="btn-primary w-full mt-5" onClick={() => setCostOpen(true)}>Add cost</button>
                  </div>
                </div>
              )}
              {branchTab === 'targets' && (
                <div className="card">
                  <div className="font-semibold mb-5" style={{ color: 'var(--color-text)' }}>Branch targets</div>
                  <TargetProgress label="Daily target" current={todayIncome} target={Math.round(branch.monthlyTarget / 30)} />
                  <TargetProgress label="Monthly target" current={revenue} target={branch.monthlyTarget} />
                  <TargetProgress label="Yearly target" current={revenue * 9} target={branch.annualTarget} />
                </div>
              )}
              <div className="card">
                <div className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Targets roll-up</div>
                <div className="goal-tree">
                  <div><strong>Kasun · Owner target</strong><span>61%</span></div>
                  <div><strong>{state.companies.find(company => company.id === companyId)?.name} · Business goal</strong><span>58%</span></div>
                  {companyBranches.map(item => {
                    const branchRevenue = item.entries.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
                    const pct = Math.min(100, Math.round(branchRevenue * 3.9 / item.monthlyTarget * 100));
                    return <div key={item.id}><strong>{item.name} · Branch target</strong><span>{pct}%</span></div>;
                  })}
                </div>
              </div>
              {quickSalesOpen && (
                <div className="modal-overlay" onClick={() => setQuickSalesOpen(false)}>
                  <div className="quick-sheet" onClick={event => event.stopPropagation()}>
                    <div className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Add today’s sales</div>
                    <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-muted)' }}>{branch.name} · September 28</p>
                    <div className="money-input"><span>Rs.</span><input inputMode="numeric" autoFocus value={quickSales} onChange={event => setQuickSales(event.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <button className="btn-primary w-full mt-5" onClick={saveQuickSales}>Save today’s sales</button>
                    <button className="btn-ghost w-full mt-2" onClick={() => setQuickSalesOpen(false)}>Cancel</button>
                  </div>
                </div>
              )}
              {costOpen && (
                <div className="modal-overlay" onClick={() => setCostOpen(false)}>
                  <div className="quick-sheet" onClick={event => event.stopPropagation()}>
                    <div className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Add branch cost</div>
                    <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-muted)' }}>{branch.name} · September 28</p>
                    <label className="form-label">Category</label>
                    <select className="form-input mb-4" value={costCategory} onChange={event => setCostCategory(event.target.value)}>
                      {['Electricity', 'Water', 'Rent', 'Internet', 'Wages', 'Tax', 'Supplies', 'Repairs', 'Transport', 'Other'].map(value => <option key={value}>{value}</option>)}
                    </select>
                    <label className="form-label">Amount</label>
                    <div className="money-input"><span>Rs.</span><input inputMode="numeric" autoFocus value={costAmount} onChange={event => setCostAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <button className="btn-primary w-full mt-5" onClick={saveCost}>Save cost</button>
                    <button className="btn-ghost w-full mt-2" onClick={() => setCostOpen(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function BusinessLoading() {
  return (
    <div className="card" aria-busy="true" aria-label="Loading business overview">
      <div className="skeleton-line w-2/5" />
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" />
      </div>
      <div className="skeleton-line w-full mt-5" />
      <div className="skeleton-line w-4/5 mt-3" />
      <p className="text-xs mt-4" style={{ color: 'var(--color-muted)' }}>Loading business overview…</p>
    </div>
  );
}

function TargetProgress({ label, current, target }: { label: string; current: number; target: number }) {
  const percent = Math.min(100, Math.round(current / Math.max(target, 1) * 100));
  const status = percent >= 75 ? 'On track' : percent >= 45 ? 'At risk' : 'Behind';
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div><div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</div><div className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatRs(current)} of {formatRs(target)}</div></div>
        <span className={percent >= 75 ? 'badge-success' : percent >= 45 ? 'badge-warning' : 'badge-danger'}>{percent >= 75 ? '✓' : percent >= 45 ? '!' : '↓'} {status} · {percent}%</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%`, background: percent < 45 ? 'var(--color-danger)' : undefined }} /></div>
    </div>
  );
}

function SalaryWorkspace() {
  const { state, dispatch } = useApp();
  const [selectedId, setSelectedId] = useState(state.employmentProfiles[0]?.id || '');
  const selected = state.employmentProfiles.find(job => job.id === selectedId) || state.employmentProfiles[0];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employer: '', role: '', monthlyGross: '', payday: '25', monthlyDeductions: '', monthlySavingsTarget: '', careerGoal: '' });

  const saveJob = () => {
    if (!form.employer || Number(form.monthlyGross) <= 0) return;
    const entry: EmploymentProfile = {
      id: 'job_' + Date.now(), employer: form.employer, role: form.role, monthlyGross: Number(form.monthlyGross),
      payday: Number(form.payday), monthlyDeductions: Number(form.monthlyDeductions), monthlySavingsTarget: Number(form.monthlySavingsTarget), careerGoal: form.careerGoal,
    };
    dispatch({ type: 'ADD_EMPLOYMENT', entry });
    setSelectedId(entry.id);
    setShowForm(false);
    setForm({ employer: '', role: '', monthlyGross: '', payday: '25', monthlyDeductions: '', monthlySavingsTarget: '', careerGoal: '' });
  };
  const updateSelected = (updates: Partial<EmploymentProfile>) => {
    if (selected) dispatch({ type: 'UPDATE_EMPLOYMENT', entry: { ...selected, ...updates } });
  };

  const takeHome = selected ? selected.monthlyGross - selected.monthlyDeductions : 0;
  const afterSavings = selected ? takeHome - selected.monthlySavingsTarget : 0;
  const allocation = selected && takeHome > 0 ? Math.min(100, Math.round((selected.monthlySavingsTarget / takeHome) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="form-label">Job or salary source</label>
            <select className="form-input" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
              {state.employmentProfiles.map(job => <option key={job.id} value={job.id}>{job.employer} · {job.role}</option>)}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => setShowForm(value => !value)}>Add another job</button>
        </div>
        {showForm && (
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <input className="form-input" placeholder="Employer" value={form.employer} onChange={event => setForm(value => ({ ...value, employer: event.target.value }))} />
            <input className="form-input" placeholder="Role" value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value }))} />
            <input className="form-input" type="number" placeholder="Gross monthly salary" value={form.monthlyGross} onChange={event => setForm(value => ({ ...value, monthlyGross: event.target.value }))} />
            <input className="form-input" type="number" min="1" max="31" placeholder="Payday" value={form.payday} onChange={event => setForm(value => ({ ...value, payday: event.target.value }))} />
            <input className="form-input" type="number" placeholder="Monthly deductions" value={form.monthlyDeductions} onChange={event => setForm(value => ({ ...value, monthlyDeductions: event.target.value }))} />
            <input className="form-input" type="number" placeholder="Savings target" value={form.monthlySavingsTarget} onChange={event => setForm(value => ({ ...value, monthlySavingsTarget: event.target.value }))} />
            <input className="form-input md:col-span-2" placeholder="Career goal" value={form.careerGoal} onChange={event => setForm(value => ({ ...value, careerGoal: event.target.value }))} />
            <button className="btn-primary" onClick={saveJob}>Save job</button>
          </div>
        )}
      </div>
      {selected ? (
        <>
          <div>
            <div className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>{selected.employer}</div>
            <div className="text-sm" style={{ color: 'var(--color-muted)' }}>{selected.role || 'Role not added'} · Paid on day {selected.payday}</div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Gross salary" value={formatRs(selected.monthlyGross)} detail="Monthly" />
            <Metric label="Deductions" value={formatRs(selected.monthlyDeductions)} detail="Tax, EPF, loans, and other" warning />
            <Metric label="Take-home pay" value={formatRs(takeHome)} detail="Available on payday" />
            <Metric label="After savings" value={formatRs(afterSavings)} detail="Available for monthly spending" />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card">
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Payday allocation</div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Set aside savings first, then use the remaining amount as your spending ceiling.</p>
              <label className="form-label">Monthly savings target</label>
              <input className="form-input" type="number" value={selected.monthlySavingsTarget} onChange={event => updateSelected({ monthlySavingsTarget: Number(event.target.value) })} />
              <div className="progress-track mt-4"><div className="progress-fill" style={{ width: `${allocation}%` }} /></div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>{allocation}% of take-home pay allocated to savings</div>
            </div>
            <div className="card">
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Career target</div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Keep the next practical step visible alongside your financial plan.</p>
              <label className="form-label">Current goal</label>
              <textarea className="form-input" rows={3} value={selected.careerGoal} onChange={event => updateSelected({ careerGoal: event.target.value })} placeholder="Complete a certification, request a review, or prepare for a promotion" />
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-10"><p className="text-sm" style={{ color: 'var(--color-muted)' }}>Add your first salary source to build a payday plan.</p></div>
      )}
    </div>
  );
}

function AgreementsTab() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Agreement['status']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const filtered = state.agreements.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.otherParty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (target === 'new') setForm(f => ({ ...f, fileName: file.name }));
    else setEditForm(f => ({ ...f, fileName: file.name }));
    e.target.value = '';
  };

  const submit = () => {
    if (!form.title || !form.otherParty) { alert('Title and other party required.'); return; }
    dispatch({
      type: 'ADD_AGREEMENT',
      entry: { id: 'ag_' + Date.now(), ...form, value: Number(form.value) || 0 },
    });
    setForm({ ...BLANK_FORM });
    setShowForm(false);
  };

  const startEdit = (a: Agreement) => {
    setEditingId(a.id);
    setEditForm({ title: a.title, otherParty: a.otherParty, startDate: a.startDate, endDate: a.endDate, value: String(a.value), summary: a.summary, status: a.status, fileName: a.fileName || '' });
  };

  const saveEdit = () => {
    if (!editForm.title || !editForm.otherParty) { alert('Title and other party required.'); return; }
    dispatch({ type: 'UPDATE_AGREEMENT', id: editingId!, updates: { ...editForm, value: Number(editForm.value) || 0 } });
    setEditingId(null);
  };

  const setStatus = (id: string, status: Agreement['status']) => {
    dispatch({ type: 'UPDATE_AGREEMENT', id, updates: { status } });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input className="form-input w-44" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <div className="ml-auto">
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>+ Add agreement</button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card mb-5">
          <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>New agreement</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="form-label">Other party</label><input className="form-input" value={form.otherParty} onChange={e => setForm(f => ({ ...f, otherParty: e.target.value }))} /></div>
            <div><label className="form-label">Start date</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="form-label">End date</label><input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            <div><label className="form-label">Value (Rs.)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Agreement['status'] }))}>
                <option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option>
              </select>
            </div>
            <div className="md:col-span-2"><label className="form-label">Summary</label><input className="form-input" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
            <div className="md:col-span-2">
              <label className="form-label">Attach signed copy</label>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={e => handleFile(e, 'new')} />
                <button className="btn-secondary text-xs" style={{ fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>Choose file</button>
                <span className="text-xs" style={{ color: form.fileName ? 'var(--color-text)' : 'var(--color-muted)' }}>{form.fileName || 'No file selected'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={submit}>Save</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Agreements list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-8"><p className="text-sm" style={{ color: 'var(--color-muted)' }}>No agreements found.</p></div>
        )}
        {filtered.map(a => {
          const days = daysUntil(a.endDate);
          const endingSoon = days > 0 && days <= 30;
          const isEditing = editingId === a.id;

          return (
            <div key={a.id} className="card">
              {isEditing ? (
                <div>
                  <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Edit agreement</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div><label className="form-label">Title</label><input className="form-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className="form-label">Other party</label><input className="form-input" value={editForm.otherParty} onChange={e => setEditForm(f => ({ ...f, otherParty: e.target.value }))} /></div>
                    <div><label className="form-label">Start date</label><input className="form-input" type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                    <div><label className="form-label">End date</label><input className="form-input" type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                    <div><label className="form-label">Value (Rs.)</label><input className="form-input" type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Agreement['status'] }))}>
                        <option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option>
                      </select>
                    </div>
                    <div className="md:col-span-2"><label className="form-label">Summary</label><input className="form-input" value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))} /></div>
                    <div className="md:col-span-2">
                      <label className="form-label">Replace signed copy</label>
                      <div className="flex items-center gap-3">
                        <input ref={editFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={e => handleFile(e, 'edit')} />
                        <button className="btn-secondary text-xs" style={{ fontSize: 12 }} onClick={() => editFileInputRef.current?.click()}>Choose file</button>
                        <span className="text-xs" style={{ color: editForm.fileName ? 'var(--color-text)' : 'var(--color-muted)' }}>{editForm.fileName || 'No file selected'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="btn-primary" onClick={saveEdit}>Save changes</button>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{a.title}</span>
                      {statusBadge(a.status)}
                      {endingSoon && <span className="badge-warning">Ends in {days}d</span>}
                    </div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                      With: <strong>{a.otherParty}</strong>
                      {a.startDate && ` · From ${a.startDate}`}
                      {a.endDate && ` to ${a.endDate}`}
                      {a.value > 0 && ` · ${formatRs(a.value)}`}
                    </div>
                    {a.summary && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{a.summary}</div>}
                    {a.fileName && <div className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>📎 {a.fileName}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Status transition buttons */}
                    {a.status === 'draft' && (
                      <button className="btn-secondary text-xs" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setStatus(a.id, 'active')}>Activate</button>
                    )}
                    {a.status === 'active' && (
                      <button className="btn-secondary text-xs" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--color-warning)' }} onClick={() => setStatus(a.id, 'expired')}>Mark expired</button>
                    )}
                    {a.status === 'expired' && (
                      <button className="btn-secondary text-xs" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setStatus(a.id, 'active')}>Reactivate</button>
                    )}
                    <button className="btn-ghost text-xs" onClick={() => startEdit(a)}>✎ Edit</button>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                      onClick={() => { if (confirm('Delete this agreement?')) dispatch({ type: 'DELETE_AGREEMENT', id: a.id }); }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompaniesTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ name: '', address: '', contact: '', logo: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', contact: '' });

  const submit = () => {
    if (!form.name) { alert('Company name required.'); return; }
    dispatch({ type: 'ADD_COMPANY', entry: { id: 'co_' + Date.now(), ...form } });
    setForm({ name: '', address: '', contact: '', logo: '' });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        {state.companies.length === 0 ? (
          <div className="card text-center py-10"><p className="text-sm" style={{ color: 'var(--color-muted)' }}>No companies added yet.</p></div>
        ) : (
          <div className="space-y-3">
            {state.companies.map(c => (
              <div key={c.id} className="card">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Company name" />
                    <input className="form-input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
                    <input className="form-input" value={editForm.contact} onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} placeholder="Contact" />
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs" style={{ fontSize: 12 }} onClick={() => {
                        dispatch({ type: 'UPDATE_COMPANY', entry: { ...c, ...editForm } });
                        setEditingId(null);
                      }}>Save</button>
                      <button className="btn-secondary text-xs" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</div>
                      {c.address && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{c.address}</div>}
                      {c.contact && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.contact}</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="btn-ghost text-xs" onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, address: c.address, contact: c.contact }); }}>✎</button>
                      <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete company?')) dispatch({ type: 'DELETE_COMPANY', id: c.id }); }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card h-fit">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add company</div>
        <div className="space-y-3">
          <div><label className="form-label">Company name</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
          <button className="btn-primary w-full" onClick={submit}>Save company</button>
        </div>
      </div>
    </div>
  );
}
