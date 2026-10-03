import crypto from 'crypto';
import { getEnv } from './env';

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}
