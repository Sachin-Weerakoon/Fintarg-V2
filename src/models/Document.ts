import mongoose, { type Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'profile-picture' | 'cv' | 'nic-front' | 'nic-back' | 'bank' | 'other';
  label: string;
  uploadDate: string;
  note: string;
  fileName: string;
  fileId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['profile-picture', 'cv', 'nic-front', 'nic-back', 'bank', 'other'], required: true },
  label: { type: String, required: true },
  uploadDate: { type: String, required: true },
  note: { type: String, default: '' },
  fileName: { type: String, required: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File' },
}, { timestamps: false });

export const DocumentModel = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
