import { NextRequest, NextResponse } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyBackend(request, '/api/auth/register', body);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
