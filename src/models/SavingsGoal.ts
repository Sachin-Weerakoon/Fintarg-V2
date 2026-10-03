import mongoose, { type Document, Schema } from 'mongoose';

export interface ISavingsGoal extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  dailyAmountCents: number;
  monthlyTargetCents: number;
  endDate: string;
  savedAmountCents: number;
  contributions: { date: string; amountCents: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  dailyAmountCents: { type: Number, required: true, min: 1 },
  monthlyTargetCents: { type: Number, required: true, min: 1 },
  endDate: { type: String, default: '' },
  savedAmountCents: { type: Number, default: 0, min: 0 },
  contributions: [{ date: String, amountCents: Number }],
}, { timestamps: true });

export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
