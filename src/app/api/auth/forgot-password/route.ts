import { NextRequest, NextResponse } from 'next/server';
import { forgotPassword } from '@/actions/auth';

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const result = await forgotPassword(email);
  if (!result.ok) return NextResponse.json({ error: (result as any).error || 'Something went wrong' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
