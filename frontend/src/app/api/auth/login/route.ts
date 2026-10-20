import { NextRequest, NextResponse } from 'next/server';
import { proxyBackend } from '@/lib/backendProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.mode !== 'signup' && body.mode !== 'signin') return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    return proxyBackend(request, body.mode === 'signup' ? '/api/auth/register' : '/api/auth/login', body);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
