import crypto from 'crypto';
import { UserModel } from '@/models/User';
import { SessionModel } from '@/models/Session';

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = 'sha512';

export async function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, { iterations: ITERATIONS, keyLen: KEYLEN, digest: DIGEST } as any, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

export async function createUser(email: string, password: string, name: string, workMode: 'salary' | 'business' | 'both'): Promise<{ userId: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(password, salt);
  const plan: 'basic' | 'business' = workMode === 'salary' ? 'basic' : 'business';
  const user = await UserModel.create({ email, passwordHash, salt, name, plan, workMode });
  return { userId: user._id.toString() };
}

export async function verifyPassword(plain: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(plain, salt);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export async function createSession(userId: string): Promise<{ token: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await SessionModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(userId), tokenHash, expiresAt });
  return { token };
}

export async function validateSession(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await SessionModel.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return session.userId.toString();
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await SessionModel.deleteOne({ tokenHash });
}
