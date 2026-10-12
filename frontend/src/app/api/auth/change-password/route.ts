import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyBackend(request, '/api/auth/change-password', body);
}
