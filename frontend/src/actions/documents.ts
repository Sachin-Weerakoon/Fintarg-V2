'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

export async function addDocument(data: {
  id: string;
  type: string;
  label: string;
  uploadDate: string;
  note: string;
  fileName: string;
  fileId?: string;
}) {
  const result = await backendApi('/api/records/documents', { method: 'POST', body: JSON.stringify(data) });
  if (result.ok) revalidatePath('/documents');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}

export async function deleteDocument(id: string) {
  const result = await backendApi(`/api/records/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (result.ok) revalidatePath('/documents');
  return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}
