import mongoose, { type Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  category: string;
  note: string;
  recurring: boolean;
  paymentMethod: 'cash' | 'card' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cheque' | 'standing_order' | 'online' | 'other';
  bankAccountId?: mongoose.Types.ObjectId | null;
  cardId?: mongoose.Types.ObjectId | null;
  sourceType?: 'salary' | 'business';
  companyId?: string | null;
  branchId?: string | null;
  sourceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  category: { type: String, required: true },
  note: { type: String, default: '' },
  recurring: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['cash', 'card', 'debit_card', 'credit_card', 'bank_transfer', 'cheque', 'standing_order', 'online', 'other'], default: 'cash' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', default: null },
  sourceType: { type: String, enum: ['salary', 'business'], default: 'salary' },
  companyId: { type: String, default: null },
  branchId: { type: String, default: null },
  sourceId: { type: String, default: null },
}, { timestamps: true });

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
