import mongoose, { type Model } from 'mongoose';
import { AgreementModel } from '../models/Agreement';
import { CompanyModel } from '../models/Company';
import { DocumentModel } from '../models/Document';
import { ExpenseModel } from '../models/Expense';
import { FinancePaymentModel } from '../models/FinancePayment';
import { IncomeModel } from '../models/Income';
import { LetterModel } from '../models/Letter';
import { LoanModel } from '../models/Loan';
import { MedicalExpenseModel } from '../models/MedicalExpense';
import { PawnedItemModel } from '../models/PawnedItem';
import { ReminderModel } from '../models/Reminder';
import { SavingsGoalModel } from '../models/SavingsGoal';
import { AuditLogModel } from '../models/AuditLog';
import { BusinessBranchModel } from '../models/BusinessBranch';
import { BranchEntryModel } from '../models/BranchEntry';
import { EmploymentProfileModel } from '../models/EmploymentProfile';
import { OwnerDrawModel } from '../models/OwnerDraw';
import { FileModel } from '../models/File';
import { HttpError } from '../middleware/errors';
import type { RecordKind } from '../validations/records';

const models: Record<RecordKind, Model<any>> = {
  incomes: IncomeModel,
  expenses: ExpenseModel,
  financePayments: FinancePaymentModel,
  loans: LoanModel,
  pawnedItems: PawnedItemModel,
  goals: SavingsGoalModel,
  medicalExpenses: MedicalExpenseModel,
  reminders: ReminderModel,
  companies: CompanyModel,
  businessBranches: BusinessBranchModel,
  branchEntries: BranchEntryModel,
  employmentProfiles: EmploymentProfileModel,
  ownerDraws: OwnerDrawModel,
  agreements: AgreementModel,
  letters: LetterModel,
  documents: DocumentModel,
};

const moneyFields: Partial<Record<RecordKind, Record<string, string>>> = {
  incomes: { amount: 'amountCents' },
  expenses: { amount: 'amountCents' },
  financePayments: { amount: 'amountCents' },
  loans: { amount: 'principalCents' },
  pawnedItems: { amountReceived: 'amountReceivedCents' },
  medicalExpenses: { amount: 'amountCents' },
  branchEntries: { amount: 'amountCents' },
  businessBranches: { monthlyTarget: 'monthlyTargetCents', annualTarget: 'annualTargetCents' },
  employmentProfiles: { monthlyGross: 'monthlyGrossCents', monthlyDeductions: 'monthlyDeductionsCents', monthlySavingsTarget: 'monthlySavingsTargetCents' },
  ownerDraws: { amount: 'amountCents' },
  agreements: { value: 'valueCents' },
};

function toStored(kind: RecordKind, input: Record<string, unknown>, isCreate = false) {
  const stored: Record<string, unknown> = { ...input };
  for (const [inputKey, modelKey] of Object.entries(moneyFields[kind] ?? {})) {
    if (inputKey in stored) {
      stored[modelKey] = Math.round(Number(stored[inputKey]) * 100);
      delete stored[inputKey];
    }
  }
  if (kind === 'goals' && 'dailyAmount' in stored) {
    const dailyCents = Math.round(Number(stored.dailyAmount) * 100);
    stored.dailyAmountCents = dailyCents;
    stored.monthlyTargetCents = dailyCents * 30;
    if (isCreate) {
      if (!('savedAmountCents' in stored)) stored.savedAmountCents = 0;
      if (!('contributions' in stored)) stored.contributions = [];
    }
    delete stored.dailyAmount;
  }
  if (kind === 'loans') {
    if ('rate' in stored) {
      stored.ratePercent = Number(stored.rate);
      delete stored.rate;
    }
    if ('principalCents' in stored && !('balanceCents' in stored)) {
      stored.balanceCents = stored.principalCents;
    }
  }
  if (kind === 'pawnedItems' && 'interestRate' in stored) {
    stored.interestRatePercent = Number(stored.interestRate);
    delete stored.interestRate;
  }
  return stored;
}

export async function listRecords(kind: RecordKind, userId: string) {
  const records = await models[kind].find({ userId }).sort({ createdAt: -1 }).lean();
  if (kind !== 'businessBranches') return records;
  const branchIds = records.map((branch: any) => branch._id);
  const entries = await BranchEntryModel.find({ userId, branchId: { $in: branchIds } }).sort({ date: -1 }).lean();
  return records.map((branch: any) => ({
    ...branch,
    monthlyTargetCents: branch.monthlyTargetCents,
    annualTargetCents: branch.annualTargetCents,
    entries: entries.filter((entry: any) => entry.branchId.toString() === branch._id.toString()).map((entry: any) => ({ ...entry, amountCents: entry.amountCents })),
  }));
}

export async function createRecord(kind: RecordKind, userId: string, input: Record<string, unknown>) {
  if (kind === 'loans' && input.dueDate && input.startDate && String(input.dueDate) < String(input.startDate)) {
    throw new HttpError(400, 'Due date cannot be before start date');
  }
  if (kind === 'businessBranches' || kind === 'ownerDraws') {
    if (!mongoose.isValidObjectId(input.companyId) || !await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  }
  if (kind === 'branchEntries' && (!mongoose.isValidObjectId(input.branchId) || !await BusinessBranchModel.exists({ _id: input.branchId, userId }))) throw new HttpError(404, 'Branch not found');
  if (kind === 'documents' && input.fileId && (!mongoose.isValidObjectId(input.fileId) || !await FileModel.exists({ _id: input.fileId, userId }))) throw new HttpError(404, 'File not found');
  const data = toStored(kind, input, true);
  if (kind === 'businessBranches') delete data.entries;
  if (kind === 'branchEntries') data.branchId = new mongoose.Types.ObjectId(String(input.branchId));
  if (kind === 'ownerDraws') data.companyId = new mongoose.Types.ObjectId(String(input.companyId));
  const record = await models[kind].create({ ...data, userId: new mongoose.Types.ObjectId(userId) });
  await AuditLogModel.create({ userId, action: 'create', resourceType: kind, resourceId: record._id });
  return record.toObject();
}

export async function updateRecord(kind: RecordKind, userId: string, id: string, input: Record<string, unknown>) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  if (kind === 'businessBranches' && input.companyId && !await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  if (kind === 'branchEntries' && input.branchId && !await BusinessBranchModel.exists({ _id: input.branchId, userId })) throw new HttpError(404, 'Branch not found');
  const changes = toStored(kind, input, false);
  const entries = kind === 'businessBranches' && Array.isArray(changes.entries) ? changes.entries as Record<string, unknown>[] : [];
  delete changes.entries;
  const updated = await models[kind].findOneAndUpdate(
    { _id: id, userId },
    { $set: changes },
    { new: true, runValidators: true },
  ).exec();
  if (!updated) throw new HttpError(404, 'Record not found');
  if (kind === 'businessBranches') {
    for (const entry of entries) {
      const amountCents = Math.round(Number(entry.amount) * 100);
      const entryData = { date: entry.date, type: entry.type, category: entry.category, amountCents, note: entry.note || '' };
      if (mongoose.isValidObjectId(entry.id)) {
        await BranchEntryModel.updateOne({ _id: entry.id, branchId: id, userId }, { $set: entryData }, { runValidators: true });
      } else {
        await BranchEntryModel.create({ ...entryData, branchId: id, userId });
      }
    }
  }
  await AuditLogModel.create({ userId, action: 'update', resourceType: kind, resourceId: updated._id });
  return updated;
}

export async function deleteRecord(kind: RecordKind, userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  const deleted = await models[kind].findOneAndDelete({ _id: id, userId });
  if (!deleted) throw new HttpError(404, 'Record not found');
  if (kind === 'companies') {
    const branches = await BusinessBranchModel.find({ companyId: deleted._id, userId }).select('_id');
    await BranchEntryModel.deleteMany({ userId, branchId: { $in: branches.map(branch => branch._id) } });
    await BusinessBranchModel.deleteMany({ companyId: deleted._id, userId });
    await OwnerDrawModel.deleteMany({ companyId: deleted._id, userId });
  }
  if (kind === 'businessBranches') await BranchEntryModel.deleteMany({ branchId: deleted._id, userId });
  if (kind === 'documents' && deleted.fileId) await FileModel.deleteOne({ _id: deleted.fileId, userId });
  await AuditLogModel.create({ userId, action: 'delete', resourceType: kind, resourceId: deleted._id });
}

export async function addGoalContribution(userId: string, goalId: string, amount: number, date: string) {
  if (!mongoose.isValidObjectId(goalId)) throw new HttpError(400, 'Invalid goal id');
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Contribution must be greater than zero');
  const goal = await SavingsGoalModel.findOneAndUpdate(
    { _id: goalId, userId },
    { $inc: { savedAmountCents: amountCents }, $push: { contributions: { date, amountCents } } },
    { new: true, runValidators: true },
  );
  if (!goal) throw new HttpError(404, 'Goal not found');
  await AuditLogModel.create({ userId, action: 'contribute', resourceType: 'goals', resourceId: goal._id });
  return goal;
}

export async function recordLoanRepayment(userId: string, loanId: string, amount: number) {
  if (!mongoose.isValidObjectId(loanId)) throw new HttpError(400, 'Invalid loan id');
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Repayment must be greater than zero');
  const loan = await LoanModel.findOne({ _id: loanId, userId });
  if (!loan) throw new HttpError(404, 'Loan not found');
  loan.balanceCents = Math.max(0, loan.balanceCents - amountCents);
  await loan.save();
  await AuditLogModel.create({ userId, action: 'repay', resourceType: 'loans', resourceId: loan._id });
  return loan;
}

export async function recordPawnPayment(userId: string, pawnId: string) {
  if (!mongoose.isValidObjectId(pawnId)) throw new HttpError(400, 'Invalid pawned item id');
  const item = await PawnedItemModel.findOne({ _id: pawnId, userId });
  if (!item) throw new HttpError(404, 'Pawned item not found');
  const dueDate = new Date(`${item.nextDue}T00:00:00.000Z`);
  dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
  item.nextDue = dueDate.toISOString().slice(0, 10);
  await item.save();
  await AuditLogModel.create({ userId, action: 'interest-paid', resourceType: 'pawnedItems', resourceId: item._id });
  return item;
}