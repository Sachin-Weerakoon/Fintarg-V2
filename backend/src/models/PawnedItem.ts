import mongoose, { type Document, Schema } from 'mongoose';

export interface IPawnedItem extends Document {
  userId: mongoose.Types.ObjectId;
  description: string;
  amountReceivedCents: number;
  interestRatePercent: number;
  nextDue: string;
  redemptionDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const PawnedItemSchema = new Schema<IPawnedItem>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  description: { type: String, required: true },
  amountReceivedCents: { type: Number, required: true, min: 1 },
  interestRatePercent: { type: Number, required: true, min: 0 },
  nextDue: { type: String, required: true },
  redemptionDate: { type: String, required: true },
}, { timestamps: true });

export const PawnedItemModel = mongoose.models.PawnedItem || mongoose.model<IPawnedItem>('PawnedItem', PawnedItemSchema);
