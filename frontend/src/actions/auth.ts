import { cookies } from 'next/headers';
import { backendApi } from '@/lib/backendApi';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const cookieName = process.env.AUTH_COOKIE_NAME || 'fintarg_token';
  if (!cookieStore.has(cookieName)) return null;

  const result = await backendApi('/api/auth/me');
  if (result.ok) {
    return result.data;
  }

  // Treat ONLY 401 as unauthenticated: clear cookie and return null
  if (result.status === 401) {
    try {
      cookieStore.delete(cookieName);
    } catch {
      // In some server environments delete might throw if headers are sent; ignore
    }
    return null;
  }

  // On 5xx or connection error: KEEP COOKIE intact so session is not lost!
  throw new Error('Backend service is temporarily unavailable. Please retry.');
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
