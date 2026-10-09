import mongoose, { type Document, Schema } from 'mongoose';

export interface ILoanRepayment {
  date: string;
  amountCents: number;
  note?: string;
}

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  lender: string;
  principalCents: number;
  ratePercent: number;
  method: 'simple' | 'compound' | 'reducing_balance';
  interestBasis: 'annual' | 'monthly';
  tenureMonths: number;
  monthlyPaymentCents: number;
  totalInterestCents: number;
  startDate: string;
  dueDate: string;
  balanceCents: number;
  repayments: ILoanRepayment[];
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  lender: { type: String, required: true },
  principalCents: { type: Number, required: true, min: 1 },
  ratePercent: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['simple', 'compound', 'reducing_balance'], default: 'simple' },
  interestBasis: { type: String, enum: ['annual', 'monthly'], default: 'annual' },
  tenureMonths: { type: Number, default: 12, min: 1 },
  monthlyPaymentCents: { type: Number, default: 0 },
  totalInterestCents: { type: Number, default: 0 },
  startDate: { type: String, required: true },
  dueDate: { type: String, default: '' },
  balanceCents: { type: Number, required: true, min: 0 },
  repayments: [{ date: String, amountCents: Number, note: { type: String, default: '' } }],
}, { timestamps: true });

export const LoanModel = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
