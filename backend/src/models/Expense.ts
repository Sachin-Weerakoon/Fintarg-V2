import mongoose, { type Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  category: string;
  note: string;
  recurring: boolean;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  bankAccountId?: mongoose.Types.ObjectId | null;
  cardId?: mongoose.Types.ObjectId | null;
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
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'cheque', 'other'], default: 'cash' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', default: null },
}, { timestamps: true });

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
