'use server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';
import { SavingsGoalModel } from '@/models/SavingsGoal';
import { PersonalBudgetModel } from '@/models/PersonalBudget';
import { z } from 'zod';
import { rupeesToCents } from '@/lib/finance';

export async function addGoal(data: { name: string; dailyAmount: number; endDate: string }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ name: z.string().min(1), dailyAmount: z.coerce.number().positive(), endDate: z.string().optional() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const dailyCents = rupeesToCents(parsed.data.dailyAmount);
  const monthlyTarget = dailyCents * 30;
  await SavingsGoalModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), name: parsed.data.name, dailyAmountCents: dailyCents, monthlyTargetCents: monthlyTarget, endDate: parsed.data.endDate || '', savedAmountCents: 0, contributions: [] });
  revalidatePath('/goals');
  return { ok: true };
}

export async function updateGoal(id: string, data: { dailyAmount: number }) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ dailyAmount: z.coerce.number().positive() }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const goal = await SavingsGoalModel.findOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!goal) return { error: 'Not found' };
  const dailyCents = rupeesToCents(parsed.data.dailyAmount);
  goal.dailyAmountCents = dailyCents;
  goal.monthlyTargetCents = dailyCents * 30;
  await goal.save();
  revalidatePath('/goals');
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  await SavingsGoalModel.deleteOne({ _id: id, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  revalidatePath('/goals');
  return { ok: true };
}

export async function addContribution(goalId: string, amount: number, date: string) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ amount: z.coerce.number().positive(), date: z.string() }).safeParse({ amount, date });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const goal = await SavingsGoalModel.findOne({ _id: goalId, userId: new (await import('mongoose')).default.Types.ObjectId(user.userId) });
  if (!goal) return { error: 'Not found' };
  goal.contributions = [...goal.contributions, { date: parsed.data.date, amountCents: rupeesToCents(parsed.data.amount) }];
  goal.savedAmountCents += rupeesToCents(parsed.data.amount);
  await goal.save();
  revalidatePath('/goals');
  return { ok: true };
}

export async function setPersonalBudget(budget: number) {
  const user = await getSessionUser();
  if (!user) return { error: 'Unauthorized' };
  const parsed = z.object({ budget: z.coerce.number().min(0) }).safeParse({ budget });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await PersonalBudgetModel.findOneAndUpdate(
    { userId: new (await import('mongoose')).default.Types.ObjectId(user.userId), month: new Date().toISOString().slice(0, 7) },
    { budgetCents: rupeesToCents(parsed.data.budget) },
    { upsert: true, new: true }
  );
  revalidatePath('/goals');
  return { ok: true };
}
