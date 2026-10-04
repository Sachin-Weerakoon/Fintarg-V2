import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const developmentSecret = isProduction ? undefined : randomBytes(48).toString('base64url');
const developmentEncryptionKey = isProduction ? undefined : randomBytes(32).toString('base64');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('fintarg'),
  JWT_SECRET: z.string().min(32).default(developmentSecret ?? ''),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_NAME: z.string().default('fintarg_token'),
  FILE_ENCRYPTION_KEY: z.string().length(44).default(developmentEncryptionKey ?? ''),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  CRON_SECRET: z.string().min(32).default(developmentSecret ?? ''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid backend environment: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
}

export const env = parsed.data;