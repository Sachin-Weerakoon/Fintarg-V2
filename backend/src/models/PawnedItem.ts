import mongoose, { type Document, Schema } from 'mongoose';

export interface IPawnPayment {
  _id?: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  paymentType: 'interest' | 'part_principal' | 'redemption';
  paymentMethod: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  transactionId?: mongoose.Types.ObjectId | null;
  note?: string;
}

export interface IPawnedItem extends Document {
  userId: mongoose.Types.ObjectId;
  description: string;
  ticketNumber: string;
  status: 'active' | 'redeemed' | 'forfeited';
  amountReceivedCents: number;
  principalOutstandingCents: number;
  interestPaidCents: number;
  interestRatePercent: number;
  nextDue: string;
  redemptionDate: string;
  payments: IPawnPayment[];
  createdAt: Date;
  updatedAt: Date;
}

const PawnPaymentSchema = new Schema<IPawnPayment>({
  date: { type: String, required: true },
  amountCents: { type: Number, required: true },
  paymentType: { type: String, enum: ['interest', 'part_principal', 'redemption'], default: 'interest' },
  paymentMethod: { type: String, default: 'cash' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  note: { type: String, default: '' },
});

const PawnedItemSchema = new Schema<IPawnedItem>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  description: { type: String, required: true },
  ticketNumber: { type: String, default: '' },
  status: { type: String, enum: ['active', 'redeemed', 'forfeited'], default: 'active' },
  amountReceivedCents: { type: Number, required: true, min: 1 },
  principalOutstandingCents: { type: Number, default: 0 },
  interestPaidCents: { type: Number, default: 0 },
  interestRatePercent: { type: Number, required: true, min: 0 },
  nextDue: { type: String, required: true },
  redemptionDate: { type: String, default: '' },
  payments: [PawnPaymentSchema],
}, { timestamps: true });

export const PawnedItemModel = mongoose.models.PawnedItem || mongoose.model<IPawnedItem>('PawnedItem', PawnedItemSchema);
