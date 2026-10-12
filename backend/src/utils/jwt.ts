import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = { userId: string; tokenVersion: number };

export function createAccessToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ userId, tokenVersion } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: '7d', issuer: 'fintarg-api' });
}

export function readAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'fintarg-api' });
  if (typeof payload === 'string' || typeof payload.userId !== 'string') throw new Error('Invalid token');
  const tokenVersion = typeof (payload as any).tokenVersion === 'number' ? (payload as any).tokenVersion : 0;
  return { userId: payload.userId, tokenVersion };
}