'use server';
import { revalidatePath } from 'next/cache';
import { backendApi } from '@/lib/backendApi';

export async function updateSettings(data: Record<string, unknown>) {
	const result = await backendApi('/api/profile', { method: 'PATCH', body: JSON.stringify(data) });
	if (result.ok) revalidatePath('/settings');
	return result.ok ? { ok: true } : { error: result.data.error || 'Request failed' };
}
