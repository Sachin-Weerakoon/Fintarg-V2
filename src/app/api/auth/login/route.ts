import { NextRequest, NextResponse } from 'next/server';
import { register, login } from '@/actions/auth';
import { verifyPassword, hashPassword } from '@/lib/auth';
import crypto from 'crypto';
import { PasswordResetModel } from '@/models/PasswordReset';

export async function POST(request: NextRequest) {
  const { mode, name, email, password, workMode } = await request.json();
  if (mode === 'signup') {
    const result = await register({ name, email, password, workMode });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (mode === 'signin') {
    const result = await login({ email, password });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, plan: result.plan, workMode: result.workMode });
  }
  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}
