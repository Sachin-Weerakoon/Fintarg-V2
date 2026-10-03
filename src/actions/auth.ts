'use server';
import { cookies } from 'next/headers';
import { UserModel } from '@/models/User';
import { ProfileModel } from '@/models/Profile';
import { SessionModel } from '@/models/Session';
import { createUser, createSession as createSessionFn, verifyPassword, deleteSession, validateSession, hashPassword } from '@/lib/auth';
import { sendMail } from '@/lib/mailer';
import { generateResetToken, hashToken } from '@/lib/tokens';
import { PasswordResetModel } from '@/models/PasswordReset';
import crypto from 'crypto';

export async function register(data: { name: string; email: string; password: string; workMode: string }) {
  const { name, email, password, workMode } = data;
  try {
    const { userId } = await createUser(email, password, name, workMode as 'salary' | 'business' | 'both');
    const plan: 'basic' | 'business' = workMode === 'salary' ? 'basic' : 'business';
    await ProfileModel.create({ userId: new (await import('mongoose')).default.Types.ObjectId(userId), name, email, plan, workMode });
    const { token } = await createSessionFn(userId);
    (await cookies()).set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: 'Email already registered' };
  }
}

export async function login(data: { email: string; password: string }) {
  const { email, password } = data;
  const user = await UserModel.findOne({ email });
  if (!user) return { ok: false as const, error: 'Invalid credentials' };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false as const, error: 'Account locked. Try again later.' };
  }
  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
    return { ok: false as const, error: 'Invalid credentials' };
  }
  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();
  const { token } = await createSessionFn((user as any)._id.toString());
  (await cookies()).set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 });
  return { ok: true as const, plan: user.plan, workMode: user.workMode };
}

export async function logout() {
  const sessionToken = (await cookies()).get('session')?.value;
  if (sessionToken) {
    await deleteSession(sessionToken);
    (await cookies()).delete('session');
  }
}

export async function getSessionUser() {
  const sessionToken = (await cookies()).get('session')?.value;
  if (!sessionToken) return null;
  const userId = await validateSession(sessionToken);
  if (!userId) return null;
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;
  const profile = await ProfileModel.findOne({ userId: (user as any)._id }).lean();
  const u = user as any;
  const p = profile as any;
  return { userId: u._id.toString(), name: u.name, email: u.email, plan: u.plan as 'basic' | 'business', workMode: u.workMode as 'salary' | 'business' | 'both', profile: p ? {
    name: p.name, address: p.address, dateOfBirth: p.dateOfBirth, nicNumber: p.nicNumber, portfolioLink: p.portfolioLink, email: p.email, mobile: p.mobile, plan: p.plan, workMode: p.workMode, themeColor: p.themeColor, darkMode: p.darkMode, textSize: p.textSize, colorText: p.colorText, colorMuted: p.colorMuted, colorBg: p.colorBg, colorSurface: p.colorSurface, contacts: p.contacts, bankName: p.bankName, bankBranch: p.bankBranch, accountName: p.accountName, accountNumber: p.accountNumber,
  } : null };
}

export async function forgotPassword(email: string) {
  const user = await UserModel.findOne({ email });
  if (!user) return { ok: true as const };
  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await PasswordResetModel.create({ userId: (user as any)._id, tokenHash, expiresAt, used: false });
  const appOrigin = process.env.APP_ORIGIN || 'http://localhost:3000';
  const resetUrl = `${appOrigin}/reset-password/${token}`;
  await sendMail(email, 'Reset your Fintarg password', `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`);
  return { ok: true as const };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const reset = await PasswordResetModel.findOne({ tokenHash, used: false, expiresAt: { $gt: new Date() } });
  if (!reset) return { ok: false as const, error: 'Invalid or expired token' };
  const user = await UserModel.findById((reset as any).userId);
  if (!user) return { ok: false as const, error: 'User not found' };
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(newPassword, salt);
  user.passwordHash = passwordHash;
  user.salt = salt;
  await user.save();
  reset.used = true;
  await reset.save();
  return { ok: true as const };
}
