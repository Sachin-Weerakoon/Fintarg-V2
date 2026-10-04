import mongoose, { type Document, Schema } from 'mongoose';

type UserPlan = 'basic' | 'business';
type WorkMode = 'salary' | 'business' | 'both';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  dateOfBirth: string;
  nicNumber: string;
  portfolioLink: string;
  email: string;
  mobile: string;
  plan: UserPlan;
  workMode: WorkMode;
  themeColor: string;
  darkMode: boolean;
  textSize: 'small' | 'medium' | 'large';
  colorText: string;
  colorMuted: string;
  colorBg: string;
  colorSurface: string;
  contacts: { id: string; name: string; relationship: string; number: string }[];
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  profilePictureFileId?: mongoose.Types.ObjectId;
  deletionRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, default: '' },
  address: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  nicNumber: { type: String, default: '' },
  portfolioLink: { type: String, default: '' },
  email: { type: String, required: true },
  mobile: { type: String, default: '' },
  plan: { type: String, enum: ['basic', 'business'], required: true },
  workMode: { type: String, enum: ['salary', 'business', 'both'], required: true },
  themeColor: { type: String, default: '#0FA3B1' },
  darkMode: { type: Boolean, default: false },
  textSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  colorText: { type: String, default: '' },
  colorMuted: { type: String, default: '' },
  colorBg: { type: String, default: '' },
  colorSurface: { type: String, default: '' },
  contacts: [{ id: String, name: String, relationship: String, number: String }],
  bankName: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  profilePictureFileId: { type: Schema.Types.ObjectId, ref: 'File', default: undefined },
  deletionRequestedAt: { type: Date, default: undefined },
}, { timestamps: true });

ProfileSchema.index({ userId: 1, email: 1 }, { unique: true });
ProfileSchema.index({ deletionRequestedAt: 1 }, { sparse: true, expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ProfileModel = mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);
