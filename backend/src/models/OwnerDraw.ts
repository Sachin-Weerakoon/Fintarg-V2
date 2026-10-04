import mongoose, { type Document, Schema } from 'mongoose';

export interface IOwnerDraw extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  amountCents: number;
  date: string;
  createdAt: Date;
}

const OwnerDrawSchema = new Schema<IOwnerDraw>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, required: true, index: true },
  amountCents: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
}, { timestamps: false });

export const OwnerDrawModel = mongoose.models.OwnerDraw || mongoose.model<IOwnerDraw>('OwnerDraw', OwnerDrawSchema);
