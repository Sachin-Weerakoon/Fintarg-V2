import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
  workMode: z.enum(['salary', 'business', 'both']),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()) });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(256), newPassword: z.string().min(8).max(128) });