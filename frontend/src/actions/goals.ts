'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

async function request(path: string, method: string, data?: unknown) {
  const result = await backendApi(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
  if (result.ok) revalidatePath('/goals');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}

export const addGoal = (data: { name: string; dailyAmount: number; endDate: string }) => request('/api/records/goals', 'POST', data);
export const updateGoal = (id: string, data: { dailyAmount: number }) => request(`/api/records/goals/${encodeURIComponent(id)}`, 'PATCH', data);
export const deleteGoal = (id: string) => request(`/api/records/goals/${encodeURIComponent(id)}`, 'DELETE');
export const addContribution = (goalId: string, amount: number, date: string) => request(`/api/records/goals/${encodeURIComponent(goalId)}/contributions`, 'POST', { amount, date });
export const setPersonalBudget = (budget: number) => request('/api/profile/personal-budget', 'PUT', { budget });
