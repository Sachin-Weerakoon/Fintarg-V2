import mongoose, { type Document, Schema } from 'mongoose';

export interface IFile extends Document {
  userId: mongoose.Types.ObjectId;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  iv: Buffer;
  tag: Buffer;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  data: { type: Buffer, required: true },
  iv: { type: Buffer, required: true },
  tag: { type: Buffer, required: true },
}, { timestamps: false });

export const FileModel = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
