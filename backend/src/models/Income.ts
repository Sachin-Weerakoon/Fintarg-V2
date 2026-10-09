import mongoose, { type Document, Schema } from 'mongoose';

export interface IIncome extends Document {
  userId: mongoose.Types.ObjectId;
  source: string;
  type: 'salary' | 'business' | 'other';
  amountCents: number;
  frequency: 'monthly' | 'weekly' | 'daily' | 'one-time';
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  bankAccountId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  source: { type: String, required: true },
  type: { type: String, enum: ['salary', 'business', 'other'], required: true },
  amountCents: { type: Number, required: true, min: 1 },
  frequency: { type: String, enum: ['monthly', 'weekly', 'daily', 'one-time'], required: true },
  date: { type: String, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'cheque', 'other'], default: 'cash' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
}, { timestamps: true });

export const IncomeModel = mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema);
