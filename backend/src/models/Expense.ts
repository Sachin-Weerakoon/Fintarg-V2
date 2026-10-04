import mongoose, { type Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  category: string;
  note: string;
  recurring: boolean;
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
}, { timestamps: true });

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
