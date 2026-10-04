import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')): Promise<{ salt: string; hash: string }> {
  const derived = await scrypt(password, salt, keyLength) as Buffer;
  return { salt, hash: derived.toString('hex') };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const derived = await scrypt(password, salt, keyLength) as Buffer;
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === derived.length && timingSafeEqual(derived, expected);
}