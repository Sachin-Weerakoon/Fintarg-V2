import mongoose, { type Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  plan: 'basic' | 'business';
  workMode: 'salary' | 'business' | 'both';
  emailVerified: boolean;
  lastLoginAt?: Date;
  lockedUntil?: Date;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  name: { type: String, required: true },
  plan: { type: String, enum: ['basic', 'business'], required: true },
  workMode: { type: String, enum: ['salary', 'business', 'both'], required: true },
  emailVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  lockedUntil: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
