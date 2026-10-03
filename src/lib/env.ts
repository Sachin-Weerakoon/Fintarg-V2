import { z } from 'zod';

export const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().min(1, 'MONGODB_DB is required'),
  APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  FILE_ENCRYPTION_KEY: z.string().length(44, 'FILE_ENCRYPTION_KEY must be a 32-byte base64 string (44 chars)'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required for security'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    APP_ORIGIN: process.env.APP_ORIGIN,
    FILE_ENCRYPTION_KEY: process.env.FILE_ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!result.success) {
    const missing = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${missing}`);
  }
  cached = result.data;
  return cached;
}
