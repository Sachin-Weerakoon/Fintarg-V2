import mongoose, { type Document, Schema } from 'mongoose';

export interface IBankAccount extends Document {
  userId: mongoose.Types.ObjectId;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
  accountType: 'savings' | 'current' | 'other';
  balanceCents: number;
  currency: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  branch: { type: String, default: '', trim: true },
  accountType: { type: String, enum: ['savings', 'current', 'other'], default: 'savings' },
  balanceCents: { type: Number, default: 0 },
  currency: { type: String, default: 'LKR', trim: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export const BankAccountModel = mongoose.models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
