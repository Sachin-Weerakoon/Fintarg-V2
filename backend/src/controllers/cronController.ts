import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { SessionModel } from '../models/Session';
import { PasswordResetModel } from '../models/PasswordReset';
import { ReminderModel } from '../models/Reminder';
import { UserModel } from '../models/User';
import { logger } from '../config/logger';
import { sendMail } from '../services/mailService';
import { asyncHandler } from '../utils/asyncHandler';

function authorized(secret: string | undefined) {
  if (!secret) return false;
  const expected = Buffer.from(env.CRON_SECRET);
  const received = Buffer.from(secret);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const maintenance: RequestHandler = asyncHandler(async (request, response) => {
  if (!authorized(request.header('x-cron-secret') ?? request.header('authorization')?.replace(/^Bearer\s+/i, ''))) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const now = new Date();
  const sessions = await SessionModel.deleteMany({ expiresAt: { $lt: now } });
  const resets = await PasswordResetModel.deleteMany({ expiresAt: { $lt: now } });
  response.json({ cleanedSessions: sessions.deletedCount, cleanedResets: resets.deletedCount });
});

export const reminders: RequestHandler = asyncHandler(async (request, response) => {
  if (!authorized(request.header('x-cron-secret') ?? request.header('authorization')?.replace(/^Bearer\s+/i, ''))) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const pending = await ReminderModel.find({ status: 'pending', dueDate: { $lte: today }, channel: 'email' });
  let sent = 0;
  for (const reminder of pending) {
    const user = await UserModel.findById(reminder.userId).select('email');
    if (!user) continue;
    const delivered = await sendMail(user.email, `Reminder: ${reminder.label}`, `<p>${reminder.label}</p>`);
    if (delivered) {
      reminder.status = 'sent';
      await reminder.save();
      sent++;
    }
  }
  if (pending.length && !sent) logger.warn({ count: pending.length }, 'No reminders delivered; configure email first');
  response.json({ found: pending.length, sent });
});