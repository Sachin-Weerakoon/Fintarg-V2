import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-cron-secret"]',
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'passwordHash',
    'salt',
    'token',
    'tokenHash',
    'resetToken',
    '*.password',
    '*.currentPassword',
    '*.newPassword',
    '*.confirmPassword',
    '*.passwordHash',
    '*.salt',
    '*.tokenHash',
    '*.resetToken',
  ],
});