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
import { BankAccountModel } from '../models/BankAccount';
import { CardModel } from '../models/Card';
import { TransactionModel } from '../models/Transaction';
import { calculateAmortizationSchedule, calculateLoan } from '../utils/loanMath';
import { HttpError } from '../middleware/errors';
import { isValidIsoDate, type RecordKind } from '../validations/records';
import { postTransaction, replaceTransaction, reverseTransaction } from './ledgerService';

const models: Record<RecordKind, Model<any>> = {
  bankAccounts: BankAccountModel,
  cards: CardModel,
  transactions: TransactionModel,
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
  bankAccounts: { balance: 'balanceCents', openingBalance: 'openingBalanceCents' },
  cards: { creditLimit: 'creditLimitCents', balance: 'balanceCents' },
  transactions: { amount: 'amountCents' },
  incomes: { amount: 'amountCents' },
  expenses: { amount: 'amountCents' },
  financePayments: { amount: 'amountCents' },
  loans: { amount: 'principalCents' },
  pawnedItems: { amountReceived: 'amountReceivedCents' },
  goals: { targetAmount: 'targetAmountCents' },
  medicalExpenses: { amount: 'amountCents' },
  branchEntries: { amount: 'amountCents' },
  businessBranches: { monthlyTarget: 'monthlyTargetCents', annualTarget: 'annualTargetCents' },
  employmentProfiles: { monthlyGross: 'monthlyGrossCents', monthlyDeductions: 'monthlyDeductionsCents', monthlySavingsTarget: 'monthlySavingsTargetCents' },
  ownerDraws: { amount: 'amountCents' },
  agreements: { value: 'valueCents' },
};

function toStoredForCreate(kind: RecordKind, input: Record<string, unknown>) {
  const stored: Record<string, unknown> = { ...input };
  for (const [inputKey, modelKey] of Object.entries(moneyFields[kind] ?? {})) {
    if (inputKey in stored) {
      stored[modelKey] = Math.round(Number(stored[inputKey]) * 100);
      delete stored[inputKey];
    }
  }
  if (kind === 'goals') {
    if (stored.targetDate && (!stored.endDate || stored.endDate === '')) {
      stored.endDate = stored.targetDate;
    }
    if (stored.endDate && (!stored.targetDate || stored.targetDate === '')) {
      stored.targetDate = stored.endDate;
    }
    if ('dailyAmount' in stored && stored.dailyAmount !== undefined && stored.dailyAmount !== null && stored.dailyAmount !== '') {
      const dailyCents = Math.round(Number(stored.dailyAmount) * 100);
      stored.dailyAmountCents = dailyCents;
      stored.monthlyTargetCents = dailyCents * 30;
      delete stored.dailyAmount;
    }
    if (!('savedAmountCents' in stored)) stored.savedAmountCents = 0;
    if (!('contributions' in stored)) stored.contributions = [];
  }
  if (kind === 'loans') {
    if ('rate' in stored) {
      stored.ratePercent = Number(stored.rate);
      delete stored.rate;
    }
    if ('principalCents' in stored && !('balanceCents' in stored)) {
      stored.balanceCents = stored.principalCents;
    }
    const principal = Number(stored.principalCents || 0) / 100;
    const rate = Number(stored.ratePercent || 0);
    const tenure = Number(stored.tenureMonths || 12);
    const method = (stored.method as any) || 'simple';
    const interestBasis = (stored.interestBasis as any) || 'annual';
    const calc = calculateLoan(principal, rate, tenure, method, interestBasis);
    stored.monthlyPaymentCents = Math.round(calc.monthlyPayment * 100);
    stored.totalInterestCents = Math.round(calc.totalInterest * 100);
  }
  if (kind === 'pawnedItems' && 'interestRate' in stored) {
    stored.interestRatePercent = Number(stored.interestRate);
    delete stored.interestRate;
  }
  if (kind === 'bankAccounts') {
    if ('name' in stored && !('accountName' in stored)) {
      stored.accountName = stored.name;
    }
    if ('accountName' in stored && !('name' in stored)) {
      stored.name = stored.accountName;
    }
    if (!stored.accountName) {
      stored.accountName = 'Main Account';
    }
    if ('currentBalance' in stored && !('balanceCents' in stored) && !('openingBalanceCents' in stored)) {
      stored.openingBalanceCents = Math.round(Number(stored.currentBalance || 0) * 100);
    }
    delete stored.currentBalance;
    delete stored.balance;
    delete stored.openingBalance;

    if ('openingBalanceCents' in stored && !('balanceCents' in stored)) {
      stored.balanceCents = stored.openingBalanceCents;
    } else if ('balanceCents' in stored && !('openingBalanceCents' in stored)) {
      stored.openingBalanceCents = stored.balanceCents;
    } else if (!('openingBalanceCents' in stored) && !('balanceCents' in stored)) {
      stored.openingBalanceCents = 0;
      stored.balanceCents = 0;
    }
    if (stored.accountType === 'checking') {
      stored.accountType = 'current';
    }
  }
  if (kind === 'cards') {
    if ('cardNumber' in stored && stored.cardNumber && !stored.last4) {
      stored.last4 = String(stored.cardNumber).replace(/\D/g, '').slice(-4);
      stored.lastFourDigits = stored.last4;
    }
    delete stored.cardNumber;
    delete stored.cvv;

    if ('name' in stored && !('cardName' in stored)) {
      stored.cardName = stored.name;
    }
    if ('cardName' in stored && !('name' in stored)) {
      stored.name = stored.cardName;
    }
    if (!stored.cardName) {
      stored.cardName = 'Payment Card';
    }
    if ('lastFourDigits' in stored && !('last4' in stored)) {
      stored.last4 = String(stored.lastFourDigits).slice(-4);
    }
    if (!stored.last4) {
      stored.last4 = '0000';
    }
    if ('expiryDate' in stored && stored.expiryDate && (!stored.expiryMonth || !stored.expiryYear)) {
      const match = String(stored.expiryDate).match(/^(\d{1,2})\/(\d{2,4})$/);
      if (match) {
        stored.expiryMonth = parseInt(match[1], 10);
        const yr = parseInt(match[2], 10);
        stored.expiryYear = yr < 100 ? 2000 + yr : yr;
      }
    }
  }
  if ('bankAccountId' in stored) {
    if (stored.bankAccountId) {
      if (!mongoose.isValidObjectId(stored.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
      stored.bankAccountId = new mongoose.Types.ObjectId(String(stored.bankAccountId));
    } else {
      stored.bankAccountId = null;
    }
  }
  if ('cardId' in stored) {
    if (stored.cardId) {
      if (!mongoose.isValidObjectId(stored.cardId)) throw new HttpError(400, 'Invalid card id');
      stored.cardId = new mongoose.Types.ObjectId(String(stored.cardId));
    } else {
      stored.cardId = null;
    }
  }
  return stored;
}

function toStoredForUpdate(kind: RecordKind, input: Record<string, unknown>, existingDoc: any) {
  const stored: Record<string, unknown> = { ...input };
  for (const [inputKey, modelKey] of Object.entries(moneyFields[kind] ?? {})) {
    if (inputKey in stored) {
      stored[modelKey] = Math.round(Number(stored[inputKey]) * 100);
      delete stored[inputKey];
    }
  }
  if (kind === 'goals') {
    if (stored.targetDate && (!stored.endDate || stored.endDate === '')) {
      stored.endDate = stored.targetDate;
    }
    if (stored.endDate && (!stored.targetDate || stored.targetDate === '')) {
      stored.targetDate = stored.endDate;
    }
    if ('dailyAmount' in stored && stored.dailyAmount !== undefined && stored.dailyAmount !== null && stored.dailyAmount !== '') {
      const dailyCents = Math.round(Number(stored.dailyAmount) * 100);
      stored.dailyAmountCents = dailyCents;
      stored.monthlyTargetCents = dailyCents * 30;
      delete stored.dailyAmount;
    }
  }
  if (kind === 'loans') {
    if ('rate' in stored) {
      stored.ratePercent = Number(stored.rate);
      delete stored.rate;
    }
    const hasTermChanges =
      'principalCents' in stored ||
      'ratePercent' in stored ||
      'tenureMonths' in stored ||
      'method' in stored ||
      'interestBasis' in stored;

    if (hasTermChanges) {
      const newPrincipalCents = 'principalCents' in stored ? Number(stored.principalCents) : Number(existingDoc.principalCents || 0);
      const principal = newPrincipalCents / 100;
      const rate = 'ratePercent' in stored ? Number(stored.ratePercent) : Number(existingDoc.ratePercent || 0);
      const tenure = 'tenureMonths' in stored ? Number(stored.tenureMonths) : Number(existingDoc.tenureMonths || 12);
      const method = (('method' in stored ? stored.method : existingDoc.method) as any) || 'simple';
      const interestBasis = (('interestBasis' in stored ? stored.interestBasis : existingDoc.interestBasis) as any) || 'annual';
      const calc = calculateLoan(principal, rate, tenure, method, interestBasis);
      stored.monthlyPaymentCents = Math.round(calc.monthlyPayment * 100);
      stored.totalInterestCents = Math.round(calc.totalInterest * 100);

      if ('principalCents' in stored && !('balanceCents' in stored)) {
        const totalRepaidCents = Array.isArray(existingDoc.repayments) && existingDoc.repayments.length > 0
          ? existingDoc.repayments.reduce((sum: number, r: any) => sum + (Number(r.amountCents) || 0), 0)
          : Math.max(0, (Number(existingDoc.principalCents) || 0) - (Number(existingDoc.balanceCents) || 0));

        stored.balanceCents = Math.max(0, newPrincipalCents - totalRepaidCents);
      }
    }
  }
  if (kind === 'pawnedItems' && 'interestRate' in stored) {
    stored.interestRatePercent = Number(stored.interestRate);
    delete stored.interestRate;
  }
  if (kind === 'bankAccounts') {
    if ('name' in stored && !('accountName' in stored)) {
      stored.accountName = stored.name;
    }
    if ('accountName' in stored && !('name' in stored)) {
      stored.name = stored.accountName;
    }
    // Ledger balance integrity: never overwrite balance on account metadata update
    delete stored.balance;
    delete stored.balanceCents;
    delete stored.currentBalance;
    delete stored.openingBalance;
    delete stored.openingBalanceCents;
    if (stored.accountType === 'checking') {
      stored.accountType = 'current';
    }
  }
  if (kind === 'cards') {
    if ('cardNumber' in stored && stored.cardNumber && !stored.last4) {
      stored.last4 = String(stored.cardNumber).replace(/\D/g, '').slice(-4);
      stored.lastFourDigits = stored.last4;
    }
    delete stored.cardNumber;
    delete stored.cvv;

    if ('name' in stored && !('cardName' in stored)) {
      stored.cardName = stored.name;
    }
    if ('cardName' in stored && !('name' in stored)) {
      stored.name = stored.cardName;
    }
    if ('lastFourDigits' in stored && !('last4' in stored)) {
      stored.last4 = String(stored.lastFourDigits).slice(-4);
    }
    if ('expiryDate' in stored && stored.expiryDate && (!stored.expiryMonth || !stored.expiryYear)) {
      const match = String(stored.expiryDate).match(/^(\d{1,2})\/(\d{2,4})$/);
      if (match) {
        stored.expiryMonth = parseInt(match[1], 10);
        const yr = parseInt(match[2], 10);
        stored.expiryYear = yr < 100 ? 2000 + yr : yr;
      }
    }
  }
  if ('bankAccountId' in stored) {
    if (stored.bankAccountId) {
      if (!mongoose.isValidObjectId(stored.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
      stored.bankAccountId = new mongoose.Types.ObjectId(String(stored.bankAccountId));
    } else {
      stored.bankAccountId = null;
    }
  }
  if ('cardId' in stored) {
    if (stored.cardId) {
      if (!mongoose.isValidObjectId(stored.cardId)) throw new HttpError(400, 'Invalid card id');
      stored.cardId = new mongoose.Types.ObjectId(String(stored.cardId));
    } else {
      stored.cardId = null;
    }
  }
  return stored;
}

export async function getRecord(kind: RecordKind, userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  const record: any = await models[kind].findOne({ _id: id, userId }).lean();
  if (!record) throw new HttpError(404, 'Record not found');
  if (kind === 'bankAccounts') {
    return {
      ...record,
      id: record._id.toString(),
      name: (record as any).accountName || (record as any).name || 'Main Account',
      accountName: (record as any).accountName || (record as any).name || 'Main Account',
      currentBalance: ((record as any).balanceCents || 0) / 100,
      balance: ((record as any).balanceCents || 0) / 100,
      openingBalance: ((record as any).openingBalanceCents || 0) / 100,
      openingBalanceCents: (record as any).openingBalanceCents || 0,
    };
  }
  if (kind === 'cards') {
    const card: any = { ...record };
    delete card.cardNumber;
    delete card.cvv;
    return {
      ...card,
      id: card._id.toString(),
      name: card.cardName || card.name || 'Payment Card',
      cardName: card.cardName || card.name || 'Payment Card',
      lastFourDigits: card.last4 || '0000',
      currentBalance: (card.balanceCents || 0) / 100,
      creditLimit: (card.creditLimitCents || 0) / 100,
    };
  }
  if (kind === 'businessBranches') {
    const entries = await BranchEntryModel.find({ userId, branchId: record._id }).sort({ date: -1 }).lean();
    return {
      ...record,
      entries: entries.map((entry: any) => ({ ...entry, amountCents: entry.amountCents })),
    };
  }
  return record;
}

export async function listRecords(kind: RecordKind, userId: string) {
  const records = await models[kind].find({ userId }).sort({ createdAt: -1 }).lean();
  if (kind === 'bankAccounts') {
    return records.map((acc: any) => ({
      ...acc,
      id: acc._id.toString(),
      name: acc.accountName || acc.name || 'Main Account',
      accountName: acc.accountName || acc.name || 'Main Account',
      currentBalance: (acc.balanceCents || 0) / 100,
      balance: (acc.balanceCents || 0) / 100,
      openingBalance: (acc.openingBalanceCents || 0) / 100,
      openingBalanceCents: acc.openingBalanceCents || 0,
    }));
  }
  if (kind === 'cards') {
    return records.map((card: any) => {
      delete card.cardNumber;
      delete card.cvv;
      return {
        ...card,
        id: card._id.toString(),
        name: card.cardName || card.name || 'Payment Card',
        cardName: card.cardName || card.name || 'Payment Card',
        lastFourDigits: card.last4 || '0000',
        currentBalance: (card.balanceCents || 0) / 100,
        creditLimit: (card.creditLimitCents || 0) / 100,
      };
    });
  }
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
  if (input.companyId && (kind === 'businessBranches' || kind === 'ownerDraws')) {
    if (!mongoose.isValidObjectId(input.companyId)) throw new HttpError(400, 'Invalid company id');
    if (!await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  }
  if (input.branchId && kind === 'branchEntries') {
    if (!mongoose.isValidObjectId(input.branchId)) throw new HttpError(400, 'Invalid branch id');
    if (!await BusinessBranchModel.exists({ _id: input.branchId, userId })) throw new HttpError(404, 'Branch not found');
  }
  if (input.fileId && kind === 'documents') {
    if (!mongoose.isValidObjectId(input.fileId)) throw new HttpError(400, 'Invalid file id');
    if (!await FileModel.exists({ _id: input.fileId, userId })) throw new HttpError(404, 'File not found');
  }
  if (input.bankAccountId && (kind === 'cards' || kind === 'expenses' || kind === 'incomes' || kind === 'transactions' || kind === 'financePayments')) {
    if (!mongoose.isValidObjectId(input.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
    if (!await BankAccountModel.exists({ _id: input.bankAccountId, userId })) throw new HttpError(404, 'Bank account not found');
  }
  if (input.cardId && (kind === 'expenses' || kind === 'transactions')) {
    if (!mongoose.isValidObjectId(input.cardId)) throw new HttpError(400, 'Invalid card id');
    if (!await CardModel.exists({ _id: input.cardId, userId })) throw new HttpError(404, 'Card not found');
  }
  const data = toStoredForCreate(kind, input);
  if (kind === 'businessBranches') delete data.entries;
  if (kind === 'branchEntries') data.branchId = new mongoose.Types.ObjectId(String(input.branchId));
  if (kind === 'ownerDraws') data.companyId = new mongoose.Types.ObjectId(String(input.companyId));
  const record = await models[kind].create({ ...data, userId: new mongoose.Types.ObjectId(userId) });

  if (kind === 'expenses') {
    await postTransaction({
      userId,
      type: 'expense',
      amountCents: Number(data.amountCents || 0),
      date: String(data.date),
      category: String(data.category || 'General'),
      description: String(data.note || 'Expense'),
      paymentMethod: (data.paymentMethod as any) || 'cash',
      bankAccountId: data.bankAccountId ? new mongoose.Types.ObjectId(String(data.bankAccountId)) : null,
      cardId: data.cardId ? new mongoose.Types.ObjectId(String(data.cardId)) : null,
      referenceId: record._id.toString(),
    });
  }
  if (kind === 'incomes') {
    await postTransaction({
      userId,
      type: 'income',
      amountCents: Number(data.amountCents || 0),
      date: String(data.date),
      category: String(data.source || 'General'),
      description: String(data.source || 'Income'),
      paymentMethod: (data.paymentMethod as any) || 'bank_transfer',
      bankAccountId: data.bankAccountId ? new mongoose.Types.ObjectId(String(data.bankAccountId)) : null,
      referenceId: record._id.toString(),
    });
  }

  await AuditLogModel.create({ userId, action: 'create', resourceType: kind, resourceId: record._id });
  return record.toObject();
}

export async function updateRecord(kind: RecordKind, userId: string, id: string, input: Record<string, unknown>) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  if (input.companyId && (kind === 'businessBranches' || kind === 'ownerDraws')) {
    if (!mongoose.isValidObjectId(input.companyId)) throw new HttpError(400, 'Invalid company id');
    if (!await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  }
  if (input.branchId && kind === 'branchEntries') {
    if (!mongoose.isValidObjectId(input.branchId)) throw new HttpError(400, 'Invalid branch id');
    if (!await BusinessBranchModel.exists({ _id: input.branchId, userId })) throw new HttpError(404, 'Branch not found');
  }
  if (input.bankAccountId && (kind === 'cards' || kind === 'expenses' || kind === 'incomes' || kind === 'transactions' || kind === 'financePayments')) {
    if (!mongoose.isValidObjectId(input.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
    if (!await BankAccountModel.exists({ _id: input.bankAccountId, userId })) throw new HttpError(404, 'Bank account not found');
  }
  if (input.cardId && (kind === 'expenses' || kind === 'transactions')) {
    if (!mongoose.isValidObjectId(input.cardId)) throw new HttpError(400, 'Invalid card id');
    if (!await CardModel.exists({ _id: input.cardId, userId })) throw new HttpError(404, 'Card not found');
  }

  const existingDoc = await models[kind].findOne({ _id: id, userId });
  if (!existingDoc) throw new HttpError(404, 'Record not found');

  const changes = toStoredForUpdate(kind, input, existingDoc);
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
  if (kind === 'expenses') {
    await replaceTransaction(userId, updated._id.toString(), {
      userId,
      type: 'expense',
      amountCents: Number(updated.amountCents || 0),
      date: String(updated.date),
      category: String(updated.category || 'General'),
      description: String(updated.note || 'Expense'),
      paymentMethod: (updated.paymentMethod as any) || 'cash',
      bankAccountId: updated.bankAccountId ? new mongoose.Types.ObjectId(String(updated.bankAccountId)) : null,
      cardId: updated.cardId ? new mongoose.Types.ObjectId(String(updated.cardId)) : null,
      referenceId: updated._id.toString(),
    });
  }
  if (kind === 'incomes') {
    await replaceTransaction(userId, updated._id.toString(), {
      userId,
      type: 'income',
      amountCents: Number(updated.amountCents || 0),
      date: String(updated.date),
      category: String(updated.source || 'General'),
      description: String(updated.source || 'Income'),
      paymentMethod: (updated.paymentMethod as any) || 'bank_transfer',
      bankAccountId: updated.bankAccountId ? new mongoose.Types.ObjectId(String(updated.bankAccountId)) : null,
      referenceId: updated._id.toString(),
    });
  }
  await AuditLogModel.create({ userId, action: 'update', resourceType: kind, resourceId: updated._id });
  return updated;
}

export async function deleteRecord(kind: RecordKind, userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  if (kind === 'bankAccounts') {
    const account = await BankAccountModel.findOne({ _id: id, userId });
    if (account?.accountType === 'cash') {
      throw new HttpError(400, 'Cannot delete the built-in cash wallet account');
    }
  }
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
  if (kind === 'expenses' || kind === 'incomes') {
    await reverseTransaction(userId, deleted._id.toString());
  }
  if (kind === 'bankAccounts') {
    await CardModel.deleteMany({ bankAccountId: deleted._id, userId });
    await TransactionModel.deleteMany({ bankAccountId: deleted._id, userId });
  }
  await AuditLogModel.create({ userId, action: 'delete', resourceType: kind, resourceId: deleted._id });
}

export async function addGoalContribution(userId: string, goalId: string, amount: number, date: string, note = '') {
  if (!mongoose.isValidObjectId(goalId)) throw new HttpError(400, 'Invalid goal id');
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Contribution must be greater than zero');
  const goal = await SavingsGoalModel.findOneAndUpdate(
    { _id: goalId, userId },
    { $inc: { savedAmountCents: amountCents }, $push: { contributions: { date, amountCents, note } } },
    { new: true, runValidators: true },
  );
  if (!goal) throw new HttpError(404, 'Goal not found');
  await AuditLogModel.create({ userId, action: 'contribute', resourceType: 'goals', resourceId: goal._id });
  return goal;
}

export async function recordLoanRepayment(
  userId: string,
  loanId: string,
  amount: number,
  date?: string,
  note = '',
  paymentMethod: string = 'cash',
  bankAccountId?: string | null,
) {
  if (!mongoose.isValidObjectId(loanId)) throw new HttpError(400, 'Invalid loan id');
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Repayment must be greater than zero');
  const loan = await LoanModel.findOne({ _id: loanId, userId });
  if (!loan) throw new HttpError(404, 'Loan not found');

  let targetBankAccountId: mongoose.Types.ObjectId | null = null;
  if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(paymentMethod)) {
    if (!bankAccountId || !bankAccountId.trim()) {
      throw new HttpError(400, `Bank account is required for ${paymentMethod.replace('_', ' ')} repayments`);
    }
  }

  if (bankAccountId && bankAccountId.trim() !== '') {
    if (!mongoose.isValidObjectId(bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
    const bankAccount = await BankAccountModel.findOne({ _id: bankAccountId, userId });
    if (!bankAccount) throw new HttpError(404, 'Bank account not found');
    targetBankAccountId = bankAccount._id as mongoose.Types.ObjectId;
  }

  const paymentDate = date && isValidIsoDate(date) ? date : new Date().toISOString().slice(0, 10);

  // Split principal and interest using schedule / math
  let principalCents = 0;
  let interestCents = 0;

  if (loan.method === 'simple') {
    const monthlyInterestCents = loan.tenureMonths > 0 ? Math.round(loan.totalInterestCents / loan.tenureMonths) : 0;
    interestCents = Math.min(amountCents, monthlyInterestCents);
    principalCents = Math.max(0, amountCents - interestCents);
  } else {
    const schedule = calculateAmortizationSchedule(
      loan.principalCents / 100,
      loan.ratePercent,
      loan.tenureMonths,
      loan.interestBasis || 'annual',
    );
    const installmentIndex = (loan.repayments || []).length;
    if (installmentIndex < schedule.length) {
      const scheduledRow = schedule[installmentIndex];
      const scheduledInterestCents = Math.round(scheduledRow.interest * 100);
      const scheduledPrincipalCents = Math.round(scheduledRow.principal * 100);
      if (amountCents === Math.round(scheduledRow.payment * 100)) {
        interestCents = scheduledInterestCents;
        principalCents = scheduledPrincipalCents;
      } else {
        interestCents = Math.min(amountCents, scheduledInterestCents);
        principalCents = Math.max(0, amountCents - interestCents);
      }
    } else {
      interestCents = 0;
      principalCents = amountCents;
    }
  }

  loan.repayments = loan.repayments || [];
  const repaymentSubdocId = new mongoose.Types.ObjectId();

  // Create transaction via ledgerService
  const tx = await postTransaction({
    userId,
    type: 'expense',
    amountCents,
    date: paymentDate,
    category: 'Loan Repayment',
    description: note || `Loan repayment to ${loan.lender}`,
    paymentMethod: paymentMethod as any,
    bankAccountId: targetBankAccountId,
    referenceId: `loan_repayment_${loan._id}_${repaymentSubdocId}`,
  });

  loan.repayments.push({
    _id: repaymentSubdocId,
    date: paymentDate,
    amountCents,
    principalCents,
    interestCents,
    note,
    paymentMethod,
    bankAccountId: targetBankAccountId,
    transactionId: tx._id,
  });

  loan.balanceCents = Math.max(0, loan.balanceCents - amountCents);
  await loan.save();
  await AuditLogModel.create({ userId, action: 'repay', resourceType: 'loans', resourceId: loan._id });
  return loan;
}

export async function deleteLoanRepayment(userId: string, loanId: string, repaymentId: string) {
  if (!mongoose.isValidObjectId(loanId)) throw new HttpError(400, 'Invalid loan id');
  if (!mongoose.isValidObjectId(repaymentId)) throw new HttpError(400, 'Invalid repayment id');

  const loan = await LoanModel.findOne({ _id: loanId, userId });
  if (!loan) throw new HttpError(404, 'Loan not found');

  const repaymentIndex = (loan.repayments || []).findIndex(
    (r: any) => String(r._id) === String(repaymentId),
  );
  if (repaymentIndex === -1) throw new HttpError(404, 'Repayment not found');

  const repayment = loan.repayments[repaymentIndex];
  const refId = `loan_repayment_${loan._id}_${repayment._id}`;

  await reverseTransaction(userId, refId);

  loan.repayments.splice(repaymentIndex, 1);
  const totalRepaidCents = (loan.repayments || []).reduce(
    (sum: number, r: any) => sum + Number(r.amountCents || 0),
    0,
  );
  loan.balanceCents = Math.max(0, loan.principalCents - totalRepaidCents);
  await loan.save();

  await AuditLogModel.create({ userId, action: 'undo-repay', resourceType: 'loans', resourceId: loan._id });
  return loan;
}

export async function calculateLoanPayoff(userId: string, loanId: string) {
  if (!mongoose.isValidObjectId(loanId)) throw new HttpError(400, 'Invalid loan id');

  const loan = await LoanModel.findOne({ _id: loanId, userId });
  if (!loan) throw new HttpError(404, 'Loan not found');

  const totalRepaidCents = (loan.repayments || []).reduce(
    (sum: number, r: any) => sum + Number(r.amountCents || 0),
    0,
  );
  const totalPrincipalRepaidCents = (loan.repayments || []).reduce(
    (sum: number, r: any) => sum + Number(r.principalCents || 0),
    0,
  );
  const totalInterestRepaidCents = (loan.repayments || []).reduce(
    (sum: number, r: any) => sum + Number(r.interestCents || 0),
    0,
  );

  const totalContractCents = loan.principalCents + loan.totalInterestCents;
  const remainingTotalContractCents = Math.max(0, totalContractCents - totalRepaidCents);
  const remainingPrincipalCents = Math.max(0, loan.principalCents - totalRepaidCents);
  const payoffAmountCents = remainingPrincipalCents;
  const interestSavingsCents = Math.max(0, remainingTotalContractCents - payoffAmountCents);

  return {
    loanId: loan._id,
    lender: loan.lender,
    principalCents: loan.principalCents,
    totalInterestCents: loan.totalInterestCents,
    totalRepaidCents,
    totalPrincipalRepaidCents,
    totalInterestRepaidCents,
    remainingBalanceCents: loan.balanceCents,
    remainingTotalContractCents,
    payoffAmountCents,
    interestSavingsCents,
  };
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

export interface TransactionHistoryFilters {
  bankAccountId?: string;
  cardId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: 'income' | 'expense' | 'transfer';
  paymentMethod?: string;
  limit?: number;
  skip?: number;
}

export async function getTransactionHistory(userId: string, filters: TransactionHistoryFilters = {}) {
  const query: Record<string, any> = { userId: new mongoose.Types.ObjectId(userId) };

  if (filters.bankAccountId) {
    if (mongoose.isValidObjectId(filters.bankAccountId)) {
      query.bankAccountId = new mongoose.Types.ObjectId(filters.bankAccountId);
    }
  }
  if (filters.cardId) {
    if (mongoose.isValidObjectId(filters.cardId)) {
      query.cardId = new mongoose.Types.ObjectId(filters.cardId);
    }
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.paymentMethod) {
    query.paymentMethod = filters.paymentMethod;
  }
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = filters.startDate;
    if (filters.endDate) query.date.$lte = filters.endDate;
  }

  const allTransactions = await TransactionModel.find(query).sort({ date: 1, createdAt: 1 }).lean();

  let runningTotalCents = 0;
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  const withRunningTotals = allTransactions.map((tx: any) => {
    if (tx.type === 'income') {
      runningTotalCents += tx.amountCents;
      totalIncomeCents += tx.amountCents;
    } else if (tx.type === 'expense') {
      runningTotalCents -= tx.amountCents;
      totalExpenseCents += tx.amountCents;
    }
    return {
      ...tx,
      runningBalanceCents: runningTotalCents,
    };
  });

  const limit = Math.min(filters.limit || 100, 1000);
  const skip = filters.skip || 0;
  const paginated = withRunningTotals.slice().reverse().slice(skip, skip + limit);

  return {
    transactions: paginated,
    totalCount: withRunningTotals.length,
    summary: {
      totalIncomeCents,
      totalExpenseCents,
      netCents: totalIncomeCents - totalExpenseCents,
      closingBalanceCents: runningTotalCents,
    },
  };
}