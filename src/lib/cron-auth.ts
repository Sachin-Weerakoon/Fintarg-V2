import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEnv } from '@/lib/env';

export function verifyCronSecret(request: NextRequest): boolean {
  const env = getEnv();
  if (!env.CRON_SECRET) return false;
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(env.CRON_SECRET));
}
