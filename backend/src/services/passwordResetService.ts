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
  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) {
    const dummyToken = randomBytes(32).toString('hex');
    hashToken(dummyToken);
    await new Promise(resolve => setTimeout(resolve, 50));
    return;
  }

  const token = randomBytes(32).toString('hex');
  await PasswordResetModel.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000), used: false });
  const url = `${env.APP_ORIGIN}/reset-password/${token}`;
  await sendMail(normalizedEmail, 'Reset your Fintarg password', `<p><a href="${url}">Reset your password</a>. This link expires in one hour.</p>`);
}

export async function applyPasswordReset(token: string, password: string) {
  const reset = await PasswordResetModel.findOneAndUpdate(
    { tokenHash: hashToken(token), used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } },
    { new: true }
  );
  if (!reset) throw new HttpError(400, 'Invalid or expired reset link');

  // Invalidate any other pending reset tokens for this user
  await PasswordResetModel.updateMany(
    { userId: reset.userId, used: false },
    { $set: { used: true } }
  );

  const user = await UserModel.findById(reset.userId);
  if (!user) throw new HttpError(404, 'Account not found');
  const credentials = await hashPassword(password);
  user.passwordHash = credentials.hash;
  user.salt = credentials.salt;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
}