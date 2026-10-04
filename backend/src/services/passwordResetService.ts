import { createHash, randomBytes } from 'node:crypto';
import { PasswordResetModel } from '../models/PasswordReset';
import { UserModel } from '../models/User';
import { HttpError } from '../middleware/errors';
import { hashPassword } from '../utils/password';
import { env } from '../config/env';
import { sendMail } from './mailService';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string) {
  const user = await UserModel.findOne({ email });
  if (!user) return;

  const token = randomBytes(32).toString('hex');
  await PasswordResetModel.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000), used: false });
  const url = `${env.APP_ORIGIN}/reset-password/${token}`;
  await sendMail(email, 'Reset your Fintarg password', `<p><a href="${url}">Reset your password</a>. This link expires in one hour.</p>`);
}

export async function applyPasswordReset(token: string, password: string) {
  const reset = await PasswordResetModel.findOne({ tokenHash: hashToken(token), used: false, expiresAt: { $gt: new Date() } });
  if (!reset) throw new HttpError(400, 'Invalid or expired reset link');
  const user = await UserModel.findById(reset.userId);
  if (!user) throw new HttpError(404, 'Account not found');
  const credentials = await hashPassword(password);
  user.passwordHash = credentials.hash;
  user.salt = credentials.salt;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();
  reset.used = true;
  await reset.save();
}