import mongoose, { type Document, Schema } from 'mongoose';

export interface IBusinessBranch extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  location: string;
  branchType?: string;
  openingDate?: string;
  logo?: string;
  monthlyTargetCents: number;
  annualTargetCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessBranchSchema = new Schema<IBusinessBranch>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  location: { type: String, default: '' },
  branchType: { type: String, default: '' },
  openingDate: { type: String, default: '' },
  logo: { type: String, default: '' },
  monthlyTargetCents: { type: Number, required: true, min: 0 },
  annualTargetCents: { type: Number, required: true, min: 0 },
}, { timestamps: true });

export const BusinessBranchModel = mongoose.models.BusinessBranch || mongoose.model<IBusinessBranch>('BusinessBranch', BusinessBranchSchema);
