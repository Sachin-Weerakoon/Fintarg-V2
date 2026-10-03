import mongoose, { type Document, Schema } from 'mongoose';

export interface IPersonalBudget extends Document {
  userId: mongoose.Types.ObjectId;
  month: string;
  budgetCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalBudgetSchema = new Schema<IPersonalBudget>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  month: { type: String, required: true },
  budgetCents: { type: Number, required: true, min: 0 },
}, { timestamps: true });

PersonalBudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export const PersonalBudgetModel = mongoose.models.PersonalBudget || mongoose.model<IPersonalBudget>('PersonalBudget', PersonalBudgetSchema);
