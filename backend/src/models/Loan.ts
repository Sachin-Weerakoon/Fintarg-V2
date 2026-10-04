import mongoose, { type Document, Schema } from 'mongoose';

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  lender: string;
  principalCents: number;
  ratePercent: number;
  method: 'simple' | 'compound';
  startDate: string;
  dueDate: string;
  balanceCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  lender: { type: String, required: true },
  principalCents: { type: Number, required: true, min: 1 },
  ratePercent: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['simple', 'compound'], required: true },
  startDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  balanceCents: { type: Number, required: true, min: 0 },
}, { timestamps: true });

export const LoanModel = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
