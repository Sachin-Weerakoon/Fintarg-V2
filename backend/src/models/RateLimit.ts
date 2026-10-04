import mongoose, { type Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;
  count: number;
  firstAt: Date;
  lastAt: Date;
  lockedUntil?: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  firstAt: { type: Date, required: true },
  lastAt: { type: Date, required: true },
  lockedUntil: { type: Date },
});

RateLimitSchema.index({ lockedUntil: 1 }, { sparse: true, expireAfterSeconds: 0 });

export const RateLimitModel = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
