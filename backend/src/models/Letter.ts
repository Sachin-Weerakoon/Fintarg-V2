import mongoose, { type Document, Schema } from 'mongoose';

export interface ILetter extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'bank' | 'offer' | 'general';
  mode: 'personal' | 'business';
  date: string;
  addressedTo: string;
  purpose: string;
  body: string;
  companyId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LetterSchema = new Schema<ILetter>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['bank', 'offer', 'general'], required: true },
  mode: { type: String, enum: ['personal', 'business'], required: true },
  date: { type: String, required: true },
  addressedTo: { type: String, default: '' },
  purpose: { type: String, default: '' },
  body: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: false });

export const LetterModel = mongoose.models.Letter || mongoose.model<ILetter>('Letter', LetterSchema);
