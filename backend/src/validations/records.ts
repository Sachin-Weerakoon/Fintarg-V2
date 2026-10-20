import { z } from 'zod';

const money = z.coerce.number().finite().positive().max(1_000_000_000);

const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidIsoDate(val: string): boolean {
  if (!dateRegex.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

export function isValidIsoMonth(val: string): boolean {
  return monthRegex.test(val);
}

export const isoDateSchema = z.string().trim().refine(isValidIsoDate, {
  message: 'Must be a valid calendar date in YYYY-MM-DD format',
});

export const optionalIsoDateSchema = z.string().trim().refine(
  val => !val || isValidIsoDate(val),
  { message: 'Must be a valid calendar date in YYYY-MM-DD format or empty' },
);

export const isoMonthSchema = z.string().trim().refine(isValidIsoMonth, {
  message: 'Must be a valid month in YYYY-MM format',
});

export const paymentMethodEnum = z.enum([
  'cash',
  'card',
  'debit_card',
  'credit_card',
  'bank_transfer',
  'cheque',
  'standing_order',
  'online',
  'other',
]);

const date = isoDateSchema;
const optionalText = z.string().trim().max(2000).default('');

const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required').max(120),
  accountNumber: z.string().trim().min(1, 'Account number is required').max(64),
  accountName: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  branch: optionalText,
  branchCode: optionalText,
  swiftCode: optionalText,
  accountType: z.enum(['savings', 'current', 'checking', 'business', 'cash', 'other']).default('savings'),
  balance: z.coerce.number().finite().min(0).max(1_000_000_000).default(0),
  currentBalance: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  openingBalance: z.coerce.number().finite().max(1_000_000_000).optional(),
  openingBalanceCents: z.coerce.number().finite().max(100_000_000_000).optional(),
  currency: z.string().trim().max(10).default('LKR'),
  notes: optionalText,
  isDefault: z.boolean().default(false),
  isArchived: z.boolean().optional(),
});

const cardSchema = z.object({
  bankAccountId: z.string().optional().nullable(),
  cardName: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  cardHolder: optionalText,
  cardType: z.enum(['debit', 'credit']).default('debit'),
  cardNumber: z.string().trim().optional(),
  cardNetwork: z.enum(['visa', 'mastercard', 'amex', 'discover', 'other']).default('visa'),
  last4: z.string().trim().regex(/^\d{4}$/, 'last4 must be exactly 4 digits').optional(),
  lastFourDigits: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(),
  expiryMonth: z.coerce.number().int().min(1).max(12).optional(),
  expiryYear: z.coerce.number().int().min(2020).max(2100).optional(),
  cvv: z.string().trim().optional(),
  creditLimit: z.coerce.number().finite().min(0).max(1_000_000_000).default(0),
  balance: z.coerce.number().finite().min(0).max(1_000_000_000).default(0),
  currentBalance: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
});

const transactionSchema = z.object({
  bankAccountId: z.string().optional().nullable(),
  cardId: z.string().optional().nullable(),
  type: z.enum(['income', 'expense', 'transfer']),
  transferDirection: z.enum(['incoming', 'outgoing']).optional().nullable(),
  transferGroupId: z.string().optional().nullable(),
  amount: money,
  date,
  category: z.string().trim().max(80).default('General'),
  description: optionalText,
  paymentMethod: paymentMethodEnum.default('cash'),
  referenceId: z.string().trim().max(120).default(''),
});

export const transferSchema = z.object({
  fromAccountId: z.string().optional().nullable(),
  fromCardId: z.string().optional().nullable(),
  toAccountId: z.string().optional().nullable(),
  toCardId: z.string().optional().nullable(),
  amount: money,
  date,
  category: z.string().trim().max(80).default('Transfer'),
  description: optionalText,
}).superRefine((data, ctx) => {
  const hasFromAccount = Boolean(data.fromAccountId && data.fromAccountId.trim());
  const hasFromCard = Boolean(data.fromCardId && data.fromCardId.trim());
  if ((!hasFromAccount && !hasFromCard) || (hasFromAccount && hasFromCard)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Source must be either a bank account, card, or cash wallet',
      path: ['fromAccountId'],
    });
  }

  const hasToAccount = Boolean(data.toAccountId && data.toAccountId.trim());
  const hasToCard = Boolean(data.toCardId && data.toCardId.trim());
  if ((!hasToAccount && !hasToCard) || (hasToAccount && hasToCard)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Destination must be either a bank account, card, or cash wallet',
      path: ['toAccountId'],
    });
  }

  if (hasFromAccount && hasToAccount && data.fromAccountId === data.toAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Source and destination accounts must be different',
      path: ['toAccountId'],
    });
  }

  if (hasFromCard && hasToCard && data.fromCardId === data.toCardId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Source and destination cards must be different',
      path: ['toCardId'],
    });
  }
});

const incomeBaseSchema = z.object({
  source: z.string().trim().min(1).max(120),
  type: z.enum(['salary', 'business', 'other']),
  amount: money,
  frequency: z.enum(['monthly', 'weekly', 'daily', 'one-time']),
  date,
  paymentMethod: paymentMethodEnum.default('cash'),
  bankAccountId: z.string().optional().nullable(),
});

const incomeSchema = incomeBaseSchema.superRefine((data, ctx) => {
  const method = data.paymentMethod;
  if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
    if (!data.bankAccountId || data.bankAccountId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bank account is required for ${method.replace('_', ' ')} payments`,
        path: ['bankAccountId'],
      });
    }
  }
});

const expenseBaseSchema = z.object({
  date,
  amount: money,
  category: z.string().trim().min(1).max(80),
  note: optionalText,
  recurring: z.boolean().default(false),
  paymentMethod: paymentMethodEnum.default('cash'),
  bankAccountId: z.string().optional().nullable(),
  cardId: z.string().optional().nullable(),
  sourceType: z.enum(['salary', 'business']).optional().default('salary'),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
});

const expenseSchema = expenseBaseSchema.superRefine((data, ctx) => {
  const method = data.paymentMethod;
  if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
    if (!data.bankAccountId || data.bankAccountId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bank account is required for ${method.replace('_', ' ')} payments`,
        path: ['bankAccountId'],
      });
    }
  }
  if (method === 'credit_card') {
    if (!data.cardId || data.cardId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Credit card is required for credit card payments',
        path: ['cardId'],
      });
    }
  }
});

const financePaymentSchema = z.object({
  lender: z.string().trim().min(1).max(120),
  amount: money,
  dueDay: z.coerce.number().int().min(1).max(31),
  nextDueDate: optionalIsoDateSchema.default(''),
  monthsRemaining: z.coerce.number().int().min(0).max(1200),
  paymentKind: z.enum(['instalment', 'lease', 'cheque', 'standing_order']).default('instalment'),
  chequeNumber: z.string().trim().max(64).default(''),
  bankAccountId: z.string().optional().nullable(),
  payee: z.string().trim().max(120).default(''),
  frequency: z.enum(['monthly', 'one-time']).default('monthly'),
  status: z.enum(['active', 'completed', 'cleared', 'cancelled']).default('active'),
});

const loanSchema = z.object({
  lender: z.string().trim().min(1).max(120),
  amount: money,
  rate: z.coerce.number().min(0).max(1000),
  method: z.enum(['simple', 'compound', 'reducing_balance']).default('simple'),
  interestBasis: z.enum(['annual', 'monthly']).default('annual'),
  tenureMonths: z.coerce.number().int().min(1).max(600).default(12),
  startDate: date,
  dueDate: optionalIsoDateSchema.default(''),
});

const pawnedItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  ticketNumber: z.string().trim().max(64).default(''),
  amountReceived: money,
  principalOutstanding: z.coerce.number().min(0).max(1_000_000_000).optional(),
  interestPaid: z.coerce.number().min(0).max(1_000_000_000).optional(),
  interestRate: z.coerce.number().min(0).max(1000),
  nextDue: date,
  redemptionDate: optionalIsoDateSchema.default(''),
  status: z.enum(['active', 'redeemed', 'forfeited']).default('active'),
});

const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dailyAmount: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  targetAmount: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  targetDate: optionalIsoDateSchema.optional(),
  endDate: optionalIsoDateSchema.optional().default(''),
});

const medicalExpenseSchema = z.object({
  date,
  type: z.string().trim().min(1).max(120),
  amount: money,
  note: optionalText,
});

const reminderSchema = z.object({
  type: z.enum(['finance', 'loan', 'pawn', 'agreement', 'appointment', 'custom']),
  relatedId: z.string().default(''),
  label: z.string().trim().min(1).max(180),
  dueDate: date,
  channel: z.enum(['email', 'in-app']).default('in-app'),
});

const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: optionalText,
  contact: z.string().max(120).default(''),
  logo: z.string().max(1000).default(''),
  businessType: z.string().max(120).default(''),
  openingDate: optionalIsoDateSchema.default(''),
  brNumber: z.string().max(60).default(''),
  tinNumber: z.string().max(60).default(''),
  entityType: z.string().max(60).default(''),
  sector: z.string().max(120).default(''),
  email: z.string().max(120).default(''),
});

const businessBranchSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  location: z.string().max(300).default(''),
  branchType: z.string().max(120).default(''),
  openingDate: optionalIsoDateSchema.default(''),
  logo: z.string().max(1000).default(''),
  monthlyTarget: z.coerce.number().min(0),
  annualTarget: z.coerce.number().min(0),
  entries: z.array(z.object({
    id: z.string().optional(),
    date,
    type: z.enum(['revenue', 'utility', 'other-cost']),
    category: z.string().max(120),
    amount: money,
    note: optionalText,
  })).default([]),
});

const branchEntrySchema = z.object({
  branchId: z.string().min(1),
  date,
  type: z.enum(['revenue', 'utility', 'other-cost']),
  category: z.string().trim().min(1).max(120),
  amount: money,
  note: optionalText,
});

const employmentProfileSchema = z.object({
  employer: z.string().trim().min(1).max(180),
  role: z.string().max(180).default(''),
  monthlyGross: money,
  payday: z.coerce.number().int().min(1).max(31),
  monthlyDeductions: z.coerce.number().min(0),
  monthlySavingsTarget: z.coerce.number().min(0),
  careerGoal: z.string().max(1000).default(''),
});

const ownerDrawSchema = z.object({
  companyId: z.string().min(1),
  amount: money,
  date,
});

const agreementSchema = z.object({
  title: z.string().trim().min(1).max(180),
  otherParty: z.string().trim().min(1).max(180),
  startDate: optionalIsoDateSchema.default(''),
  endDate: optionalIsoDateSchema.default(''),
  value: z.coerce.number().min(0).default(0),
  summary: optionalText,
  status: z.enum(['draft', 'active', 'expired']),
  fileName: z.string().max(255).default(''),
});

const letterSchema = z.object({
  type: z.enum(['bank', 'offer', 'general']),
  mode: z.enum(['personal', 'business']),
  date,
  addressedTo: z.string().max(180).default(''),
  purpose: z.string().max(500).default(''),
  body: z.string().trim().min(1).max(20000),
  companyId: z.string().optional(),
});

const documentSchema = z.object({
  type: z.enum(['profile-picture', 'cv', 'nic-front', 'nic-back', 'bank', 'other']),
  label: z.string().trim().min(1).max(120),
  uploadDate: date,
  note: optionalText,
  fileName: z.string().trim().min(1).max(255),
  fileId: z.string().optional(),
});

export const recordSchemas = {
  bankAccounts: bankAccountSchema,
  cards: cardSchema,
  transactions: transactionSchema,
  incomes: incomeSchema,
  expenses: expenseSchema,
  financePayments: financePaymentSchema,
  loans: loanSchema,
  pawnedItems: pawnedItemSchema,
  goals: goalSchema,
  medicalExpenses: medicalExpenseSchema,
  reminders: reminderSchema,
  companies: companySchema,
  businessBranches: businessBranchSchema,
  branchEntries: branchEntrySchema,
  employmentProfiles: employmentProfileSchema,
  ownerDraws: ownerDrawSchema,
  agreements: agreementSchema,
  letters: letterSchema,
  documents: documentSchema,
};

export const recordUpdateSchemas = {
  bankAccounts: bankAccountSchema.partial(),
  cards: cardSchema.partial(),
  transactions: transactionSchema.partial(),
  incomes: incomeBaseSchema.partial(),
  expenses: expenseBaseSchema.partial(),
  financePayments: financePaymentSchema.partial(),
  loans: loanSchema.partial(),
  pawnedItems: pawnedItemSchema.partial(),
  goals: goalSchema.partial(),
  medicalExpenses: medicalExpenseSchema.partial(),
  reminders: reminderSchema.partial(),
  companies: companySchema.partial(),
  businessBranches: businessBranchSchema.partial(),
  branchEntries: branchEntrySchema.partial(),
  employmentProfiles: employmentProfileSchema.partial(),
  ownerDraws: ownerDrawSchema.partial(),
  agreements: agreementSchema.partial(),
  letters: letterSchema.partial(),
  documents: documentSchema.partial(),
};

export type RecordKind = keyof typeof recordSchemas;
export const recordKinds = Object.keys(recordSchemas) as RecordKind[];