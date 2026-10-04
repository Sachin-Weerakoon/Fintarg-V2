import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = { userId: string };

export function createAccessToken(userId: string): string {
  return jwt.sign({ userId } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: '7d', issuer: 'fintarg-api' });
}

export function readAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'fintarg-api' });
  if (typeof payload === 'string' || typeof payload.userId !== 'string') throw new Error('Invalid token');
  return { userId: payload.userId };
}