import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { ProfileModel } from '../models/Profile';
import { UserModel } from '../models/User';
import { BankAccountModel } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import { TransactionModel } from '../models/Transaction';
import { ExpenseModel } from '../models/Expense';
import { IncomeModel } from '../models/Income';
import { LoanModel } from '../models/Loan';
import { PawnedItemModel } from '../models/PawnedItem';
import { FinancePaymentModel } from '../models/FinancePayment';
import { SavingsGoalModel } from '../models/SavingsGoal';
import { ReminderModel } from '../models/Reminder';
import { DocumentModel } from '../models/Document';
import { FileModel } from '../models/File';
import { CompanyModel } from '../models/Company';
import { BusinessBranchModel } from '../models/BusinessBranch';
import { BranchEntryModel } from '../models/BranchEntry';
import { OwnerDrawModel } from '../models/OwnerDraw';
import { AgreementModel } from '../models/Agreement';
import { LetterModel } from '../models/Letter';
import { MedicalExpenseModel } from '../models/MedicalExpense';
import { PersonalBudgetModel } from '../models/PersonalBudget';
import { EmploymentProfileModel } from '../models/EmploymentProfile';
import { PasswordResetModel } from '../models/PasswordReset';
import { AuditLogModel } from '../models/AuditLog';
import { SessionModel } from '../models/Session';
import { HttpError } from '../middleware/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { withLedgerSession } from './ledgerService';

export type RegisterInput = { name: string; email: string; password: string; workMode: 'salary' | 'business' | 'both' };

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) throw new HttpError(409, 'Email already registered');

  const credentials = await hashPassword(input.password, randomBytes(16).toString('hex'));
  const plan = input.workMode === 'salary' ? 'basic' : 'business';

  let user;
  try {
    user = await UserModel.create({
      email,
      name: input.name.trim(),
      passwordHash: credentials.hash,
      salt: credentials.salt,
      plan,
      workMode: input.workMode,
      tokenVersion: 0,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('code' in err) && (err as { code: unknown }).code === 11000) {
      throw new HttpError(409, 'Email already registered');
    }
    throw err;
  }

  try {
    const profile = await ProfileModel.create({ userId: user._id, name: user.name, email: user.email, plan, workMode: user.workMode });
    return { user, profile };
  } catch (error) {
    await UserModel.deleteOne({ _id: user._id });
    throw error;
  }
}

const DUMMY_SALT = '0123456789abcdef0123456789abcdef';
const DUMMY_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) {
    // Perform dummy scrypt derivation so timing does not leak user existence
    await verifyPassword(password, DUMMY_SALT, DUMMY_HASH);
    throw new HttpError(401, 'Invalid email or password');
  }

  if (user.lockedUntil) {
    if (user.lockedUntil > new Date()) {
      throw new HttpError(429, 'Account temporarily locked. Try again later.');
    }
    // Lockout duration has expired: reset failure counter and clear lockout timestamp
    user.lockedUntil = undefined;
    user.failedLoginAttempts = 0;
  }

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
    throw new HttpError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const profile = await ProfileModel.findOne({ userId: user._id }).lean();
  return { user, profile };
}

export async function getUserProfile(userId: string) {
  const user = await UserModel.findById(userId).select('-passwordHash -salt').exec();
  if (!user) throw new HttpError(401, 'Account no longer exists');
  const profile = await ProfileModel.findOne({ userId: user._id }).lean();
  return { user, profile };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'Account not found');
  const valid = await verifyPassword(currentPassword, user.salt, user.passwordHash);
  if (!valid) throw new HttpError(400, 'Current password is incorrect');
  const credentials = await hashPassword(newPassword);
  user.passwordHash = credentials.hash;
  user.salt = credentials.salt;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  return user;
}

export async function logoutAll(userId: string) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) throw new HttpError(404, 'Account not found');
  return user;
}

export async function deleteUserAccount(userId: string, password: string, confirmation: string) {
  if (confirmation !== 'DELETE MY ACCOUNT') {
    throw new HttpError(400, 'Confirmation string must exactly match "DELETE MY ACCOUNT"');
  }

  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'Account not found');

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) throw new HttpError(400, 'Incorrect password');

  const uid = new mongoose.Types.ObjectId(userId);

    const userDataModels: mongoose.Model<any>[] = [
    ProfileModel, BankAccountModel, CardModel, TransactionModel, ExpenseModel, IncomeModel,
    LoanModel, PawnedItemModel, FinancePaymentModel, SavingsGoalModel, ReminderModel,
    DocumentModel, FileModel, CompanyModel, BusinessBranchModel, BranchEntryModel,
    OwnerDrawModel, AgreementModel, LetterModel, MedicalExpenseModel, PersonalBudgetModel,
    EmploymentProfileModel, PasswordResetModel, AuditLogModel, SessionModel,
  ];

  await withLedgerSession(async (session) => {
    const opts = session ? { session } : {};
    for (const model of userDataModels) {
      await model.deleteMany({ userId: uid }, opts);
    }
    await UserModel.deleteOne({ _id: uid }, opts);
  });

  return { success: true };
}