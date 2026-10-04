import { cookies } from 'next/headers';
import { backendApi } from '@/lib/backendApi';

export async function getSessionUser() {
  const cookieStore = await cookies();
  if (!cookieStore.has(process.env.AUTH_COOKIE_NAME || 'fintarg_token')) return null;
  const result = await backendApi('/api/auth/me');
  return result.ok ? result.data : null;
}

export async function logout() {
  return backendApi('/api/auth/logout', { method: 'POST' });
}

export async function register(data: { name: string; email: string; password: string; workMode: string }) {
  return backendApi('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function login(data: { email: string; password: string }) {
  return backendApi('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
}

export async function forgotPassword(email: string) {
  return backendApi('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, newPassword: string) {
  return backendApi('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
}
