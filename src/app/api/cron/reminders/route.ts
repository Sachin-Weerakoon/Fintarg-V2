import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import mongoose from 'mongoose';
import { ReminderModel } from '@/models/Reminder';
import { sendMail } from '@/lib/mailer';
import { getEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await mongoose.connect(getEnv().MONGODB_URI);
  const today = new Date().toISOString().slice(0, 10);
  const reminders = await ReminderModel.find({ status: 'pending', dueDate: today, channel: 'email' }).lean();
  let sent = 0;
  for (const reminder of reminders) {
    await sendMail('user@example.com', `Reminder: ${reminder.label}`, `<p>${reminder.label}</p>`);
    await ReminderModel.updateOne({ _id: reminder._id }, { status: 'sent' });
    sent++;
  }
  return NextResponse.json({ sent });
}
