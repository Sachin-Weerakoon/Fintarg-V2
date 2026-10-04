import { randomBytes } from 'node:crypto';
import { ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';
import { HttpError } from '../middleware/errors';
import { hashPassword, verifyPassword } from '../utils/password';

export type RegisterInput = { name: string; email: string; password: string; workMode: 'salary' | 'business' | 'both' };

export async function registerUser(input: RegisterInput) {
  if (await UserModel.exists({ email: input.email })) throw new HttpError(409, 'Email already registered');

  const credentials = await hashPassword(input.password, randomBytes(16).toString('hex'));
  const plan = input.workMode === 'salary' ? 'basic' : 'business';
  const user = await UserModel.create({
    email: input.email,
    name: input.name,
    passwordHash: credentials.hash,
    salt: credentials.salt,
    plan,
    workMode: input.workMode,
  });

  try {
    const profile = await ProfileModel.create({ userId: user._id, name: user.name, email: user.email, plan, workMode: user.workMode });
    return { user, profile };
  } catch (error) {
    await UserModel.deleteOne({ _id: user._id });
    throw error;
  }
}

export async function authenticateUser(email: string, password: string) {
  const user = await UserModel.findOne({ email });
  if (!user) throw new HttpError(401, 'Invalid email or password');
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new HttpError(429, 'Account temporarily locked. Try again later.');

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    throw new HttpError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const profile = await ProfileModel.findOne({ userId: user._id }).lean();
  return { user, profile };
}

export async function getUserProfile(userId: string) {
  const user = await UserModel.findById(userId).select('-passwordHash -salt').exec();
  if (!user) throw new HttpError(401, 'Account no longer exists');
  const profile = await ProfileModel.findOne({ userId: user._id }).lean();
  return { user, profile };
}