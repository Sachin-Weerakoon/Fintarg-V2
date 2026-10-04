import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function POST(request: NextRequest) {
  return proxyBackend(request, '/api/auth/logout');
}
