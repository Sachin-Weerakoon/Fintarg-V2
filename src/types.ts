export type UserPlan = 'basic' | 'business';
export type WorkMode = 'salary' | 'business' | 'both';
export type Page = 'onboarding' | 'setup' | 'dashboard' | 'financial' | 'analysis' | 'goals' | 'documents' | 'letters' | 'medical' | 'advanced' | 'settings';

export interface UserProfile {
  name: string;
  address: string;
  dateOfBirth: string;
  nicNumber: string;
  portfolioLink: string;
  email: string;
  mobile: string;
  plan: UserPlan;
  workMode: WorkMode;
  themeColor: string;
  darkMode: boolean;
  textSize: 'small' | 'medium' | 'large';
  colorText: string;
  colorMuted: string;
  colorBg: string;
  colorSurface: string;
  contacts: Contact[];
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  number: string;
}

export interface IncomeEntry {
  id: string;
  source: string;
  type: 'salary' | 'business' | 'other';
  amount: number;
  frequency: 'monthly' | 'weekly' | 'daily' | 'one-time';
  date: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  recurring: boolean;
}

export interface FinancePayment {
  id: string;
  lender: string;
  amount: number;
  dueDay: number;
  monthsRemaining: number;
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  rate: number;
  method: 'simple' | 'compound';
  startDate: string;
  dueDate: string;
  balance: number;
}

export interface PawnedItem {
  id: string;
  description: string;
  amountReceived: number;
  interestRate: number;
  nextDue: string;
  redemptionDate: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  dailyAmount: number;
  monthlyTarget: number;
  endDate: string;
  savedAmount: number;
  contributions: { date: string; amount: number }[];
}

export interface Letter {
  id: string;
  type: 'bank' | 'offer' | 'general';
  mode: 'personal' | 'business';
  date: string;
  addressedTo: string;
  purpose: string;
  body: string;
  companyId?: string;
}

export interface Agreement {
  id: string;
  title: string;
  otherParty: string;
  startDate: string;
  endDate: string;
  value: number;
  summary: string;
  status: 'draft' | 'active' | 'expired';
  fileName: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  contact: string;
  logo: string;
  businessType?: string;
  openingDate?: string;
}

export interface BranchEntry {
  id: string;
  date: string;
  type: 'revenue' | 'utility' | 'other-cost';
  category: string;
  amount: number;
  note: string;
}

export interface BusinessBranch {
  id: string;
  companyId: string;
  name: string;
  location: string;
  branchType?: string;
  openingDate?: string;
  logo?: string;
  monthlyTarget: number;
  annualTarget: number;
  entries: BranchEntry[];
}

export interface EmploymentProfile {
  id: string;
  employer: string;
  role: string;
  monthlyGross: number;
  payday: number;
  monthlyDeductions: number;
  monthlySavingsTarget: number;
  careerGoal: string;
}

export interface OwnerDraw {
  id: string;
  companyId: string;
  amount: number;
  date: string;
}

export interface MedicalExpense {
  id: string;
  date: string;
  type: string;
  amount: number;
  note: string;
}

export interface Document {
  id: string;
  type: 'profile-picture' | 'cv' | 'nic-front' | 'nic-back' | 'bank' | 'other';
  label: string;
  uploadDate: string;
  note: string;
  fileName: string;
}

export interface Reminder {
  id: string;
  type: 'finance' | 'loan' | 'pawn' | 'agreement' | 'appointment' | 'custom';
  relatedId: string;
  label: string;
  dueDate: string;
  channel: 'email' | 'in-app';
  status: 'pending' | 'sent' | 'dismissed';
}

export interface AppState {
  currentPage: Page;
  selectedMonth: string;
  profile: UserProfile;
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  financePayments: FinancePayment[];
  loans: Loan[];
  pawnedItems: PawnedItem[];
  savingsGoals: SavingsGoal[];
  personalSpendingBudget: number;
  letters: Letter[];
  agreements: Agreement[];
  companies: Company[];
  businessBranches: BusinessBranch[];
  employmentProfiles: EmploymentProfile[];
  ownerDraws: OwnerDraw[];
  medicalExpenses: MedicalExpense[];
  documents: Document[];
  reminders: Reminder[];
  setupComplete: boolean;
}
