import mongoose, { type Document, Schema } from 'mongoose';

export interface IEmploymentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  employer: string;
  role: string;
  monthlyGrossCents: number;
  payday: number;
  monthlyDeductionsCents: number;
  monthlySavingsTargetCents: number;
  careerGoal: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmploymentProfileSchema = new Schema<IEmploymentProfile>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  employer: { type: String, required: true },
  role: { type: String, default: '' },
  monthlyGrossCents: { type: Number, required: true, min: 1 },
  payday: { type: Number, required: true, min: 1, max: 31 },
  monthlyDeductionsCents: { type: Number, required: true, min: 0 },
  monthlySavingsTargetCents: { type: Number, required: true, min: 0 },
  careerGoal: { type: String, default: '' },
}, { timestamps: true });

export const EmploymentProfileModel = mongoose.models.EmploymentProfile || mongoose.model<IEmploymentProfile>('EmploymentProfile', EmploymentProfileSchema);
