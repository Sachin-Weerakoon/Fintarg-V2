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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const reminders: RequestHandler = asyncHandler(async (request, response) => {
  if (!authorized(request.header('x-cron-secret') ?? request.header('authorization')?.replace(/^Bearer\s+/i, ''))) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const pending = await ReminderModel.find({ status: 'pending', dueDate: { $lte: today }, channel: 'email' })
    .limit(100)
    .lean();

  if (!pending.length) {
    response.json({ found: 0, sent: 0 });
    return;
  }

  const userIds = [...new Set(pending.map(r => r.userId))];
  const users = await UserModel.find({ _id: { $in: userIds } }).select('email').lean();
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u.email as string]));

  let sent = 0;
  for (const reminder of pending) {
    const email = userMap.get(reminder.userId.toString());
    if (!email) continue;
    const safeLabel = escapeHtml(reminder.label);
    const delivered = await sendMail(email, `Reminder: ${safeLabel}`, `<p>${safeLabel}</p>`);
    if (delivered) {
      const updateResult = await ReminderModel.updateOne(
        { _id: reminder._id, status: 'pending' },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
      if (updateResult.modifiedCount > 0) {
        sent++;
      }
    }
  }
  if (pending.length && !sent) logger.warn({ count: pending.length }, 'No reminders delivered; configure email first');
  response.json({ found: pending.length, sent });
});