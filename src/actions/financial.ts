'use server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';
import { IncomeModel } from '@/models/Income';
import { ExpenseModel } from '@/models/Expense';
import { FinancePaymentModel } from '@/models/FinancePayment';
import { LoanModel } from '@/models/Loan';
import { PawnedItemModel } from '@/models/PawnedItem';
import { z } from 'zod';
import { rupeesToCents } from '@/lib/finance';

export async function addIncome(data: { source: string; type: string; amount: number; frequency: string; date: string }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ source: z.string().min(1), type: z.enum(['salary', 'business', 'other']), amount: z.coerce.number().positive(), frequency: z.enum(['monthly', 'weekly', 'daily', 'one-time']), date: z.string() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await IncomeModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), ...parsed.data, amountCents: rupeesToCents(parsed.data.amount) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function updateIncome(id: string, data: { source: string; type: string; amount: number; frequency: string; date: string }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ source: z.string().min(1), type: z.enum(['salary', 'business', 'other']), amount: z.coerce.number().positive(), frequency: z.enum(['monthly', 'weekly', 'daily', 'one-time']), date: z.string() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const income = await IncomeModel.findOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!income) return { error: 'Not found' };
  Object.assign(income, parsed.data, { amountCents: rupeesToCents(parsed.data.amount) });
  await income.save();
  revalidatePath('/financial');
  return { ok: true };
}

export async function deleteIncome(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  await IncomeModel.deleteOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function addExpense(data: { date: string; amount: number; category: string; note: string; recurring: boolean }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ date: z.string(), amount: z.coerce.number().positive(), category: z.string().min(1), note: z.string().default(''), recurring: z.boolean().default(false) }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await ExpenseModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), ...parsed.data, amountCents: rupeesToCents(parsed.data.amount) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function updateExpense(id: string, data: { date: string; amount: number; category: string; note: string; recurring: boolean }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ date: z.string(), amount: z.coerce.number().positive(), category: z.string().min(1), note: z.string().default(''), recurring: z.boolean().default(false) }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const expense = await ExpenseModel.findOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!expense) return { error: 'Not found' };
  Object.assign(expense, parsed.data, { amountCents: rupeesToCents(parsed.data.amount) });
  await expense.save();
  revalidatePath('/financial');
  return { ok: true };
}

export async function deleteExpense(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  await ExpenseModel.deleteOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function addFinancePayment(data: { lender: string; amount: number; dueDay: number; monthsRemaining: number }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ lender: z.string().min(1), amount: z.coerce.number().positive(), dueDay: z.coerce.number().int().min(1).max(31), monthsRemaining: z.coerce.number().int().min(1) }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await FinancePaymentModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), ...parsed.data, amountCents: rupeesToCents(parsed.data.amount) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function deleteFinancePayment(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  await FinancePaymentModel.deleteOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function addLoan(data: { lender: string; amount: number; rate: number; method: string; startDate: string; dueDate: string }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ lender: z.string().min(1), amount: z.coerce.number().positive(), rate: z.coerce.number().min(0), method: z.enum(['simple', 'compound']), startDate: z.string(), dueDate: z.string() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.dueDate < parsed.data.startDate) return { error: 'Due date cannot be before start date' };
  const cents = rupeesToCents(parsed.data.amount);
  await LoanModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), ...parsed.data, principalCents: cents, balanceCents: cents });
  revalidatePath('/financial');
  return { ok: true };
}

export async function deleteLoan(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  await LoanModel.deleteOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function addPawnedItem(data: { description: string; amountReceived: number; interestRate: number; nextDue: string; redemptionDate: string }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ description: z.string().min(1), amountReceived: z.coerce.number().positive(), interestRate: z.coerce.number().min(0), nextDue: z.string(), redemptionDate: z.string() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await PawnedItemModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), ...parsed.data, amountReceivedCents: rupeesToCents(parsed.data.amountReceived) });
  revalidatePath('/financial');
  return { ok: true };
}

export async function recordLoanRepayment(id: string, amount: number) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const loan = await LoanModel.findOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!loan) return { error: 'Not found' };
  loan.balanceCents = Math.max(0, loan.balanceCents - rupeesToCents(amount));
  await loan.save();
  revalidatePath('/financial');
  return { ok: true };
}

export async function recordPawnPayment(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const item = await PawnedItemModel.findOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!item) return { error: 'Not found' };
  revalidatePath('/financial');
  return { ok: true };
}
