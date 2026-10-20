import mongoose, { type Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'finance' | 'loan' | 'pawn' | 'agreement' | 'appointment' | 'custom';
  relatedId: string;
  label: string;
  dueDate: string;
  channel: 'email' | 'in-app';
  status: 'pending' | 'sent' | 'dismissed';
  sentAt?: Date | null;
  emailAttempts: number;
  createdAt: Date;
}

const ReminderSchema = new Schema<IReminder>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['finance', 'loan', 'pawn', 'agreement', 'appointment', 'custom'], required: true },
  relatedId: { type: String, default: '' },
  label: { type: String, required: true },
  dueDate: { type: String, required: true },
  channel: { type: String, enum: ['email', 'in-app'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'dismissed'], default: 'pending' },
  sentAt: { type: Date, default: null },
  emailAttempts: { type: Number, default: 0 },
}, { timestamps: false });

ReminderSchema.index({ status: 1, channel: 1, dueDate: 1 });

export const ReminderModel = mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', ReminderSchema);
