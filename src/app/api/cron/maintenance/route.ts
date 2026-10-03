import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import mongoose from 'mongoose';
import { SessionModel } from '@/models/Session';
import { PasswordResetModel } from '@/models/PasswordReset';
import { ProfileModel } from '@/models/Profile';
import { FileModel } from '@/models/File';
import { sendMail } from '@/lib/mailer';
import { ReminderModel } from '@/models/Reminder';
import { getEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await mongoose.connect(getEnv().MONGODB_URI);
  const now = new Date();
  // Clean expired sessions
  const sessionResult = await SessionModel.deleteMany({ expiresAt: { $lt: now } });
  // Clean expired password resets
  const resetResult = await PasswordResetModel.deleteMany({ expiresAt: { $lt: now } });
  // Process 30-day account deletions
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDelete = await ProfileModel.find({ deletionRequestedAt: { $lte: thirtyDaysAgo } }).lean();
  for (const profile of toDelete) {
    const userId = (profile as any).userId.toString();
    await FileModel.deleteMany({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
    await ProfileModel.deleteOne({ _id: profile._id });
  }
  // Send pending reminders
  const pendingReminders = await ReminderModel.find({ status: 'pending', dueDate: { $lte: now.toISOString().slice(0, 10) } }).lean();
  for (const reminder of pendingReminders) {
    if (reminder.channel === 'email') {
      await sendMail('user@example.com', `Reminder: ${reminder.label}`, `<p>${reminder.label}</p>`);
    }
    await ReminderModel.updateOne({ _id: reminder._id }, { status: 'sent' });
  }
  return NextResponse.json({ cleanedSessions: sessionResult.deletedCount, cleanedResets: resetResult.deletedCount, deletedAccounts: toDelete.length, sentReminders: pendingReminders.length });
}
