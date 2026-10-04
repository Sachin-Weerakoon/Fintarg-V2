import mongoose, { type Document, Schema } from 'mongoose';

export interface IBranchEntry extends Document {
  userId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  date: string;
  type: 'revenue' | 'utility' | 'other-cost';
  category: string;
  amountCents: number;
  note: string;
  createdAt: Date;
}

const BranchEntrySchema = new Schema<IBranchEntry>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['revenue', 'utility', 'other-cost'], required: true },
  category: { type: String, required: true },
  amountCents: { type: Number, required: true, min: 1 },
  note: { type: String, default: '' },
}, { timestamps: false });

export const BranchEntryModel = mongoose.models.BranchEntry || mongoose.model<IBranchEntry>('BranchEntry', BranchEntrySchema);
