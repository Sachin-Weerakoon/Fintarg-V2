'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

export async function addLetter(data: {
  id: string;
  type: string;
  mode: string;
  date: string;
  addressedTo: string;
  purpose: string;
  body: string;
  companyId?: string;
}) {
  const result = await backendApi('/api/records/letters', { method: 'POST', body: JSON.stringify(data) });
  if (result.ok) revalidatePath('/advanced/letters');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}

export async function deleteLetter(id: string) {
  const result = await backendApi(`/api/records/letters/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (result.ok) revalidatePath('/advanced/letters');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}
