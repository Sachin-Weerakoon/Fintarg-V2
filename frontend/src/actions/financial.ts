'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

async function request(path: string, method: string, data?: unknown) {
  const result = await backendApi(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
  if (result.ok) revalidatePath('/financial');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}

const create = (kind: string, data: unknown) => request(`/api/records/${kind}`, 'POST', data);
const update = (kind: string, id: string, data: unknown) => request(`/api/records/${kind}/${encodeURIComponent(id)}`, 'PATCH', data);
const remove = (kind: string, id: string) => request(`/api/records/${kind}/${encodeURIComponent(id)}`, 'DELETE');

export const addIncome = (data: { source: string; type: string; amount: number; frequency: string; date: string }) => create('incomes', data);
export const updateIncome = (id: string, data: { source: string; type: string; amount: number; frequency: string; date: string }) => update('incomes', id, data);
export const deleteIncome = (id: string) => remove('incomes', id);
export const addExpense = (data: { date: string; amount: number; category: string; note: string; recurring: boolean }) => create('expenses', data);
export const updateExpense = (id: string, data: { date: string; amount: number; category: string; note: string; recurring: boolean }) => update('expenses', id, data);
export const deleteExpense = (id: string) => remove('expenses', id);
export const addFinancePayment = (data: { lender: string; amount: number; dueDay: number; monthsRemaining: number }) => create('financePayments', data);
export const deleteFinancePayment = (id: string) => remove('financePayments', id);
export const addLoan = (data: { lender: string; amount: number; rate: number; method: string; startDate: string; dueDate: string }) => create('loans', data);
export const deleteLoan = (id: string) => remove('loans', id);
export const addPawnedItem = (data: { description: string; amountReceived: number; interestRate: number; nextDue: string; redemptionDate: string }) => create('pawnedItems', data);
export const recordLoanRepayment = (id: string, amount: number) => request(`/api/records/loans/${encodeURIComponent(id)}/repay`, 'POST', { amount });
export const recordPawnPayment = (id: string) => request(`/api/records/pawnedItems/${encodeURIComponent(id)}/payment`, 'POST');
