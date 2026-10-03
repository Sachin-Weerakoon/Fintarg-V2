import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/actions/auth';

export async function POST() {
  await logout();
  return NextResponse.json({ ok: true });
}
