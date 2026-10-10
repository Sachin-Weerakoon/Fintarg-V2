import mongoose, { type Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  contact: string;
  logo: string;
  businessType?: string;
  openingDate?: string;
  brNumber?: string;
  tinNumber?: string;
  entityType?: string;
  sector?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  logo: { type: String, default: '' },
  businessType: { type: String, default: '' },
  openingDate: { type: String, default: '' },
  brNumber: { type: String, default: '' },
  tinNumber: { type: String, default: '' },
  entityType: { type: String, default: '' },
  sector: { type: String, default: '' },
  email: { type: String, default: '' },
}, { timestamps: true });

export const CompanyModel = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
