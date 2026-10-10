import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errors';
import { ProfileModel } from '../models/Profile';
import { PersonalBudgetModel } from '../models/PersonalBudget';
import { UserModel } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';

const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  address: z.string().max(500).optional(),
  dateOfBirth: z.string().max(32).optional(),
  nicNumber: z.string().max(24).optional(),
  portfolioLink: z.string().max(500).optional(),
  mobile: z.string().max(32).optional(),
  workMode: z.enum(['salary', 'business', 'both']).optional(),
  themeColor: z.string().regex(/^#[\da-fA-F]{6}$/).optional(),
  darkMode: z.boolean().optional(),
  textSize: z.enum(['small', 'medium', 'large']).optional(),
  colorText: z.string().max(20).optional(),
  colorMuted: z.string().max(20).optional(),
  colorBg: z.string().max(20).optional(),
  colorSurface: z.string().max(20).optional(),
  contacts: z.array(z.object({ id: z.string(), name: z.string(), relationship: z.string(), number: z.string() })).max(20).optional(),
  bankName: z.string().max(120).optional(),
  bankBranch: z.string().max(120).optional(),
  accountName: z.string().max(120).optional(),
  accountNumber: z.string().max(80).optional(),
  profilePictureFileId: z.string().max(64).optional().nullable(),
});

export const updateProfile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const changes = profileSchema.parse(request.body);
  const plan = changes.workMode ? (changes.workMode === 'salary' ? 'basic' : 'business') : undefined;
  const profileChanges = { ...changes, ...(plan ? { plan } : {}) };
  const profile = await ProfileModel.findOneAndUpdate({ userId }, { $set: profileChanges }, { new: true, runValidators: true });
  if (!profile) throw new HttpError(404, 'Profile not found');
  if (changes.workMode) await UserModel.updateOne({ _id: userId }, { $set: { plan, workMode: changes.workMode } });
  response.json({ profile });
});

export const getPersonalBudget: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const month = (request.query.month as string) || new Date().toISOString().slice(0, 7);
  const record = await PersonalBudgetModel.findOne({ userId: new mongoose.Types.ObjectId(userId), month });
  response.json({ budget: record ? record.budgetCents / 100 : 0 });
});

export const setPersonalBudget: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const { budget } = z.object({ budget: z.coerce.number().finite().min(0).max(1_000_000_000) }).parse(request.body);
  const month = (request.body.month as string) || new Date().toISOString().slice(0, 7);
  const record = await PersonalBudgetModel.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId), month },
    { $set: { budgetCents: Math.round(budget * 100) } },
    { upsert: true, new: true, runValidators: true },
  );
  response.json({ ok: true, budget, data: record });
});