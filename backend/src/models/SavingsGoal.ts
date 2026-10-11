import mongoose, { type Document, Schema } from 'mongoose';

export interface ISavingsGoalContribution {
  _id?: mongoose.Types.ObjectId;
  date: string;
  amountCents: number;
  paymentMethod?: string;
  bankAccountId?: mongoose.Types.ObjectId | null;
  transactionId?: mongoose.Types.ObjectId | null;
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

const SavingsGoalContributionSchema = new Schema<ISavingsGoalContribution>({
  date: { type: String, required: true },
  amountCents: { type: Number, required: true },
  paymentMethod: { type: String, default: '' },
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  note: { type: String, default: '' },
});

const SavingsGoalSchema = new Schema<ISavingsGoal>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  targetAmountCents: { type: Number, default: 0, min: 0 },
  targetDate: { type: String, default: '' },
  dailyAmountCents: { type: Number, default: 0, min: 0 },
  monthlyTargetCents: { type: Number, default: 0, min: 0 },
  endDate: { type: String, default: '' },
  savedAmountCents: { type: Number, default: 0, min: 0 },
  contributions: [SavingsGoalContributionSchema],
}, { timestamps: true });

export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
