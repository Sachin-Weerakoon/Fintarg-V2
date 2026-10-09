import { z } from 'zod';

const money = z.coerce.number().finite().positive().max(1_000_000_000);
const date = z.string().trim().min(1).max(32);
const optionalText = z.string().trim().max(2000).default('');

export const recordSchemas = {
  incomes: z.object({ source: z.string().trim().min(1).max(120), type: z.enum(['salary', 'business', 'other']), amount: money, frequency: z.enum(['monthly', 'weekly', 'daily', 'one-time']), date }),
  expenses: z.object({ date, amount: money, category: z.string().trim().min(1).max(80), note: optionalText, recurring: z.boolean().default(false) }),
  financePayments: z.object({ lender: z.string().trim().min(1).max(120), amount: money, dueDay: z.coerce.number().int().min(1).max(31), monthsRemaining: z.coerce.number().int().min(1).max(1200) }),
  loans: z.object({ lender: z.string().trim().min(1).max(120), amount: money, rate: z.coerce.number().min(0).max(1000), method: z.enum(['simple', 'compound']), startDate: date, dueDate: z.string().trim().max(32).default('') }),
  pawnedItems: z.object({ description: z.string().trim().min(1).max(500), amountReceived: money, interestRate: z.coerce.number().min(0).max(1000), nextDue: date, redemptionDate: z.string().trim().max(32).default('') }),
  goals: z.object({ name: z.string().trim().min(1).max(120), dailyAmount: money, endDate: z.string().optional().default('') }),
  medicalExpenses: z.object({ date, type: z.string().trim().min(1).max(120), amount: money, note: optionalText }),
  reminders: z.object({ type: z.enum(['finance', 'loan', 'pawn', 'agreement', 'appointment', 'custom']), relatedId: z.string().default(''), label: z.string().trim().min(1).max(180), dueDate: date, channel: z.enum(['email', 'in-app']).default('in-app') }),
  companies: z.object({ name: z.string().trim().min(1).max(160), address: optionalText, contact: z.string().max(120).default(''), logo: z.string().max(1000).default(''), businessType: z.string().max(120).default(''), openingDate: z.string().max(32).default('') }),
  businessBranches: z.object({ companyId: z.string().min(1), name: z.string().trim().min(1).max(160), location: z.string().max(300).default(''), branchType: z.string().max(120).default(''), openingDate: z.string().max(32).default(''), logo: z.string().max(1000).default(''), monthlyTarget: z.coerce.number().min(0), annualTarget: z.coerce.number().min(0), entries: z.array(z.object({ id: z.string().optional(), date, type: z.enum(['revenue', 'utility', 'other-cost']), category: z.string().max(120), amount: money, note: optionalText })).default([]) }),
  branchEntries: z.object({ branchId: z.string().min(1), date, type: z.enum(['revenue', 'utility', 'other-cost']), category: z.string().trim().min(1).max(120), amount: money, note: optionalText }),
  employmentProfiles: z.object({ employer: z.string().trim().min(1).max(180), role: z.string().max(180).default(''), monthlyGross: money, payday: z.coerce.number().int().min(1).max(31), monthlyDeductions: z.coerce.number().min(0), monthlySavingsTarget: z.coerce.number().min(0), careerGoal: z.string().max(1000).default('') }),
  ownerDraws: z.object({ companyId: z.string().min(1), amount: money, date }),
  agreements: z.object({ title: z.string().trim().min(1).max(180), otherParty: z.string().trim().min(1).max(180), startDate: z.string().max(32).default(''), endDate: z.string().max(32).default(''), value: z.coerce.number().min(0).default(0), summary: optionalText, status: z.enum(['draft', 'active', 'expired']), fileName: z.string().max(255).default('') }),
  letters: z.object({ type: z.enum(['bank', 'offer', 'general']), mode: z.enum(['personal', 'business']), date, addressedTo: z.string().max(180).default(''), purpose: z.string().max(500).default(''), body: z.string().trim().min(1).max(20000), companyId: z.string().optional() }),
  documents: z.object({ type: z.enum(['profile-picture', 'cv', 'nic-front', 'nic-back', 'bank', 'other']), label: z.string().trim().min(1).max(120), uploadDate: date, note: optionalText, fileName: z.string().trim().min(1).max(255), fileId: z.string().optional() }),
} as const;

export type RecordKind = keyof typeof recordSchemas;
export const recordKinds = Object.keys(recordSchemas) as RecordKind[];