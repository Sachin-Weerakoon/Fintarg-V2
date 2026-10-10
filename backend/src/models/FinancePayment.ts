import mongoose, { type Document, Schema } from 'mongoose';

export interface IFinancePayment extends Document {
  userId: mongoose.Types.ObjectId;
  lender: string;
  amountCents: number;
  dueDay: number;
  monthsRemaining: number;
  paymentKind: 'instalment' | 'lease' | 'cheque' | 'standing_order';
  chequeNumber?: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  payee?: string;
  frequency?: 'monthly' | 'one-time';
  status?: 'active' | 'completed' | 'cleared' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const FinancePaymentSchema = new Schema<IFinancePayment>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  lender: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  monthsRemaining: { type: Number, required: true, min: 1 },
  paymentKind: { type: String, enum: ['instalment', 'lease', 'cheque', 'standing_order'], default: 'instalment' },
  chequeNumber: { type: String, default: '', trim: true },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  payee: { type: String, default: '', trim: true },
  frequency: { type: String, enum: ['monthly', 'one-time'], default: 'monthly' },
  status: { type: String, enum: ['active', 'completed', 'cleared', 'cancelled'], default: 'active' },
}, { timestamps: true });

export const FinancePaymentModel = mongoose.models.FinancePayment || mongoose.model<IFinancePayment>('FinancePayment', FinancePaymentSchema);
