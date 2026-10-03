import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/actions/auth';

export async function POST(request: NextRequest) {
  const { token, newPassword } = await request.json();
  const result = await resetPassword(token, newPassword);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
