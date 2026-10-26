import mongoose, { type Document, Schema } from 'mongoose';

export interface IFinancePaymentHistory {
  _id?: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  paymentMethod: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  transactionId?: mongoose.Types.ObjectId | null;
  note?: string;
}

export interface IFinancePayment extends Document {
  userId: mongoose.Types.ObjectId;
  lender: string;
  amountCents: number;
  dueDay: number;
  nextDueDate: string;
  monthsRemaining: number;
  paymentKind: 'instalment' | 'lease' | 'cheque' | 'standing_order';
  chequeNumber?: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  payee?: string;
  frequency?: 'monthly' | 'one-time';
  status?: 'active' | 'completed' | 'cleared' | 'cancelled';
  sourceType: 'salary' | 'business';
  companyId?: mongoose.Types.ObjectId | null;
  payments: IFinancePaymentHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const FinancePaymentHistorySchema = new Schema<IFinancePaymentHistory>({
  date: { type: String, required: true },
  amountCents: { type: Number, required: true },
  paymentMethod: { type: String, default: 'bank_transfer' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  note: { type: String, default: '' },
});

const FinancePaymentSchema = new Schema<IFinancePayment>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  lender: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  nextDueDate: { type: String, default: '' },
  monthsRemaining: { type: Number, required: true, min: 0 },
  paymentKind: { type: String, enum: ['instalment', 'lease', 'cheque', 'standing_order'], default: 'instalment' },
  chequeNumber: { type: String, default: '', trim: true },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  payee: { type: String, default: '', trim: true },
  frequency: { type: String, enum: ['monthly', 'one-time'], default: 'monthly' },
  status: { type: String, enum: ['active', 'completed', 'cleared', 'cancelled'], default: 'active' },
  sourceType: { type: String, enum: ['salary', 'business'], default: 'salary' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  payments: [FinancePaymentHistorySchema],
}, { timestamps: true });

export const FinancePaymentModel = mongoose.models.FinancePayment || mongoose.model<IFinancePayment>('FinancePayment', FinancePaymentSchema);
