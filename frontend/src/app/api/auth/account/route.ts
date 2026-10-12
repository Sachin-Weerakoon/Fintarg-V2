import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  return proxyBackend(request, '/api/auth/account', body);
}
