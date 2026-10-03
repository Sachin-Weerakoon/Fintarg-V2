import mongoose, { type Document, Schema } from 'mongoose';

export interface IMedicalExpense extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  type: string;
  amountCents: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalExpenseSchema = new Schema<IMedicalExpense>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true },
  type: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  note: { type: String, default: '' },
}, { timestamps: true });

export const MedicalExpenseModel = mongoose.models.MedicalExpense || mongoose.model<IMedicalExpense>('MedicalExpense', MedicalExpenseSchema);
