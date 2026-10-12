import mongoose, { type Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  bankAccountId?: mongoose.Types.ObjectId | null;
  cardId?: mongoose.Types.ObjectId | null;
  type: 'income' | 'expense' | 'transfer';
  transferDirection?: 'incoming' | 'outgoing' | null;
  transferGroupId?: string | null;
  amountCents: number;
  date: string;
  category: string;
  description: string;
  paymentMethod: 'cash' | 'card' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cheque' | 'standing_order' | 'online' | 'other';
  referenceId: string;
  runningBalanceCents?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null, index: true },
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', default: null },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  transferDirection: { type: String, enum: ['incoming', 'outgoing'], default: null },
  transferGroupId: { type: String, default: null, index: true },
  amountCents: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
  category: { type: String, default: 'General', trim: true },
  description: { type: String, default: '', trim: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'debit_card', 'credit_card', 'bank_transfer', 'cheque', 'standing_order', 'online', 'other'], default: 'cash' },
  referenceId: { type: String, default: '', trim: true },
  runningBalanceCents: { type: Number },
}, { timestamps: true });

TransactionSchema.index({ userId: 1, bankAccountId: 1, date: -1 });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, referenceId: 1 });

export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
