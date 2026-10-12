import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errors';
import { ProfileModel } from '../models/Profile';
import { PersonalBudgetModel } from '../models/PersonalBudget';
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
import { CompanyModel } from '../models/Company';
import { BusinessBranchModel } from '../models/BusinessBranch';
import { BranchEntryModel } from '../models/BranchEntry';
import { OwnerDrawModel } from '../models/OwnerDraw';
import { AgreementModel } from '../models/Agreement';
import { LetterModel } from '../models/Letter';
import { MedicalExpenseModel } from '../models/MedicalExpense';
import { EmploymentProfileModel } from '../models/EmploymentProfile';
import { asyncHandler } from '../utils/asyncHandler';
import { isoMonthSchema, optionalIsoDateSchema } from '../validations/records';

const hexColorRegex = /^#([0-9a-fA-F]{6})$/;
const optionalHexColor = z
  .string()
  .trim()
  .refine(val => !val || hexColorRegex.test(val), {
    message: 'Must be a valid 6-digit hex color (e.g. #0FA3B1) or empty',
  })
  .optional();

const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(val => !val || /^https?:\/\/.+/i.test(val), {
    message: 'Portfolio link must be a valid HTTP or HTTPS URL or empty',
  })
  .optional();

const phoneRegex = /^[0-9+\-()\s]{9,20}$/;
const optionalPhone = z
  .string()
  .trim()
  .max(32)
  .refine(val => !val || phoneRegex.test(val), {
    message: 'Must be a valid contact number between 9 and 20 digits/symbols or empty',
  })
  .optional();

const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
const optionalNic = z
  .string()
  .trim()
  .max(24)
  .refine(val => !val || nicRegex.test(val), {
    message: 'NIC must be a valid Sri Lankan NIC (9 digits + V/X or 12 digits) or empty',
  })
  .optional();

export const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  dateOfBirth: optionalIsoDateSchema.optional(),
  nicNumber: optionalNic,
  portfolioLink: optionalHttpUrl,
  mobile: optionalPhone,
  workMode: z.enum(['salary', 'business', 'both']).optional(),
  themeColor: z.string().trim().regex(hexColorRegex, 'Theme color must be a valid 6-digit hex code (e.g. #0FA3B1)').optional(),
  darkMode: z.boolean().optional(),
  textSize: z.enum(['small', 'medium', 'large']).optional(),
  colorText: optionalHexColor,
  colorMuted: optionalHexColor,
  colorBg: optionalHexColor,
  colorSurface: optionalHexColor,
  contacts: z
    .array(
      z.object({
        id: z.string().trim().max(64),
        name: z.string().trim().min(1).max(120),
        relationship: z.string().trim().max(60),
        number: optionalPhone,
      }),
    )
    .max(20)
    .optional(),
  bankName: z.string().trim().max(120).optional(),
  bankBranch: z.string().trim().max(120).optional(),
  accountName: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(80).optional(),
  profilePictureFileId: z.string().trim().max(64).optional().nullable(),
});

export const updateProfile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const changes = profileSchema.parse(request.body);
  const plan = changes.workMode ? (changes.workMode === 'salary' ? 'basic' : 'business') : undefined;
  const profileChanges = { ...changes, ...(plan ? { plan } : {}) };
  const profile = await ProfileModel.findOneAndUpdate({ userId }, { $set: profileChanges }, { new: true, runValidators: true });
  if (!profile) throw new HttpError(404, 'Profile not found');
  if (changes.workMode || changes.name) {
    const userUpdates: Record<string, unknown> = {};
    if (changes.workMode) {
      userUpdates.plan = plan;
      userUpdates.workMode = changes.workMode;
    }
    if (changes.name) {
      userUpdates.name = changes.name;
    }
    await UserModel.updateOne({ _id: userId }, { $set: userUpdates });
  }
  response.json({ profile });
});

export const getPersonalBudget: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const monthParam = (request.query.month as string) || new Date().toISOString().slice(0, 7);
  const month = isoMonthSchema.parse(monthParam);
  const record = await PersonalBudgetModel.findOne({ userId: new mongoose.Types.ObjectId(userId), month });
  response.json({ budget: record ? record.budgetCents / 100 : 0 });
});

const setBudgetSchema = z.object({
  budget: z.coerce.number().finite().min(0).max(1_000_000_000),
  month: isoMonthSchema.optional().default(() => new Date().toISOString().slice(0, 7)),
});

export const setPersonalBudget: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const { budget, month } = setBudgetSchema.parse(request.body);
  const record = await PersonalBudgetModel.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId), month },
    { $set: { budgetCents: Math.round(budget * 100) } },
    { upsert: true, new: true, runValidators: true },
  );
  response.json({ ok: true, budget, data: record });
});

export const exportUserData: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const uid = new mongoose.Types.ObjectId(userId);

  const [
    user,
    profile,
    bankAccounts,
    cards,
    transactions,
    expenses,
    incomes,
    loans,
    pawnedItems,
    financePayments,
    savingsGoals,
    reminders,
    documents,
    companies,
    businessBranches,
    branchEntries,
    ownerDraws,
    agreements,
    letters,
    medicalExpenses,
    personalBudgets,
    employmentProfiles,
  ] = await Promise.all([
    UserModel.findById(uid).select('-passwordHash -salt').lean(),
    ProfileModel.findOne({ userId: uid }).lean(),
    BankAccountModel.find({ userId: uid }).lean(),
    CardModel.find({ userId: uid }).lean(),
    TransactionModel.find({ userId: uid }).lean(),
    ExpenseModel.find({ userId: uid }).lean(),
    IncomeModel.find({ userId: uid }).lean(),
    LoanModel.find({ userId: uid }).lean(),
    PawnedItemModel.find({ userId: uid }).lean(),
    FinancePaymentModel.find({ userId: uid }).lean(),
    SavingsGoalModel.find({ userId: uid }).lean(),
    ReminderModel.find({ userId: uid }).lean(),
    DocumentModel.find({ userId: uid }).select('-fileId').lean(),
    CompanyModel.find({ userId: uid }).lean(),
    BusinessBranchModel.find({ userId: uid }).lean(),
    BranchEntryModel.find({ userId: uid }).lean(),
    OwnerDrawModel.find({ userId: uid }).lean(),
    AgreementModel.find({ userId: uid }).lean(),
    LetterModel.find({ userId: uid }).lean(),
    MedicalExpenseModel.find({ userId: uid }).lean(),
    PersonalBudgetModel.find({ userId: uid }).lean(),
    EmploymentProfileModel.find({ userId: uid }).lean(),
  ]);

  const exportPayload = {
    exportDate: new Date().toISOString(),
    account: user,
    profile,
    financialRecords: {
      bankAccounts,
      cards,
      transactions,
      expenses,
      incomes,
      loans,
      pawnedItems,
      financePayments,
      savingsGoals,
      reminders,
      documents,
      personalBudgets,
      medicalExpenses,
    },
    businessRecords: {
      companies,
      businessBranches,
      branchEntries,
      ownerDraws,
      agreements,
      letters,
      employmentProfiles,
    },
  };

  response.setHeader('content-type', 'application/json');
  response.setHeader('content-disposition', `attachment; filename="fintarg-data-export-${new Date().toISOString().slice(0, 10)}.json"`);
  response.json(exportPayload);
});