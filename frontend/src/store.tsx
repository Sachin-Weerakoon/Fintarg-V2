import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { loadPersistedData, persistStoreAction } from '@/services/storeApi';
import type {
  AppState, Page, IncomeEntry, ExpenseEntry, FinancePayment, Loan, PawnedItem,
  SavingsGoal, Letter, Agreement, Company, MedicalExpense, Document, Reminder,
  BusinessBranch, EmploymentProfile, WorkMode, OwnerDraw,
} from './types';

const SEP_2026 = '2026-09';

const initialState: AppState = {
  currentPage: 'onboarding',
  selectedMonth: SEP_2026,
  profile: {
    name: 'Kasun', address: '', dateOfBirth: '', nicNumber: '', portfolioLink: '',
    email: '', mobile: '', plan: 'basic', workMode: 'salary', themeColor: '#0FA3B1', darkMode: false,
    textSize: 'medium', colorText: '', colorMuted: '', colorBg: '', colorSurface: '',
    contacts: [], bankName: '', bankBranch: '', accountName: '', accountNumber: '',
  },
  income: [
    { id: 'i1', source: 'Monthly salary', type: 'salary', amount: 85000, frequency: 'monthly', date: '2026-09-01' },
    { id: 'i2', source: 'Transport allowance', type: 'other', amount: 7500, frequency: 'monthly', date: '2026-09-01' },
    { id: 'i3', source: 'Overtime', type: 'other', amount: 12000, frequency: 'one-time', date: '2026-09-18' },
  ],
  expenses: [
    { id: 'e1', date: '2026-09-28', amount: 3200, category: 'Food', note: 'Groceries', recurring: false },
    { id: 'e2', date: '2026-09-28', amount: 400, category: 'Transport', note: 'Bus fare', recurring: false },
    { id: 'e3', date: '2026-09-27', amount: 12000, category: 'Rent', note: 'Monthly rent', recurring: true },
    { id: 'e4', date: '2026-09-27', amount: 1500, category: 'Personal', note: 'Cinema', recurring: false },
    { id: 'e5', date: '2026-09-26', amount: 850, category: 'Food', note: 'Lunch', recurring: false },
    { id: 'e6', date: '2026-09-25', amount: 1200, category: 'Medical', note: 'Pharmacy', recurring: false },
    { id: 'e7', date: '2026-09-24', amount: 4500, category: 'Utilities', note: 'Electricity + Water', recurring: true },
    { id: 'e8', date: '2026-09-22', amount: 2100, category: 'Food', note: 'Supermarket', recurring: false },
    { id: 'e9', date: '2026-09-20', amount: 350, category: 'Transport', note: 'Fuel', recurring: false },
    { id: 'e10', date: '2026-09-18', amount: 2900, category: 'Food', note: 'Weekend dining', recurring: false },
    { id: 'e11', date: '2026-09-15', amount: 500, category: 'Personal', note: 'Books', recurring: false },
    { id: 'e12', date: '2026-09-10', amount: 800, category: 'Clothing', note: 'Work shirt', recurring: false },
    { id: 'e13', date: '2026-08-27', amount: 12000, category: 'Rent', note: 'Monthly rent', recurring: true },
    { id: 'e14', date: '2026-08-25', amount: 2800, category: 'Food', note: 'Groceries', recurring: false },
    { id: 'e15', date: '2026-08-22', amount: 350, category: 'Transport', note: 'Bus fare', recurring: false },
    { id: 'e16', date: '2026-08-20', amount: 4500, category: 'Utilities', note: 'Bills', recurring: true },
    { id: 'e17', date: '2026-08-15', amount: 3200, category: 'Food', note: 'Supermarket', recurring: false },
    { id: 'e18', date: '2026-08-12', amount: 1800, category: 'Personal', note: 'Dining out', recurring: false },
    { id: 'e19', date: '2026-07-27', amount: 12000, category: 'Rent', note: 'Monthly rent', recurring: true },
    { id: 'e20', date: '2026-07-24', amount: 4500, category: 'Utilities', note: 'Bills', recurring: true },
    { id: 'e21', date: '2026-07-20', amount: 4100, category: 'Food', note: 'Groceries + dining', recurring: false },
    { id: 'e22', date: '2026-07-15', amount: 600, category: 'Transport', note: 'Fuel', recurring: false },
    { id: 'e23', date: '2026-07-10', amount: 1500, category: 'Personal', note: 'Clothes', recurring: false },
  ],
  financePayments: [
    { id: 'fp1', lender: "People's Bank", amount: 25000, dueDay: 10, monthsRemaining: 18 },
  ],
  loans: [],
  pawnedItems: [
    { id: 'p1', description: 'Gold chain (22g)', amountReceived: 85000, interestRate: 2, nextDue: '2026-10-05', redemptionDate: '2027-01-05' },
  ],
  savingsGoals: [
    {
      id: 'g1', name: 'Emergency Fund', dailyAmount: 1000, monthlyTarget: 30000, endDate: '2027-03-31', savedAmount: 12000,
      contributions: [
        { date: '2026-09-28', amount: 1000 }, { date: '2026-09-27', amount: 1000 },
        { date: '2026-09-26', amount: 1000 }, { date: '2026-09-25', amount: 1000 },
        { date: '2026-09-24', amount: 1000 }, { date: '2026-09-23', amount: 1000 },
        { date: '2026-09-22', amount: 1000 }, { date: '2026-09-21', amount: 1000 },
        { date: '2026-09-20', amount: 1000 }, { date: '2026-09-19', amount: 1000 },
        { date: '2026-09-18', amount: 1000 }, { date: '2026-09-17', amount: 1000 },
      ],
    },
  ],
  personalSpendingBudget: 5000,
  letters: [],
  agreements: [
    { id: 'a1', title: 'Supply agreement', otherParty: 'ABC Traders', startDate: '2026-01-01', endDate: '2026-12-31', value: 500000, summary: 'Monthly supply of raw materials', status: 'active', fileName: '' },
    { id: 'a2', title: 'Office lease', otherParty: 'Mr. Perera', startDate: '2025-10-18', endDate: '2026-10-18', value: 25000, summary: 'Monthly office rental', status: 'active', fileName: '' },
    { id: 'a3', title: 'Service contract', otherParty: 'XYZ Pvt Ltd', startDate: '2025-03-01', endDate: '2026-09-01', value: 150000, summary: 'IT support services', status: 'expired', fileName: '' },
    { id: 'a4', title: 'Partnership draft', otherParty: 'Silva & Co', startDate: '', endDate: '', value: 0, summary: 'Pending review', status: 'draft', fileName: '' },
  ],
  companies: [
    { id: 'c1', name: 'Lanka Bakes', address: 'Negombo Road, Negombo', contact: '0312 345 678', logo: '' },
    { id: 'c2', name: 'Kasun Hardware', address: 'Main Street, Wattala', contact: '0112 889 410', logo: '' },
  ],
  businessBranches: [
    {
      id: 'b1', companyId: 'c1', name: 'Negombo', location: 'Negombo',
      monthlyTarget: 900000, annualTarget: 10800000,
      entries: [
        { id: 'be1', date: '2026-09-28', type: 'revenue', category: 'Sales', amount: 65000, note: 'Daily sales' },
        { id: 'be2', date: '2026-09-27', type: 'revenue', category: 'Sales', amount: 48500, note: 'Daily sales' },
        { id: 'be3', date: '2026-09-25', type: 'utility', category: 'Electricity', amount: 14500, note: 'Monthly bill' },
        { id: 'be4', date: '2026-09-24', type: 'other-cost', category: 'Supplies', amount: 12500, note: 'Packaging' },
        { id: 'be7', date: '2026-09-23', type: 'other-cost', category: 'Rent', amount: 60000, note: 'Monthly rent' },
        { id: 'be8', date: '2026-09-22', type: 'other-cost', category: 'Wages', amount: 95000, note: 'Staff wages' },
      ],
    },
    {
      id: 'b2', companyId: 'c1', name: 'Colombo', location: 'Colombo',
      monthlyTarget: 600000, annualTarget: 7200000,
      entries: [
        { id: 'be5', date: '2026-09-28', type: 'revenue', category: 'Sales', amount: 36000, note: 'Daily sales' },
        { id: 'be6', date: '2026-09-25', type: 'utility', category: 'Water', amount: 6500, note: 'Monthly bill' },
      ],
    },
    { id: 'b3', companyId: 'c1', name: 'Kandy', location: 'Kandy', monthlyTarget: 700000, annualTarget: 8400000, entries: [{ id: 'be9', date: '2026-09-28', type: 'revenue', category: 'Sales', amount: 18000, note: 'Daily sales' }] },
    { id: 'b4', companyId: 'c2', name: 'Main Store', location: 'Wattala', monthlyTarget: 1200000, annualTarget: 14400000, entries: [{ id: 'be10', date: '2026-09-28', type: 'revenue', category: 'Sales', amount: 58000, note: 'Daily sales' }] },
    { id: 'b5', companyId: 'c2', name: 'Wattala', location: 'Wattala', monthlyTarget: 800000, annualTarget: 9600000, entries: [{ id: 'be11', date: '2026-09-28', type: 'revenue', category: 'Sales', amount: 27000, note: 'Daily sales' }] },
  ],
  employmentProfiles: [
    { id: 'job1', employer: 'Serendib Holdings', role: 'Operations Executive', monthlyGross: 85000, payday: 25, monthlyDeductions: 6800, monthlySavingsTarget: 15000, careerGoal: 'Complete professional certification' },
  ],
  ownerDraws: [],
  medicalExpenses: [
    { id: 'm1', date: '2026-09-25', type: 'Pharmacy', amount: 1200, note: 'Antibiotics' },
    { id: 'm2', date: '2026-09-10', type: 'Consultation', amount: 2500, note: 'GP visit' },
  ],
  documents: [
    { id: 'd1', type: 'nic-front', label: 'NIC Front', uploadDate: '2026-08-15', note: '', fileName: 'nic_front.jpg' },
    { id: 'd2', type: 'bank', label: 'Bank Statement', uploadDate: '2026-09-01', note: 'Sep 2026', fileName: 'bank_sep26.pdf' },
  ],
  reminders: [],
  setupComplete: false,
};

const emptyInitialState: AppState = {
  ...initialState,
  currentPage: 'dashboard',
  selectedMonth: new Date().toISOString().slice(0, 7),
  profile: { ...initialState.profile, name: '', email: '' },
  income: [], expenses: [], financePayments: [], loans: [], pawnedItems: [], savingsGoals: [],
  personalSpendingBudget: 0, letters: [], agreements: [], companies: [], businessBranches: [],
  employmentProfiles: [], ownerDraws: [], medicalExpenses: [], documents: [], reminders: [],
};

type Action =
  | { type: 'HYDRATE'; data: Partial<AppState> }
  | { type: 'SET_PAGE'; page: Page }
  | { type: 'SET_PLAN'; plan: 'basic' | 'business'; workMode: WorkMode; name: string }
  | { type: 'SET_SETUP_COMPLETE' }
  | { type: 'UPDATE_PROFILE'; profile: Partial<AppState['profile']> }
  | { type: 'ADD_INCOME'; entry: IncomeEntry }
  | { type: 'UPDATE_INCOME'; entry: IncomeEntry }
  | { type: 'DELETE_INCOME'; id: string }
  | { type: 'ADD_EXPENSE'; entry: ExpenseEntry }
  | { type: 'UPDATE_EXPENSE'; entry: ExpenseEntry }
  | { type: 'DELETE_EXPENSE'; id: string }
  | { type: 'ADD_FINANCE_PAYMENT'; entry: FinancePayment }
  | { type: 'DELETE_FINANCE_PAYMENT'; id: string }
  | { type: 'ADD_LOAN'; entry: Loan }
  | { type: 'RECORD_LOAN_REPAYMENT'; id: string; amount: number }
  | { type: 'DELETE_LOAN'; id: string }
  | { type: 'ADD_PAWNED'; entry: PawnedItem }
  | { type: 'RECORD_PAWN_PAYMENT'; id: string }
  | { type: 'DELETE_PAWNED'; id: string }
  | { type: 'ADD_GOAL'; entry: SavingsGoal }
  | { type: 'UPDATE_GOAL'; id: string; dailyAmount: number; monthlyTarget: number }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'ADD_SAVING_CONTRIBUTION'; goalId: string; amount: number; date: string }
  | { type: 'SET_PERSONAL_SPENDING_BUDGET'; budget: number }
  | { type: 'ADD_LETTER'; entry: Letter }
  | { type: 'DELETE_LETTER'; id: string }
  | { type: 'ADD_AGREEMENT'; entry: Agreement }
  | { type: 'UPDATE_AGREEMENT'; id: string; updates: Partial<Agreement> }
  | { type: 'DELETE_AGREEMENT'; id: string }
  | { type: 'ADD_COMPANY'; entry: Company }
  | { type: 'UPDATE_COMPANY'; entry: Company }
  | { type: 'DELETE_COMPANY'; id: string }
  | { type: 'ADD_BRANCH'; entry: BusinessBranch }
  | { type: 'UPDATE_BRANCH'; entry: BusinessBranch }
  | { type: 'DELETE_BRANCH'; id: string }
  | { type: 'ADD_EMPLOYMENT'; entry: EmploymentProfile }
  | { type: 'UPDATE_EMPLOYMENT'; entry: EmploymentProfile }
  | { type: 'DELETE_EMPLOYMENT'; id: string }
  | { type: 'ADD_OWNER_DRAW'; entry: OwnerDraw }
  | { type: 'ADD_MEDICAL_EXPENSE'; entry: MedicalExpense }
  | { type: 'DELETE_MEDICAL_EXPENSE'; id: string }
  | { type: 'ADD_DOCUMENT'; entry: Document }
  | { type: 'DELETE_DOCUMENT'; id: string }
  | { type: 'ADD_REMINDER'; entry: Reminder }
  | { type: 'UPDATE_REMINDER'; id: string; status: Reminder['status'] }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'ADD_LOAN_FROM_SHORTFALL'; amount: number; month: string }
  | { type: 'SET_MONTH'; month: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE': return { ...state, ...action.data, profile: { ...state.profile, ...action.data.profile } };
    case 'SET_PAGE': return { ...state, currentPage: action.page };
    case 'SET_PLAN': return { ...state, currentPage: 'dashboard', profile: { ...state.profile, plan: action.plan, workMode: action.workMode, name: action.name } };
    case 'SET_SETUP_COMPLETE': return { ...state, setupComplete: true };
    case 'UPDATE_PROFILE': return { ...state, profile: { ...state.profile, ...action.profile } };
    case 'ADD_INCOME': return { ...state, income: [...state.income, action.entry] };
    case 'UPDATE_INCOME': return { ...state, income: state.income.map(i => i.id === action.entry.id ? action.entry : i) };
    case 'DELETE_INCOME': return { ...state, income: state.income.filter(i => i.id !== action.id) };
    case 'ADD_EXPENSE': return { ...state, expenses: [...state.expenses, action.entry] };
    case 'UPDATE_EXPENSE': return { ...state, expenses: state.expenses.map(e => e.id === action.entry.id ? action.entry : e) };
    case 'DELETE_EXPENSE': return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };
    case 'ADD_FINANCE_PAYMENT': return { ...state, financePayments: [...state.financePayments, action.entry] };
    case 'DELETE_FINANCE_PAYMENT': return { ...state, financePayments: state.financePayments.filter(f => f.id !== action.id) };
    case 'ADD_LOAN': return { ...state, loans: [...state.loans, action.entry] };
    case 'RECORD_LOAN_REPAYMENT': return {
      ...state,
      loans: state.loans.map(l => l.id === action.id ? { ...l, balance: Math.max(0, l.balance - action.amount) } : l),
    };
    case 'DELETE_LOAN': return { ...state, loans: state.loans.filter(l => l.id !== action.id) };
    case 'ADD_PAWNED': return { ...state, pawnedItems: [...state.pawnedItems, action.entry] };
    case 'RECORD_PAWN_PAYMENT': {
      const p = state.pawnedItems.find(pi => pi.id === action.id);
      if (!p) return state;
      const nextDate = new Date(p.nextDue);
      nextDate.setMonth(nextDate.getMonth() + 1);
      return {
        ...state,
        pawnedItems: state.pawnedItems.map(pi => pi.id === action.id
          ? { ...pi, nextDue: nextDate.toISOString().slice(0, 10) } : pi),
      };
    }
    case 'DELETE_PAWNED': return { ...state, pawnedItems: state.pawnedItems.filter(p => p.id !== action.id) };
    case 'ADD_GOAL': return { ...state, savingsGoals: [...state.savingsGoals, action.entry] };
    case 'UPDATE_GOAL': return {
      ...state,
      savingsGoals: state.savingsGoals.map(g => g.id === action.id
        ? { ...g, dailyAmount: action.dailyAmount, monthlyTarget: action.monthlyTarget } : g),
    };
    case 'DELETE_GOAL': return { ...state, savingsGoals: state.savingsGoals.filter(g => g.id !== action.id) };
    case 'ADD_SAVING_CONTRIBUTION': return {
      ...state,
      savingsGoals: state.savingsGoals.map(g => g.id === action.goalId
        ? { ...g, savedAmount: g.savedAmount + action.amount, contributions: [...g.contributions, { date: action.date, amount: action.amount }] }
        : g),
    };
    case 'SET_PERSONAL_SPENDING_BUDGET': return { ...state, personalSpendingBudget: action.budget };
    case 'ADD_LETTER': return { ...state, letters: [...state.letters, action.entry] };
    case 'DELETE_LETTER': return { ...state, letters: state.letters.filter(l => l.id !== action.id) };
    case 'ADD_AGREEMENT': return { ...state, agreements: [...state.agreements, action.entry] };
    case 'UPDATE_AGREEMENT': return {
      ...state,
      agreements: state.agreements.map(a => a.id === action.id ? { ...a, ...action.updates } : a),
    };
    case 'DELETE_AGREEMENT': return { ...state, agreements: state.agreements.filter(a => a.id !== action.id) };
    case 'ADD_COMPANY': return { ...state, companies: [...state.companies, action.entry] };
    case 'UPDATE_COMPANY': return { ...state, companies: state.companies.map(c => c.id === action.entry.id ? action.entry : c) };
    case 'DELETE_COMPANY': return { ...state, companies: state.companies.filter(c => c.id !== action.id) };
    case 'ADD_BRANCH': return { ...state, businessBranches: [...state.businessBranches, action.entry] };
    case 'UPDATE_BRANCH': return { ...state, businessBranches: state.businessBranches.map(b => b.id === action.entry.id ? action.entry : b) };
    case 'DELETE_BRANCH': return { ...state, businessBranches: state.businessBranches.filter(b => b.id !== action.id) };
    case 'ADD_EMPLOYMENT': return { ...state, employmentProfiles: [...state.employmentProfiles, action.entry] };
    case 'UPDATE_EMPLOYMENT': return { ...state, employmentProfiles: state.employmentProfiles.map(e => e.id === action.entry.id ? action.entry : e) };
    case 'DELETE_EMPLOYMENT': return { ...state, employmentProfiles: state.employmentProfiles.filter(e => e.id !== action.id) };
    case 'ADD_OWNER_DRAW': return { ...state, ownerDraws: [...state.ownerDraws, action.entry] };
    case 'ADD_MEDICAL_EXPENSE': return { ...state, medicalExpenses: [...state.medicalExpenses, action.entry] };
    case 'DELETE_MEDICAL_EXPENSE': return { ...state, medicalExpenses: state.medicalExpenses.filter(m => m.id !== action.id) };
    case 'ADD_DOCUMENT': return { ...state, documents: [...state.documents, action.entry] };
    case 'DELETE_DOCUMENT': return { ...state, documents: state.documents.filter(d => d.id !== action.id) };
    case 'ADD_REMINDER': return { ...state, reminders: [...state.reminders, action.entry] };
    case 'UPDATE_REMINDER': return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, status: action.status } : r) };
    case 'DELETE_REMINDER': return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };
    case 'ADD_LOAN_FROM_SHORTFALL': {
      const loan: Loan = {
        id: 'loan_' + Date.now(),
        lender: 'Self (shortfall ' + action.month + ')',
        principal: action.amount,
        rate: 0,
        method: 'simple',
        startDate: action.month + '-01',
        dueDate: '',
        balance: action.amount,
      };
      return { ...state, loans: [...state.loans, loan], currentPage: 'financial' };
    }
    case 'SET_MONTH': return { ...state, selectedMonth: action.month };
    default: return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children, initialProfile = {} }: { children: ReactNode; initialProfile?: Partial<AppState['profile']> }) {
  const [state, reduce] = useReducer(reducer, {
    ...emptyInitialState,
    profile: { ...emptyInitialState.profile, ...initialProfile },
  });

  useEffect(() => {
    let cancelled = false;
    void loadPersistedData().then(data => {
      if (!cancelled) reduce({ type: 'HYDRATE', data });
    }).catch(error => {
      if (!cancelled) console.error('Unable to load account records', error);
    });
    return () => { cancelled = true; };
  }, []);

  const dispatch: React.Dispatch<Action> = action => {
    reduce(action);
    if (action.type !== 'HYDRATE') {
      void persistStoreAction(action).catch(error => console.error('Unable to save account change', error));
    }
  };

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function formatRs(amount: number): string {
  return 'Rs. ' + Math.abs(Math.round(amount)).toLocaleString('en-LK');
}

export function calcMonthlyIncome(income: AppState['income'], month: string): number {
  return income.reduce((sum, i) => {
    if (i.frequency === 'monthly') return sum + i.amount;
    if (i.frequency === 'weekly') return sum + i.amount * 4;
    if (i.frequency === 'daily') return sum + i.amount * 30;
    // one-time: only count if in this month
    if (i.frequency === 'one-time') return i.date.startsWith(month) ? sum + i.amount : sum;
    return sum;
  }, 0);
}

export function calcMonthlyExpenses(expenses: AppState['expenses'], month: string): number {
  return expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
}

export function calcPersonalSpent(expenses: AppState['expenses'], month: string): number {
  return expenses.filter(e => e.date.startsWith(month) && e.category === 'Personal').reduce((s, e) => s + e.amount, 0);
}

export function calcFinancePayments(fps: AppState['financePayments']): number {
  return fps.reduce((s, f) => s + f.amount, 0);
}

export function calcLoanInterest(loans: AppState['loans']): number {
  return loans.reduce((s, l) => {
    if (l.method === 'compound') {
      return s + l.balance * (Math.pow(1 + l.rate / 100, 1) - 1);
    }
    return s + (l.balance * l.rate) / 100;
  }, 0);
}

export function calcExpensesByCategory(expenses: AppState['expenses'], month: string): Record<string, number> {
  const map: Record<string, number> = {};
  expenses.filter(e => e.date.startsWith(month)).forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return map;
}

export function calcExpensesByDay(expenses: AppState['expenses'], month: string): Record<string, number> {
  const map: Record<string, number> = {};
  expenses.filter(e => e.date.startsWith(month)).forEach(e => {
    map[e.date] = (map[e.date] || 0) + e.amount;
  });
  return map;
}

export function calcAnalysis(state: AppState, month: string) {
  const totalIncome = calcMonthlyIncome(state.income, month);
  // Living expenses includes ALL expense categories (including Personal)
  const livingExpenses = calcMonthlyExpenses(state.expenses, month);
  const financePayments = calcFinancePayments(state.financePayments);
  const loanInterest = calcLoanInterest(state.loans);
  const savingsTarget = state.savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);
  // BR-1: Total outflow = living expenses + finance payments + loan interest + savings
  // Note: personal spending is already within living expenses (Personal category)
  // personalSpendingBudget is a planning tool, not added separately to avoid double-count
  const totalOutflow = livingExpenses + financePayments + loanInterest + savingsTarget;
  const netPosition = totalIncome - totalOutflow;
  const shortfall = netPosition < 0 ? Math.abs(netPosition) : 0;
  // Free cash: what's available after essential obligations (before savings allocation)
  const freeCash = totalIncome - livingExpenses - financePayments - loanInterest;
  const personalSpent = calcPersonalSpent(state.expenses, month);
  return {
    totalIncome, livingExpenses, financePayments, loanInterest, savingsTarget,
    totalOutflow, netPosition, shortfall, freeCash, personalSpent,
  };
}

// Compute CSS tint from a hex color (lighten toward white at 88%)
export function computeTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const tr = Math.round(r + (255 - r) * 0.88);
  const tg = Math.round(g + (255 - g) * 0.88);
  const tb = Math.round(b + (255 - b) * 0.88);
  return `rgb(${tr},${tg},${tb})`;
}

export function computeDark(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * 0.28);
  const dg = Math.round(g * 0.28);
  const db = Math.round(b * 0.28);
  return `rgb(${dr},${dg},${db})`;
}
