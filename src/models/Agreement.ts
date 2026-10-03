import mongoose, { type Document, Schema } from 'mongoose';

export interface IAgreement extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  otherParty: string;
  startDate: string;
  endDate: string;
  valueCents: number;
  summary: string;
  status: 'draft' | 'active' | 'expired';
  fileName: string;
  fileId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreement>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true },
  otherParty: { type: String, required: true },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  valueCents: { type: Number, default: 0, min: 0 },
  summary: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'expired'], required: true },
  fileName: { type: String, default: '' },
  fileId: { type: Schema.Types.ObjectId, ref: 'File' },
}, { timestamps: true });

export const AgreementModel = mongoose.models.Agreement || mongoose.model<IAgreement>('Agreement', AgreementSchema);
