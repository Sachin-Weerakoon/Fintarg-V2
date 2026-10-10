import mongoose, { type Document, Schema } from 'mongoose';

export interface ICard extends Document {
  userId: mongoose.Types.ObjectId;
  bankAccountId?: mongoose.Types.ObjectId | null;
  cardName: string;
  cardType: 'debit' | 'credit';
  cardNetwork?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  expiryDate?: string;
  creditLimitCents: number;
  balanceCents: number;
  billingDay?: number;
  dueDay?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CardSchema = new Schema<ICard>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  cardName: { type: String, required: true, trim: true },
  cardType: { type: String, enum: ['debit', 'credit'], default: 'debit' },
  cardNetwork: { type: String, default: 'visa', trim: true },
  last4: { type: String, required: true, trim: true, minlength: 4, maxlength: 4 },
  expiryMonth: { type: Number, min: 1, max: 12 },
  expiryYear: { type: Number, min: 2020, max: 2100 },
  expiryDate: { type: String, default: '', trim: true },
  creditLimitCents: { type: Number, default: 0, min: 0 },
  balanceCents: { type: Number, default: 0 },
  billingDay: { type: Number, min: 1, max: 31 },
  dueDay: { type: Number, min: 1, max: 31 },
}, { timestamps: true });

export const CardModel = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);
