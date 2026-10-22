import { z } from 'zod';

/**
 * New passwords: 8–128 characters mixing letters, numbers and special characters.
 * Only applied where a password is chosen (register, reset, change); sign-in still accepts
 * any existing password so accounts created before this rule keep working.
 */
export const newPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/\d/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.');

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: newPasswordSchema,
  workMode: z.enum(['salary', 'business', 'both']),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()) });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(256), newPassword: newPasswordSchema });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: newPasswordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});