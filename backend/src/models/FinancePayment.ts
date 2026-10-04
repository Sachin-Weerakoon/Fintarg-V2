import mongoose, { type Document, Schema } from 'mongoose';

export interface IFinancePayment extends Document {
  userId: mongoose.Types.ObjectId;
  lender: string;
  amountCents: number;
  dueDay: number;
  monthsRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

const FinancePaymentSchema = new Schema<IFinancePayment>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  lender: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  monthsRemaining: { type: Number, required: true, min: 1 },
}, { timestamps: true });

export const FinancePaymentModel = mongoose.models.FinancePayment || mongoose.model<IFinancePayment>('FinancePayment', FinancePaymentSchema);
