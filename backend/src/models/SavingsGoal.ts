import mongoose, { type Document, Schema } from 'mongoose';

export interface ISavingsGoalContribution {
  date: string;
  amountCents: number;
  note?: string;
}

export interface ISavingsGoal extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmountCents: number;
  targetDate: string;
  dailyAmountCents: number;
  monthlyTargetCents: number;
  endDate: string;
  savedAmountCents: number;
  contributions: ISavingsGoalContribution[];
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  targetAmountCents: { type: Number, default: 0, min: 0 },
  targetDate: { type: String, default: '' },
  dailyAmountCents: { type: Number, default: 0, min: 0 },
  monthlyTargetCents: { type: Number, default: 0, min: 0 },
  endDate: { type: String, default: '' },
  savedAmountCents: { type: Number, default: 0, min: 0 },
  contributions: [{ date: String, amountCents: Number, note: { type: String, default: '' } }],
}, { timestamps: true });

export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
