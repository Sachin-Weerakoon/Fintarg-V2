'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

export async function addMedicalExpense(data: {
  id: string;
  date: string;
  type: string;
  amount: number;
  note: string;
}) {
  const result = await backendApi('/api/records/medicalExpenses', { method: 'POST', body: JSON.stringify(data) });
  if (result.ok) revalidatePath('/advanced/medical');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}

export async function deleteMedicalExpense(id: string) {
  const result = await backendApi(`/api/records/medicalExpenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (result.ok) revalidatePath('/advanced/medical');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}
