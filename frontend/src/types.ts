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
  profilePictureFileId?: string;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  number: string;
}

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'cheque'
  | 'standing_order'
  | 'online'
  | 'other';

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  branch?: string;
  branchCode?: string;
  swiftCode?: string;
  accountType?: 'savings' | 'checking' | 'current' | 'business' | 'other';
  currentBalance: number;
  currency?: string;
  notes?: string;
}

export interface Card {
  id: string;
  name: string;
  bankAccountId?: string;
  cardType: 'credit' | 'debit';
  cardNumber?: string;
  cardHolder?: string;
  lastFourDigits: string;
  cardNetwork?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  expiryDate?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  creditLimit?: number;
  currentBalance?: number;
  billingDay?: number;
  dueDay?: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  category?: string;
  description?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  cardId?: string;
  sourceRecordId?: string;
  sourceRecordKind?: string;
  balanceAfter?: number;
}

export interface IncomeEntry {
  id: string;
  source: string;
  type: 'salary' | 'business' | 'other';
  amount: number;
  frequency: 'monthly' | 'weekly' | 'daily' | 'one-time';
  date: string;
  paymentMethod?: PaymentMethod;
  bankAccountId?: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  recurring: boolean;
  paymentMethod?: PaymentMethod;
  bankAccountId?: string;
  cardId?: string;
}

export interface FinancePayment {
  id: string;
  lender: string;
  amount: number;
  dueDay: number;
  monthsRemaining: number;
  paymentKind?: 'instalment' | 'lease' | 'cheque' | 'standing_order';
  chequeNumber?: string;
  bankAccountId?: string;
  payee?: string;
  frequency?: 'monthly' | 'weekly' | 'quarterly' | 'annually' | 'one-time';
  status?: 'active' | 'cleared' | 'cancelled' | 'pending';
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  rate: number;
  method: 'simple' | 'compound' | 'reducing_balance';
  startDate: string;
  dueDate: string;
  balance: number;
  interestBasis?: 'annual' | 'monthly';
  tenureMonths?: number;
  monthlyPayment?: number;
  totalInterest?: number;
  repayments?: { date: string; amount: number; note?: string }[];
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
  targetAmount?: number;
  targetDate?: string;
  contributions: { date: string; amount: number; note?: string }[];
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
  brNumber?: string;
  tinNumber?: string;
  entityType?: 'sole_proprietorship' | 'partnership' | 'pvt_ltd' | 'public_ltd' | 'other' | string;
  sector?: string;
  email?: string;
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
  fileId?: string;
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
  bankAccounts: BankAccount[];
  cards: Card[];
  transactions: Transaction[];
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
