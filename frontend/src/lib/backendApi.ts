import 'server-only';
import { cookies } from 'next/headers';

const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000';

export async function backendApi(path: string, init: RequestInit = {}) {
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');
  if (cookieHeader) headers.set('cookie', cookieHeader);

  try {
    const response = await fetch(new URL(path, backendUrl), {
      ...init,
      headers,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({ error: 'Backend returned an invalid response' }));
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    return {
      ok: false,
      status: 503,
      data: { error: error?.message || 'Backend service unreachable' },
    };
  }
}