'use client';

import React, { createContext, useContext, useEffect, useReducer, useRef, useState, useCallback, ReactNode } from 'react';
import { loadPersistedData, persistStoreAction, loadBusinessData } from '@/services/storeApi';
import { useToast } from '@/components/ui/ToastProvider';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import type {
  AppState, Page, IncomeEntry, ExpenseEntry, FinancePayment, Loan, PawnedItem,
  SavingsGoal, Letter, Agreement, Company, MedicalExpense, Document, Reminder,
  BusinessBranch, EmploymentProfile, WorkMode, OwnerDraw,
  BankAccount, Card, Transaction, UserPlan,
} from './types';

const SEP_2026 = '2026-09';

const initialState: AppState = {
  currentPage: 'onboarding',
  selectedMonth: SEP_2026,
  profile: {
    name: 'Kasun', address: '', dateOfBirth: '', nicNumber: '', portfolioLink: '',
    email: '', mobile: '', plan: 'basic', workMode: 'salary', themeColor: '#0FA3B1', darkMode: true,
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
  bankAccounts: [],
  cards: [],
  transactions: [],
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
  income: [], expenses: [], financePayments: [], loans: [], bankAccounts: [], cards: [], transactions: [], pawnedItems: [], savingsGoals: [],
  personalSpendingBudget: 0, letters: [], agreements: [], companies: [], businessBranches: [],
  employmentProfiles: [], ownerDraws: [], medicalExpenses: [], documents: [], reminders: [],
};

type Action =
  | { type: 'HYDRATE'; data: Partial<AppState> }
  | { type: 'REPLACE_RECORD_ID'; collection: 'income' | 'expenses' | 'financePayments' | 'loans' | 'bankAccounts' | 'cards' | 'transactions' | 'pawnedItems' | 'savingsGoals' | 'letters' | 'agreements' | 'companies' | 'businessBranches' | 'employmentProfiles' | 'ownerDraws' | 'medicalExpenses' | 'documents' | 'reminders'; localId: string; serverId: string }
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
  | { type: 'UPDATE_FINANCE_PAYMENT'; entry: FinancePayment }
  | { type: 'DELETE_FINANCE_PAYMENT'; id: string }
  | { type: 'MARK_FINANCE_PAYMENT_PAID'; id: string; amount?: number; paymentMethod?: string; bankAccountId?: string | null; date?: string; note?: string }
  | { type: 'DELETE_FINANCE_PAYMENT_PAYMENT'; id: string; paymentId: string }
  | { type: 'ADD_BANK_ACCOUNT'; entry: BankAccount }
  | { type: 'UPDATE_BANK_ACCOUNT'; entry: BankAccount }
  | { type: 'DELETE_BANK_ACCOUNT'; id: string }
  | { type: 'ADD_CARD'; entry: Card }
  | { type: 'UPDATE_CARD'; entry: Card }
  | { type: 'DELETE_CARD'; id: string }
  | { type: 'ADD_TRANSACTION'; entry: Transaction }
  | { type: 'DELETE_TRANSACTION'; id: string }
  | { type: 'TRANSFER_FUNDS'; fromAccountId?: string | null; fromCardId?: string | null; toAccountId?: string | null; toCardId?: string | null; amount: number; date: string; description?: string; category?: string }
  | { type: 'DELETE_TRANSFER'; transferGroupId: string }
  | { type: 'ADD_LOAN'; entry: Loan }
  | { type: 'UPDATE_LOAN'; entry: Loan }
  | { type: 'RECORD_LOAN_REPAYMENT'; id: string; amount: number; note?: string; date?: string; paymentMethod?: string; bankAccountId?: string | null }
  | { type: 'DELETE_LOAN_REPAYMENT'; id: string; repaymentId: string }
  | { type: 'DELETE_LOAN'; id: string }
  | { type: 'ADD_PAWNED'; entry: PawnedItem }
  | { type: 'RECORD_PAWN_PAYMENT'; id: string; amount?: number; paymentType?: 'interest' | 'part_principal' | 'redemption'; paymentMethod?: string; bankAccountId?: string | null; date?: string; note?: string }
  | { type: 'DELETE_PAWN_PAYMENT'; id: string; paymentId: string }
  | { type: 'DELETE_PAWNED'; id: string }
  | { type: 'ADD_GOAL'; entry: SavingsGoal }
  | { type: 'UPDATE_GOAL'; id: string; dailyAmount?: number; monthlyTarget?: number; targetAmount?: number; targetDate?: string; savedAmount?: number }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'ADD_SAVING_CONTRIBUTION'; goalId: string; amount: number; date: string; note?: string; debitAccount?: boolean; paymentMethod?: string; bankAccountId?: string | null }
  | { type: 'DELETE_SAVING_CONTRIBUTION'; goalId: string; contributionId: string }
  | { type: 'SET_PERSONAL_SPENDING_BUDGET'; budget: number; month?: string }
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
  | { type: 'ADD_LOAN_FROM_SHORTFALL'; amount: number; month: string; id?: string }
  | { type: 'SET_MONTH'; month: string }
  | { type: 'ROLLBACK'; previousState: AppState };

type PersistedCollection = Extract<Action, { type: 'REPLACE_RECORD_ID' }>['collection'];

/** Actions whose persisted result is derived by the backend ledger and must be re-read after saving. */
const SERVER_RECONCILED_ACTIONS = new Set<Action['type']>([
  'ADD_INCOME', 'UPDATE_INCOME', 'DELETE_INCOME',
  'ADD_EXPENSE', 'UPDATE_EXPENSE', 'DELETE_EXPENSE',
  'MARK_FINANCE_PAYMENT_PAID', 'DELETE_FINANCE_PAYMENT_PAYMENT',
  'DELETE_BANK_ACCOUNT', 'UPDATE_BANK_ACCOUNT', 'DELETE_CARD',
  'ADD_TRANSACTION', 'DELETE_TRANSACTION', 'TRANSFER_FUNDS', 'DELETE_TRANSFER',
  'RECORD_LOAN_REPAYMENT', 'DELETE_LOAN_REPAYMENT',
  'RECORD_PAWN_PAYMENT', 'DELETE_PAWN_PAYMENT',
  'ADD_SAVING_CONTRIBUTION', 'DELETE_SAVING_CONTRIBUTION',
  'ADD_BRANCH', 'UPDATE_BRANCH',
]);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ROLLBACK': return action.previousState;
    case 'HYDRATE': return { ...state, ...action.data, profile: { ...state.profile, ...action.data.profile } };
    case 'REPLACE_RECORD_ID': return {
      ...state,
      [action.collection]: (state[action.collection] as { id: string }[]).map(record => record.id === action.localId ? { ...record, id: action.serverId } : record),
    };
    case 'SET_PAGE': return { ...state, currentPage: action.page };
    case 'SET_PLAN': return { ...state, currentPage: 'dashboard', profile: { ...state.profile, plan: action.plan, workMode: action.workMode, name: action.name } };
    case 'SET_SETUP_COMPLETE': return { ...state, setupComplete: true };
    case 'UPDATE_PROFILE': return { ...state, profile: { ...state.profile, ...action.profile } };
    case 'ADD_INCOME': return { ...state, income: [...state.income, action.entry] };
    case 'UPDATE_INCOME': return { ...state, income: state.income.map(i => i.id === action.entry.id ? action.entry : i) };
    case 'DELETE_INCOME': return { ...state, income: state.income.filter(i => i.id !== action.id) };
    case 'ADD_EXPENSE': {
      let updatedBranches = state.businessBranches;
      if (action.entry.sourceType === 'business' && action.entry.branchId) {
        updatedBranches = state.businessBranches.map(b => {
          if (b.id !== action.entry.branchId) return b;
          const costEntry = {
            id: 'be_exp_' + action.entry.id,
            date: action.entry.date,
            type: (['Electricity', 'Water', 'Internet', 'Phone'].includes(action.entry.category) ? 'utility' : 'other-cost') as 'utility' | 'other-cost',
            category: action.entry.category,
            amount: action.entry.amount,
            note: action.entry.note || action.entry.category,
          };
          return {
            ...b,
            entries: [costEntry, ...(b.entries || [])],
          };
        });
      }
      return {
        ...state,
        expenses: [...state.expenses, action.entry],
        businessBranches: updatedBranches,
      };
    };
    case 'UPDATE_EXPENSE': {
      return {
        ...state,
        expenses: state.expenses.map(e => e.id === action.entry.id ? action.entry : e),
      };
    };
    case 'DELETE_EXPENSE': {
      const exp = state.expenses.find(e => e.id === action.id);
      let updatedBranches = state.businessBranches;
      if (exp?.branchId) {
        updatedBranches = state.businessBranches.map(b => {
          if (b.id !== exp.branchId) return b;
          return {
            ...b,
            entries: (b.entries || []).filter(be => be.id !== 'be_exp_' + exp.id),
          };
        });
      }
      return {
        ...state,
        expenses: state.expenses.filter(e => e.id !== action.id),
        medicalExpenses: exp?.sourceType === 'medical'
          ? state.medicalExpenses.filter(m => m.id !== exp.sourceId && m.expenseId !== action.id)
          : state.medicalExpenses,
        businessBranches: updatedBranches,
      };
    };
    case 'ADD_FINANCE_PAYMENT': return { ...state, financePayments: [...state.financePayments, action.entry] };
    case 'UPDATE_FINANCE_PAYMENT': return { ...state, financePayments: state.financePayments.map(f => f.id === action.entry.id ? action.entry : f) };
    case 'DELETE_FINANCE_PAYMENT': return { ...state, financePayments: state.financePayments.filter(f => f.id !== action.id) };
    case 'MARK_FINANCE_PAYMENT_PAID': {
      const fp = state.financePayments.find(f => f.id === action.id);
      if (!fp) return state;
      const paymentDate = action.date || new Date().toISOString().slice(0, 10);
      const payAmount = action.amount !== undefined ? action.amount : fp.amount;
      const newMonths = Math.max(0, (fp.monthsRemaining || 1) - 1);
      const newStatus = newMonths === 0 ? 'completed' : fp.status || 'active';

      let nextDue = fp.nextDueDate;
      if (nextDue) {
        const d = new Date(`${nextDue}T00:00:00.000Z`);
        d.setUTCMonth(d.getUTCMonth() + 1);
        nextDue = d.toISOString().slice(0, 10);
      } else {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(fp.dueDay || 1);
        nextDue = d.toISOString().slice(0, 10);
      }

      return {
        ...state,
        financePayments: state.financePayments.map(f => f.id === action.id ? {
          ...f,
          monthsRemaining: newMonths,
          status: newStatus,
          nextDueDate: nextDue,
          payments: [
            ...(f.payments || []),
            {
              date: paymentDate,
              amount: payAmount,
              paymentMethod: action.paymentMethod || 'bank_transfer',
              bankAccountId: action.bankAccountId,
              note: action.note,
            },
          ],
        } : f),
      };
    }
    case 'DELETE_FINANCE_PAYMENT_PAYMENT': {
      return {
        ...state,
        financePayments: state.financePayments.map(f => {
          if (f.id !== action.id) return f;
          const target = (f.payments || []).find(p => (p.id || p._id) === action.paymentId);
          const payments = (f.payments || []).filter(p => (p.id || p._id) !== action.paymentId);
          if (!target) return { ...f, payments };

          const newMonths = (f.monthsRemaining || 0) + 1;
          const newStatus = f.status === 'completed' ? 'active' : f.status;
          let nextDue = f.nextDueDate;
          if (nextDue) {
            const d = new Date(`${nextDue}T00:00:00.000Z`);
            d.setUTCMonth(d.getUTCMonth() - 1);
            nextDue = d.toISOString().slice(0, 10);
          }

          return {
            ...f,
            monthsRemaining: newMonths,
            status: newStatus,
            nextDueDate: nextDue,
            payments,
          };
        }),
      };
    }
    case 'ADD_BANK_ACCOUNT': return { ...state, bankAccounts: [...state.bankAccounts, action.entry] };
    case 'UPDATE_BANK_ACCOUNT': return { ...state, bankAccounts: state.bankAccounts.map(b => b.id === action.entry.id ? action.entry : b) };
    case 'DELETE_BANK_ACCOUNT': return { ...state, bankAccounts: state.bankAccounts.filter(b => b.id !== action.id) };
    case 'ADD_CARD': return { ...state, cards: [...state.cards, action.entry] };
    case 'UPDATE_CARD': return { ...state, cards: state.cards.map(c => c.id === action.entry.id ? action.entry : c) };
    case 'DELETE_CARD': return { ...state, cards: state.cards.filter(c => c.id !== action.id) };
    case 'ADD_TRANSACTION': return { ...state, transactions: [action.entry, ...state.transactions] };
    case 'DELETE_TRANSACTION': return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
    case 'TRANSFER_FUNDS': {
      let updatedAccounts = state.bankAccounts;
      let updatedCards = state.cards;

      if (action.fromAccountId) {
        updatedAccounts = updatedAccounts.map(a =>
          a.id === action.fromAccountId ? { ...a, currentBalance: (a.currentBalance || 0) - action.amount } : a
        );
      } else if (action.fromCardId) {
        updatedCards = updatedCards.map(c =>
          c.id === action.fromCardId ? { ...c, currentBalance: (c.currentBalance || 0) + action.amount } : c
        );
      }

      if (action.toAccountId) {
        updatedAccounts = updatedAccounts.map(a =>
          a.id === action.toAccountId ? { ...a, currentBalance: (a.currentBalance || 0) + action.amount } : a
        );
      } else if (action.toCardId) {
        updatedCards = updatedCards.map(c =>
          c.id === action.toCardId ? { ...c, currentBalance: Math.max(0, (c.currentBalance || 0) - action.amount) } : c
        );
      }

      return {
        ...state,
        bankAccounts: updatedAccounts,
        cards: updatedCards,
      };
    }
    case 'DELETE_TRANSFER': return {
      ...state,
      transactions: state.transactions.filter(t => t.transferGroupId !== action.transferGroupId),
    };
    case 'ADD_LOAN': return { ...state, loans: [...state.loans, action.entry] };
    case 'UPDATE_LOAN': return { ...state, loans: state.loans.map(l => l.id === action.entry.id ? action.entry : l) };
    case 'RECORD_LOAN_REPAYMENT': return {
      ...state,
      loans: state.loans.map(l => l.id === action.id ? {
        ...l,
        balance: Math.max(0, l.balance - action.amount),
        repayments: [
          ...(l.repayments || []),
          {
            date: action.date || new Date().toISOString().slice(0, 10),
            amount: action.amount,
            note: action.note,
            paymentMethod: action.paymentMethod || 'cash',
            bankAccountId: action.bankAccountId,
          },
        ],
      } : l),
    };
    case 'DELETE_LOAN_REPAYMENT': return {
      ...state,
      loans: state.loans.map(l => {
        if (l.id !== action.id) return l;
        const reps = (l.repayments || []).filter(r => (r.id || r._id) !== action.repaymentId);
        const totalRepaid = reps.reduce((sum, r) => sum + r.amount, 0);
        return {
          ...l,
          balance: Math.max(0, l.principal - totalRepaid),
          repayments: reps,
        };
      }),
    };
    case 'DELETE_LOAN': return { ...state, loans: state.loans.filter(l => l.id !== action.id) };
    case 'ADD_PAWNED': return { ...state, pawnedItems: [...state.pawnedItems, action.entry] };
    case 'RECORD_PAWN_PAYMENT': {
      const p = state.pawnedItems.find(pi => pi.id === action.id);
      if (!p) return state;
      const pType = action.paymentType || 'interest';
      const paymentDate = action.date || new Date().toISOString().slice(0, 10);
      const currentPrincipal = p.principalOutstanding !== undefined ? p.principalOutstanding : p.amountReceived;
      let payAmount = action.amount;
      if (!payAmount) {
        if (pType === 'interest') payAmount = Math.max(1, Math.round(currentPrincipal * (p.interestRate / 100) / 12));
        else if (pType === 'redemption') payAmount = currentPrincipal;
        else payAmount = 0;
      }
      let newNextDue = p.nextDue;
      let newInterestPaid = p.interestPaid || 0;
      let newPrincipalOutstanding = currentPrincipal;
      let newStatus = p.status || 'active';
      let newRedemptionDate = p.redemptionDate;

      if (pType === 'interest') {
        newInterestPaid += payAmount;
        const nextDate = new Date(`${p.nextDue}T00:00:00.000Z`);
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        newNextDue = nextDate.toISOString().slice(0, 10);
      } else if (pType === 'part_principal') {
        newPrincipalOutstanding = Math.max(0, currentPrincipal - payAmount);
        if (newPrincipalOutstanding === 0) {
          newStatus = 'redeemed';
          newRedemptionDate = paymentDate;
        }
      } else if (pType === 'redemption') {
        newPrincipalOutstanding = 0;
        newStatus = 'redeemed';
        newRedemptionDate = paymentDate;
      }

      return {
        ...state,
        pawnedItems: state.pawnedItems.map(pi => pi.id === action.id ? {
          ...pi,
          nextDue: newNextDue,
          interestPaid: newInterestPaid,
          principalOutstanding: newPrincipalOutstanding,
          status: newStatus,
          redemptionDate: newRedemptionDate,
          payments: [
            ...(pi.payments || []),
            {
              date: paymentDate,
              amount: payAmount,
              paymentType: pType,
              paymentMethod: action.paymentMethod || 'cash',
              bankAccountId: action.bankAccountId,
              note: action.note,
            },
          ],
        } : pi),
      };
    }
    case 'DELETE_PAWN_PAYMENT': {
      return {
        ...state,
        pawnedItems: state.pawnedItems.map(pi => {
          if (pi.id !== action.id) return pi;
          const target = (pi.payments || []).find(p => (p.id || p._id) === action.paymentId);
          const payments = (pi.payments || []).filter(p => (p.id || p._id) !== action.paymentId);
          if (!target) return { ...pi, payments };

          let nextDue = pi.nextDue;
          let interestPaid = pi.interestPaid || 0;
          let principalOutstanding = pi.principalOutstanding !== undefined ? pi.principalOutstanding : pi.amountReceived;
          let status = pi.status || 'active';
          let redemptionDate = pi.redemptionDate;

          if (target.paymentType === 'interest') {
            interestPaid = Math.max(0, interestPaid - target.amount);
            const dueDate = new Date(`${pi.nextDue}T00:00:00.000Z`);
            dueDate.setUTCMonth(dueDate.getUTCMonth() - 1);
            nextDue = dueDate.toISOString().slice(0, 10);
          } else if (target.paymentType === 'part_principal' || target.paymentType === 'redemption') {
            principalOutstanding = principalOutstanding + target.amount;
            if (status === 'redeemed' && principalOutstanding > 0) {
              status = 'active';
              redemptionDate = '';
            }
          }

          return {
            ...pi,
            nextDue,
            interestPaid,
            principalOutstanding,
            status,
            redemptionDate,
            payments,
          };
        }),
      };
    }
    case 'DELETE_PAWNED': return { ...state, pawnedItems: state.pawnedItems.filter(p => p.id !== action.id) };
    case 'ADD_GOAL': return { ...state, savingsGoals: [...state.savingsGoals, action.entry] };
    case 'UPDATE_GOAL': return {
      ...state,
      savingsGoals: state.savingsGoals.map(g => g.id === action.id
        ? {
            ...g,
            dailyAmount: action.dailyAmount !== undefined ? action.dailyAmount : g.dailyAmount,
            monthlyTarget: action.monthlyTarget !== undefined ? action.monthlyTarget : g.monthlyTarget,
            targetAmount: action.targetAmount !== undefined ? action.targetAmount : g.targetAmount,
            targetDate: action.targetDate !== undefined ? action.targetDate : g.targetDate,
            savedAmount: action.savedAmount !== undefined ? action.savedAmount : g.savedAmount,
          } : g),
    };
    case 'DELETE_GOAL': return { ...state, savingsGoals: state.savingsGoals.filter(g => g.id !== action.id) };
    case 'ADD_SAVING_CONTRIBUTION': return {
      ...state,
      savingsGoals: state.savingsGoals.map(g => g.id === action.goalId
        ? {
            ...g,
            savedAmount: g.savedAmount + action.amount,
            contributions: [
              ...(g.contributions || []),
              {
                date: action.date,
                amount: action.amount,
                note: action.note,
                paymentMethod: action.debitAccount ? (action.paymentMethod || 'cash') : undefined,
                bankAccountId: action.bankAccountId,
              },
            ],
          }
        : g),
    };
    case 'DELETE_SAVING_CONTRIBUTION': return {
      ...state,
      savingsGoals: state.savingsGoals.map(g => {
        if (g.id !== action.goalId) return g;
        const target = (g.contributions || []).find(c => (c.id || c._id) === action.contributionId);
        const contributions = (g.contributions || []).filter(c => (c.id || c._id) !== action.contributionId);
        const savedAmount = target ? Math.max(0, g.savedAmount - target.amount) : g.savedAmount;
        return {
          ...g,
          savedAmount,
          contributions,
        };
      }),
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
    case 'ADD_OWNER_DRAW': {
      const linkedIncId = 'inc_draw_' + action.entry.id;
      const comp = state.companies.find(c => c.id === action.entry.companyId);
      const linkedIncome: IncomeEntry = {
        id: linkedIncId,
        source: comp?.name ? `${comp.name} (Draw)` : 'Company Owner Draw',
        type: 'business',
        amount: action.entry.amount,
        frequency: 'one-time',
        date: action.entry.date,
      };
      const alreadyHasIncome = state.income.some(i => i.id === linkedIncId);
      return {
        ...state,
        ownerDraws: [...state.ownerDraws, action.entry],
        income: alreadyHasIncome ? state.income : [...state.income, linkedIncome],
      };
    }
    case 'ADD_MEDICAL_EXPENSE': {
      const medExpenseId = action.entry.expenseId || ('exp_med_' + action.entry.id);
      const alreadyHasExpense = state.expenses.some(e => e.id === medExpenseId || (e.sourceType === 'medical' && e.sourceId === action.entry.id));
      const linkedExpense: ExpenseEntry = {
        id: medExpenseId,
        date: action.entry.date,
        amount: action.entry.amount,
        category: 'Medical',
        note: action.entry.note ? `Medical: ${action.entry.type} · ${action.entry.note}` : `Medical: ${action.entry.type}`,
        recurring: false,
        sourceType: 'medical',
        sourceId: action.entry.id,
      };
      return {
        ...state,
        medicalExpenses: [...state.medicalExpenses, { ...action.entry, expenseId: medExpenseId }],
        expenses: alreadyHasExpense ? state.expenses : [...state.expenses, linkedExpense],
      };
    }
    case 'DELETE_MEDICAL_EXPENSE': {
      const target = state.medicalExpenses.find(m => m.id === action.id);
      const linkedExpId = target?.expenseId;
      return {
        ...state,
        medicalExpenses: state.medicalExpenses.filter(m => m.id !== action.id),
        expenses: state.expenses.filter(e => e.id !== linkedExpId && !(e.sourceType === 'medical' && e.sourceId === action.id)),
      };
    }
    case 'ADD_DOCUMENT': return { ...state, documents: [...state.documents, action.entry] };
    case 'DELETE_DOCUMENT': return { ...state, documents: state.documents.filter(d => d.id !== action.id) };
    case 'ADD_REMINDER': return { ...state, reminders: [...state.reminders, action.entry] };
    case 'UPDATE_REMINDER': return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, status: action.status } : r) };
    case 'DELETE_REMINDER': return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };
    case 'ADD_LOAN_FROM_SHORTFALL': {
      const localId = action.id || ('loan_' + Date.now());
      action.id = localId;
      const loan: Loan = {
        id: localId,
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

export type Toast = { id: string; message: string; tone: 'success' | 'error' | 'info' };

export interface LoadErrorInfo {
  message: string;
  status?: number;
  collection?: string;
}

const AppContext = createContext<{
  state: AppState;
  dispatch: (action: Action) => Promise<string | undefined>;
  showToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  loadError?: string | null;
  loadErrorInfo?: LoadErrorInfo | null;
  isLoading?: boolean;
  retryLoad?: () => Promise<void>;
} | null>(null);

export function AppProvider({ children, initialProfile = {} }: { children: ReactNode; initialProfile?: Partial<AppState['profile']> }) {
  const [state, reduce] = useReducer(reducer, {
    ...emptyInitialState,
    profile: {
      ...emptyInitialState.profile,
      ...initialProfile,
      darkMode: initialProfile?.darkMode !== undefined ? initialProfile.darkMode : true,
    },
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const toast = useToast();
  const showToast = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    toast(message, tone);
  }, [toast]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorInfo, setLoadErrorInfo] = useState<LoadErrorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setLoadErrorInfo(null);
    try {
      const currentPlan = (stateRef.current?.profile?.plan || initialProfile?.plan || 'basic') as UserPlan;
      const data = await loadPersistedData(currentPlan);
      reduce({ type: 'HYDRATE', data });
      setIsLoading(false);
    } catch (error: any) {
      console.error('Unable to load account records', error);
      const msg = error?.message || 'Unable to connect to the backend server. Please verify your connection and retry.';
      setLoadError(msg);
      setLoadErrorInfo({
        message: msg,
        status: typeof error?.status === 'number' ? error.status : undefined,
        collection: typeof error?.collection === 'string' ? error.collection : undefined,
      });
      setIsLoading(false);
    }
  }, [initialProfile?.plan]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshFromServer = async () => {
    const currentPlan = (stateRef.current?.profile?.plan || initialProfile?.plan || 'basic') as UserPlan;
    reduce({ type: 'HYDRATE', data: await loadPersistedData(currentPlan) });
  };

  const dispatch = async (action: Action): Promise<string | undefined> => {
    const prevState = stateRef.current;
    reduce(action);
    if (action.type === 'HYDRATE' || action.type === 'REPLACE_RECORD_ID' || action.type === 'ROLLBACK') return undefined;
    try {
      const serverId = await persistStoreAction(action);
      const collectionByAction: Record<string, PersistedCollection> = {
        ADD_INCOME: 'income', ADD_EXPENSE: 'expenses', ADD_FINANCE_PAYMENT: 'financePayments', ADD_LOAN: 'loans',
        ADD_BANK_ACCOUNT: 'bankAccounts', ADD_CARD: 'cards', ADD_TRANSACTION: 'transactions',
        ADD_PAWNED: 'pawnedItems', ADD_GOAL: 'savingsGoals', ADD_LETTER: 'letters', ADD_AGREEMENT: 'agreements',
        ADD_COMPANY: 'companies', ADD_BRANCH: 'businessBranches', ADD_EMPLOYMENT: 'employmentProfiles',
        ADD_OWNER_DRAW: 'ownerDraws', ADD_MEDICAL_EXPENSE: 'medicalExpenses', ADD_DOCUMENT: 'documents', ADD_REMINDER: 'reminders',
        ADD_LOAN_FROM_SHORTFALL: 'loans',
      };
      const collection = collectionByAction[action.type];
      const localId = action.type === 'ADD_LOAN_FROM_SHORTFALL'
        ? String(action.id)
        : ('entry' in action && action.entry && 'id' in action.entry ? String(action.entry.id) : undefined);
      if (serverId && collection && localId) reduce({ type: 'REPLACE_RECORD_ID', collection, localId, serverId });

      // Handle plan change hydration/clearance
      const nextPlan = action.type === 'SET_PLAN'
        ? action.plan
        : (action.type === 'UPDATE_PROFILE' && action.profile?.plan ? action.profile.plan : undefined);

      if (nextPlan && nextPlan !== prevState.profile.plan) {
        if (nextPlan === 'business') {
          try {
            const businessData = await loadBusinessData();
            reduce({ type: 'HYDRATE', data: businessData });
          } catch (e) {
            console.warn('[store] Failed to load business records after plan upgrade:', e);
          }
        } else if (nextPlan === 'basic') {
          reduce({
            type: 'HYDRATE',
            data: {
              companies: [],
              businessBranches: [],
              ownerDraws: [],
              agreements: [],
            },
          });
        }
      }

      // The ledger (balances, principal/interest splits, payment ids, cascades) is computed
      // server-side, so reconcile instead of trusting the optimistic local estimate.
      if (SERVER_RECONCILED_ACTIONS.has(action.type)) {
        void refreshFromServer().catch(e => console.warn('[store] Failed to refresh records after save:', e));
      }

      return serverId;
    } catch (error: any) {
      console.error('Unable to save account change', error);
      try {
        await refreshFromServer();
      } catch {
        reduce({ type: 'ROLLBACK', previousState: prevState });
      }
      toast.error(error?.message || 'Failed to save changes. Reverting...');
      return undefined;
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="w-full max-w-md p-6 rounded-3xl border border-danger-solid/30 bg-surface shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-danger-tint text-danger-text mx-auto flex items-center justify-center">
            <Icon name="alert" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Failed to load account records</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {loadError}
            </p>
            {(loadErrorInfo?.status || loadErrorInfo?.collection) && (
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-danger-tint text-[11px] font-mono text-danger-text border border-danger-solid/20">
                {loadErrorInfo.status && <span>HTTP {loadErrorInfo.status}</span>}
                {loadErrorInfo.status && loadErrorInfo.collection && <span>•</span>}
                {loadErrorInfo.collection && <span>collection: {loadErrorInfo.collection}</span>}
              </div>
            )}
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void loadData()}
              iconLeft={<Icon name="refresh" size={14} />}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, dispatch, showToast, loadError, loadErrorInfo, isLoading, retryLoad: loadData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export { formatRs } from '@/utils/formatCurrency';

export * from '@/lib/money';

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
