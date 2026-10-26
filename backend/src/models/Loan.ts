import mongoose, { type Document, Schema } from 'mongoose';

export interface ILoanRepayment {
  _id?: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  principalCents?: number;
  interestCents?: number;
  note?: string;
  paymentMethod?: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  transactionId?: mongoose.Types.ObjectId | null;
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
  sourceType: 'salary' | 'business';
  companyId?: mongoose.Types.ObjectId | null;
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
  sourceType: { type: String, enum: ['salary', 'business'], default: 'salary' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  repayments: [{
    date: { type: String, required: true },
    amountCents: { type: Number, required: true },
    principalCents: { type: Number, default: 0 },
    interestCents: { type: Number, default: 0 },
    note: { type: String, default: '' },
    paymentMethod: { type: String, default: 'cash' },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  }],
}, { timestamps: true });

export const LoanModel = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
