import { NextRequest, NextResponse } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function POST(request: NextRequest) {
  try {
    return proxyBackend(request, '/api/auth/reset-password', await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
