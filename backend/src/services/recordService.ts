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
import { accruedReducingBalanceInterestCents, calculateLoan, completedPeriods, monthlyRateFor } from '../utils/loanMath';
import { getDaysInMonth } from '../utils/dateMath';
import { HttpError } from '../middleware/errors';
import { isValidIsoDate, transferSchema, type RecordKind } from '../validations/records';
import { assertAccountNotArchived, deleteTransfer, ensureCashWallet, postTransaction, replaceTransaction, reverseTransaction, reverseTransactionById, transferFunds, updateTransactionById, withLedgerSession } from './ledgerService';

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
  pawnedItems: { amountReceived: 'amountReceivedCents', principalOutstanding: 'principalOutstandingCents', interestPaid: 'interestPaidCents' },
  goals: { targetAmount: 'targetAmountCents' },
  medicalExpenses: { amount: 'amountCents' },
  branchEntries: { amount: 'amountCents' },
  businessBranches: { monthlyTarget: 'monthlyTargetCents', annualTarget: 'annualTargetCents' },
  employmentProfiles: { monthlyGross: 'monthlyGrossCents', monthlyDeductions: 'monthlyDeductionsCents', monthlySavingsTarget: 'monthlySavingsTargetCents' },
  ownerDraws: { amount: 'amountCents' },
  agreements: { value: 'valueCents' },
  companies: { monthlyRevenueTarget: 'monthlyRevenueTargetCents', annualRevenueTarget: 'annualRevenueTargetCents' },
};

export function deriveNextDueDate(dueDay: number, fromDate: Date = new Date()): string {
  const d = Math.min(31, Math.max(1, Math.floor(dueDay || 1)));
  const y = fromDate.getUTCFullYear();
  const m = fromDate.getUTCMonth();
  const todayDate = fromDate.getUTCDate();

  let targetYear = y;
  let targetMonth = m;
  if (todayDate > d) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(d, daysInMonth);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function isAmortizingLoan(method: string | undefined) {
  return (method || 'simple') !== 'simple';
}

/**
 * Cents of repayments that have reduced the loan balance. Amortizing (reducing balance / compound)
 * loans track outstanding principal, so only the principal portion counts; simple (flat) loans
 * have always tracked balance as principal minus total paid.
 */
function principalRepaidCents(method: string | undefined, repayments: any[] = []) {
  const field = isAmortizingLoan(method) ? 'principalCents' : 'amountCents';
  return repayments.reduce((sum: number, r: any) => sum + (Number(r[field]) || 0), 0);
}

/**
 * Interest accrued and still unpaid on a loan as of a date. Driven by dates and actual principal
 * outstanding rather than by repayment count, so extra, partial, or same-month payments cannot
 * misalign the principal/interest split.
 */
function loanInterestDueCents(loan: any, asOfDate: string) {
  const repayments: any[] = loan.repayments || [];
  const interestPaidCents = repayments.reduce((sum: number, r: any) => sum + (Number(r.interestCents) || 0), 0);
  let accruedCents = 0;
  if (isAmortizingLoan(loan.method)) {
    accruedCents = accruedReducingBalanceInterestCents(
      Number(loan.principalCents) || 0,
      monthlyRateFor(Number(loan.ratePercent) || 0, loan.interestBasis || 'annual'),
      String(loan.startDate),
      repayments.map((r: any) => ({ date: String(r.date), principalCents: Number(r.principalCents) || 0 })),
      asOfDate,
    );
  } else if (loan.tenureMonths > 0 && loan.totalInterestCents > 0) {
    // Flat interest: one equal share falls due per installment; the first is due on any payment.
    const installmentsDue = Math.min(loan.tenureMonths, Math.max(1, completedPeriods(String(loan.startDate), asOfDate)));
    accruedCents = Math.min(loan.totalInterestCents, Math.round(loan.totalInterestCents * installmentsDue / loan.tenureMonths));
  }
  return Math.max(0, accruedCents - interestPaidCents);
}

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
      const targetMonth = String(stored.targetDate || stored.endDate || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
      stored.monthlyTargetCents = dailyCents * getDaysInMonth(targetMonth);
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
  if (kind === 'pawnedItems') {
    if ('interestRate' in stored) {
      stored.interestRatePercent = Number(stored.interestRate);
      delete stored.interestRate;
    }
    if (!('principalOutstandingCents' in stored) && 'amountReceivedCents' in stored) {
      stored.principalOutstandingCents = stored.amountReceivedCents;
    }
    if (!('interestPaidCents' in stored)) {
      stored.interestPaidCents = 0;
    }
    if (!('status' in stored)) {
      stored.status = 'active';
    }
  }
  if (kind === 'financePayments') {
    if (!stored.nextDueDate && stored.dueDay) {
      stored.nextDueDate = deriveNextDueDate(Number(stored.dueDay));
    }
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
  if ('companyId' in stored) {
    if (stored.companyId) {
      if (!mongoose.isValidObjectId(stored.companyId)) throw new HttpError(400, 'Invalid company id');
      stored.companyId = new mongoose.Types.ObjectId(String(stored.companyId));
    } else {
      stored.companyId = null;
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
      const targetMonth = String(stored.targetDate || stored.endDate || existingDoc?.targetDate || existingDoc?.endDate || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
      stored.monthlyTargetCents = dailyCents * getDaysInMonth(targetMonth);
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
          ? principalRepaidCents(method, existingDoc.repayments)
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
  if ('companyId' in stored) {
    if (stored.companyId) {
      if (!mongoose.isValidObjectId(stored.companyId)) throw new HttpError(400, 'Invalid company id');
      stored.companyId = new mongoose.Types.ObjectId(String(stored.companyId));
    } else {
      stored.companyId = null;
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
  if (input.companyId && (kind === 'businessBranches' || kind === 'ownerDraws' || kind === 'expenses' || kind === 'loans' || kind === 'pawnedItems' || kind === 'financePayments')) {
    if (!mongoose.isValidObjectId(input.companyId)) throw new HttpError(400, 'Invalid company id');
    if (!await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  }
  if (input.branchId && (kind === 'branchEntries' || kind === 'expenses')) {
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
    if (kind !== 'cards') {
      await assertAccountNotArchived(new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(String(input.bankAccountId)));
    }
  }
  if (input.cardId && (kind === 'expenses' || kind === 'transactions')) {
    if (!mongoose.isValidObjectId(input.cardId)) throw new HttpError(400, 'Invalid card id');
    if (!await CardModel.exists({ _id: input.cardId, userId })) throw new HttpError(404, 'Card not found');
  }
  const data = toStoredForCreate(kind, input);
  if (kind === 'transactions') {
    const record = await postTransaction({
      userId,
      type: (data.type as any) || 'expense',
      transferDirection: (data.transferDirection as any) || null,
      transferGroupId: null,
      amountCents: Number(data.amountCents || 0),
      date: String(data.date),
      category: String(data.category || 'General'),
      description: String(data.description || ''),
      paymentMethod: (data.paymentMethod as any) || 'cash',
      bankAccountId: data.bankAccountId ? new mongoose.Types.ObjectId(String(data.bankAccountId)) : null,
      cardId: data.cardId ? new mongoose.Types.ObjectId(String(data.cardId)) : null,
      referenceId: '',
    });
    await AuditLogModel.create({ userId, action: 'create', resourceType: kind, resourceId: record._id });
    return record.toObject();
  }
  const initialEntries = kind === 'businessBranches' && Array.isArray(data.entries)
    ? prepareBranchEntries(data.entries as Record<string, unknown>[])
    : [];
  if (kind === 'businessBranches') delete data.entries;
  if (kind === 'branchEntries') data.branchId = new mongoose.Types.ObjectId(String(input.branchId));
  if (kind === 'ownerDraws') data.companyId = new mongoose.Types.ObjectId(String(input.companyId));
  const record = await models[kind].create({ ...data, userId: new mongoose.Types.ObjectId(userId) });
  if (initialEntries.length) await syncBranchEntries(userId, record._id.toString(), initialEntries);

  try {
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
  } catch (error) {
    // Never leave an expense/income without its backing ledger row.
    await models[kind].deleteOne({ _id: record._id, userId });
    throw error;
  }

  if (kind === 'medicalExpenses') {
    // Every medical cost is also a real expense, so it shows in the financial ledger and balances.
    try {
      const expense: any = await createRecord('expenses', userId, {
        date: data.date,
        amount: Number(data.amountCents || 0) / 100,
        category: 'Medical',
        note: data.note ? `Medical: ${data.type} · ${data.note}` : `Medical: ${data.type}`,
        recurring: false,
        sourceType: 'medical',
      });
      record.set('expenseId', expense._id);
      await record.save();
    } catch (error) {
      await models[kind].deleteOne({ _id: record._id, userId });
      throw error;
    }
  }

  await AuditLogModel.create({ userId, action: 'create', resourceType: kind, resourceId: record._id });
  return record.toObject();
}

export async function updateRecord(kind: RecordKind, userId: string, id: string, input: Record<string, unknown>) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  if (input.companyId && (kind === 'businessBranches' || kind === 'ownerDraws' || kind === 'expenses' || kind === 'loans' || kind === 'pawnedItems' || kind === 'financePayments')) {
    if (!mongoose.isValidObjectId(input.companyId)) throw new HttpError(400, 'Invalid company id');
    if (!await CompanyModel.exists({ _id: input.companyId, userId })) throw new HttpError(404, 'Company not found');
  }
  if (input.branchId && (kind === 'branchEntries' || kind === 'expenses')) {
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
  if (kind === 'bankAccounts' && existingDoc.accountType === 'cash' && input.isArchived === true) {
    throw new HttpError(400, 'Cannot archive the built-in cash wallet account');
  }

  if (kind === 'transactions') {
    if (existingDoc.referenceId || existingDoc.transferGroupId) {
      throw new HttpError(403, 'System-generated transactions cannot be updated directly. Please modify the source record.');
    }
    const changes = toStoredForUpdate(kind, input, existingDoc);
    const updated = await updateTransactionById(userId, id, {
      userId,
      type: (changes.type as any) || existingDoc.type,
      transferDirection: (changes.transferDirection as any) || existingDoc.transferDirection,
      amountCents: Number(changes.amountCents !== undefined ? changes.amountCents : existingDoc.amountCents),
      date: String(changes.date || existingDoc.date),
      category: String(changes.category || existingDoc.category),
      description: String(changes.description !== undefined ? changes.description : existingDoc.description),
      paymentMethod: (changes.paymentMethod as any) || existingDoc.paymentMethod,
      bankAccountId: changes.bankAccountId !== undefined ? (changes.bankAccountId ? new mongoose.Types.ObjectId(String(changes.bankAccountId)) : null) : existingDoc.bankAccountId,
      cardId: changes.cardId !== undefined ? (changes.cardId ? new mongoose.Types.ObjectId(String(changes.cardId)) : null) : existingDoc.cardId,
      referenceId: '',
    });
    await AuditLogModel.create({ userId, action: 'update', resourceType: kind, resourceId: updated._id });
    return updated.toObject();
  }

  const changes = toStoredForUpdate(kind, input, existingDoc);
  // An `entries` array is the full desired set for the branch; omit it to leave entries untouched.
  const syncEntries = kind === 'businessBranches' && Array.isArray(changes.entries);
  const entries = syncEntries ? prepareBranchEntries(changes.entries as Record<string, unknown>[]) : [];
  delete changes.entries;
  const updated = await models[kind].findOneAndUpdate(
    { _id: id, userId },
    { $set: changes },
    { new: true, runValidators: true },
  ).exec();
  if (!updated) throw new HttpError(404, 'Record not found');
  if (syncEntries) await syncBranchEntries(userId, id, entries);
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

type PreparedBranchEntry = { id: string | null; data: Record<string, unknown> };

function prepareBranchEntries(entries: Record<string, unknown>[]): PreparedBranchEntry[] {
  return entries.map((entry) => {
    const date = String(entry.date ?? '');
    if (!isValidIsoDate(date)) throw new HttpError(400, 'Branch entry date must be a valid YYYY-MM-DD date');
    const amountCents = Math.round(Number(entry.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Branch entry amount must be greater than zero');
    // Client-side temporary ids (and 12-char strings mongoose would accept) are treated as new entries.
    const id = typeof entry.id === 'string' && /^[a-f0-9]{24}$/i.test(entry.id) ? entry.id : null;
    return { id, data: { date, type: entry.type, category: entry.category, amountCents, note: entry.note || '' } };
  });
}

/**
 * Makes the branch's stored entries match `entries` exactly: updates known ids, creates new ones,
 * and deletes any existing entry the payload no longer contains.
 */
async function syncBranchEntries(userId: string, branchId: string, entries: PreparedBranchEntry[]) {
  await withLedgerSession(async (session) => {
    const opts = session ? { session } : {};
    const keptIds: mongoose.Types.ObjectId[] = [];
    for (const { id, data } of entries) {
      if (id) {
        const result = await BranchEntryModel.updateOne({ _id: id, branchId, userId }, { $set: data }, { runValidators: true, ...opts });
        if (result.matchedCount > 0) {
          keptIds.push(new mongoose.Types.ObjectId(id));
          continue;
        }
      }
      const [created] = await BranchEntryModel.create([{ ...data, branchId, userId }], opts);
      keptIds.push(created._id);
    }
    await BranchEntryModel.deleteMany({ branchId, userId, _id: { $nin: keptIds } }, opts);
  });
}

const ACCOUNT_HAS_ACTIVITY_MESSAGE = 'Cannot delete account with a non-zero balance or active transactions. Please transfer remaining funds or archive the account.';

/**
 * Deletes a bank account only when doing so cannot break the ledger: zero balance, no ledger rows
 * on it or on its linked cards. Remaining soft references are nulled so nothing dangles.
 */
async function deleteBankAccount(userId: string, id: string) {
  const account = await BankAccountModel.findOne({ _id: id, userId });
  if (!account) throw new HttpError(404, 'Record not found');
  if (account.accountType === 'cash') {
    throw new HttpError(400, 'Cannot delete the built-in cash wallet account');
  }

  const accountId = account._id as mongoose.Types.ObjectId;
  const linkedCards = await CardModel.find({ bankAccountId: accountId, userId }).select('_id balanceCents').lean();
  const cardIds = linkedCards.map((card: any) => card._id);
  const hasActivity = (Number(account.balanceCents) || 0) !== 0
    || linkedCards.some((card: any) => (Number(card.balanceCents) || 0) !== 0)
    || Boolean(await TransactionModel.exists({
      userId,
      $or: [{ bankAccountId: accountId }, ...(cardIds.length ? [{ cardId: { $in: cardIds } }] : [])],
    }));
  if (hasActivity) throw new HttpError(400, ACCOUNT_HAS_ACTIVITY_MESSAGE);

  await withLedgerSession(async (session) => {
    const opts = session ? { session } : {};
    const nullSubdocRef = (path: string) => ({
      update: { $set: { [`${path}.$[ref].bankAccountId`]: null } },
      options: { arrayFilters: [{ 'ref.bankAccountId': accountId }], ...opts },
    });
    await BankAccountModel.deleteOne({ _id: accountId, userId }, opts);
    if (cardIds.length) await CardModel.deleteMany({ _id: { $in: cardIds }, userId }, opts);
    for (const model of [ExpenseModel, IncomeModel, FinancePaymentModel]) {
      await model.updateMany({ userId, bankAccountId: accountId }, { $set: { bankAccountId: null } }, opts);
    }
    for (const [model, path] of [[LoanModel, 'repayments'], [SavingsGoalModel, 'contributions'], [PawnedItemModel, 'payments'], [FinancePaymentModel, 'payments']] as const) {
      const { update, options } = nullSubdocRef(path);
      await (model as Model<any>).updateMany({ userId, [`${path}.bankAccountId`]: accountId }, update, options);
    }
  });
  await AuditLogModel.create({ userId, action: 'delete', resourceType: 'bankAccounts', resourceId: accountId });
}

export async function deleteRecord(kind: RecordKind, userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record id');
  if (kind === 'bankAccounts') return deleteBankAccount(userId, id);
  if (kind === 'transactions') {
    const existingTx = await TransactionModel.findOne({ _id: id, userId });
    if (!existingTx) throw new HttpError(404, 'Record not found');
    if (existingTx.referenceId || existingTx.transferGroupId) {
      throw new HttpError(403, 'System-generated transactions cannot be deleted directly. Please delete or undo the source record.');
    }
    await reverseTransactionById(userId, id);
    await AuditLogModel.create({ userId, action: 'delete', resourceType: kind, resourceId: existingTx._id });
    return;
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
  // Medical record <-> ledger expense: deleting either side removes the other.
  if (kind === 'expenses') await MedicalExpenseModel.deleteMany({ expenseId: deleted._id, userId });
  if (kind === 'medicalExpenses' && deleted.expenseId && await ExpenseModel.exists({ _id: deleted.expenseId, userId })) {
    await deleteRecord('expenses', userId, deleted.expenseId.toString());
  }
  await AuditLogModel.create({ userId, action: 'delete', resourceType: kind, resourceId: deleted._id });
}

export interface AddGoalContributionParams {
  amount: number;
  date?: string;
  note?: string;
  debitAccount?: boolean;
  paymentMethod?: string;
  bankAccountId?: string | null;
}

export async function addGoalContribution(
  userId: string,
  goalId: string,
  amountOrParams: number | AddGoalContributionParams,
  legacyDate?: string,
  legacyNote: string = '',
) {
  if (!mongoose.isValidObjectId(goalId)) throw new HttpError(400, 'Invalid goal id');
  const params: AddGoalContributionParams = typeof amountOrParams === 'number'
    ? { amount: amountOrParams, date: legacyDate, note: legacyNote }
    : amountOrParams;

  const amountCents = Math.round(params.amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1) throw new HttpError(400, 'Contribution must be greater than zero');
  const goal = await SavingsGoalModel.findOne({ _id: goalId, userId });
  if (!goal) throw new HttpError(404, 'Goal not found');

  const paymentDate = params.date && isValidIsoDate(params.date) ? params.date : new Date().toISOString().slice(0, 10);
  const subdocId = new mongoose.Types.ObjectId();
  let transactionId: mongoose.Types.ObjectId | null = null;
  let targetBankAccountId: mongoose.Types.ObjectId | null = null;

  if (params.debitAccount) {
    const method = params.paymentMethod || 'cash';
    if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
      if (!params.bankAccountId || !params.bankAccountId.trim()) {
        throw new HttpError(400, `Bank account is required for ${method.replace('_', ' ')} contributions`);
      }
    }
    if (params.bankAccountId && params.bankAccountId.trim() !== '') {
      if (!mongoose.isValidObjectId(params.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
      const bankAccount = await BankAccountModel.findOne({ _id: params.bankAccountId, userId });
      if (!bankAccount) throw new HttpError(404, 'Bank account not found');
      targetBankAccountId = bankAccount._id as mongoose.Types.ObjectId;
    }

    const tx = await postTransaction({
      userId,
      type: 'expense',
      amountCents,
      date: paymentDate,
      category: 'Savings Contribution',
      description: params.note || `Contribution to ${goal.name}`,
      paymentMethod: method as any,
      bankAccountId: targetBankAccountId,
      referenceId: `goal_contribution_${goal._id}_${subdocId}`,
    });
    transactionId = tx._id;
  }

  goal.savedAmountCents = (goal.savedAmountCents || 0) + amountCents;
  goal.contributions = goal.contributions || [];
  goal.contributions.push({
    _id: subdocId,
    date: paymentDate,
    amountCents,
    paymentMethod: params.debitAccount ? (params.paymentMethod || 'cash') : '',
    bankAccountId: targetBankAccountId,
    transactionId,
    note: params.note || '',
  });

  await goal.save();
  await AuditLogModel.create({ userId, action: 'contribute', resourceType: 'goals', resourceId: goal._id });
  return goal;
}

export async function deleteGoalContribution(userId: string, goalId: string, contributionId: string) {
  if (!mongoose.isValidObjectId(goalId)) throw new HttpError(400, 'Invalid goal id');
  if (!mongoose.isValidObjectId(contributionId)) throw new HttpError(400, 'Invalid contribution id');

  const goal = await SavingsGoalModel.findOne({ _id: goalId, userId });
  if (!goal) throw new HttpError(404, 'Goal not found');

  const idx = (goal.contributions || []).findIndex((c: any) => String(c._id) === String(contributionId));
  if (idx === -1) throw new HttpError(404, 'Contribution not found');

  const contrib = goal.contributions[idx];
  if (contrib.transactionId) {
    const refId = `goal_contribution_${goal._id}_${contrib._id}`;
    await reverseTransaction(userId, refId);
  }

  goal.savedAmountCents = Math.max(0, (goal.savedAmountCents || 0) - contrib.amountCents);
  goal.contributions.splice(idx, 1);
  await goal.save();

  await AuditLogModel.create({ userId, action: 'undo-contribution', resourceType: 'goals', resourceId: goal._id });
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

  // Accrued interest is paid first; the remainder reduces principal.
  const interestDueCents = loanInterestDueCents(loan, paymentDate);
  const interestCents = Math.min(amountCents, interestDueCents);
  const principalCents = amountCents - interestCents;

  let newBalanceCents: number;
  if (isAmortizingLoan(loan.method)) {
    const outstandingCents = Math.max(0, loan.principalCents - principalRepaidCents(loan.method, loan.repayments));
    if (principalCents > outstandingCents) {
      throw new HttpError(400, `Repayment exceeds the payoff amount of ${((outstandingCents + interestDueCents) / 100).toFixed(2)}`);
    }
    newBalanceCents = outstandingCents - principalCents;
  } else {
    newBalanceCents = Math.max(0, loan.balanceCents - amountCents);
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

  loan.balanceCents = newBalanceCents;
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
  loan.balanceCents = Math.max(0, loan.principalCents - principalRepaidCents(loan.method, loan.repayments));
  await loan.save();

  await AuditLogModel.create({ userId, action: 'undo-repay', resourceType: 'loans', resourceId: loan._id });
  return loan;
}

export async function calculateLoanPayoff(userId: string, loanId: string, asOfDate?: string) {
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

  const asOf = asOfDate && isValidIsoDate(asOfDate) ? asOfDate : new Date().toISOString().slice(0, 10);
  const amortizing = isAmortizingLoan(loan.method);
  const totalContractCents = loan.principalCents + loan.totalInterestCents;
  const remainingTotalContractCents = Math.max(0, totalContractCents - totalRepaidCents);
  const remainingPrincipalCents = Math.max(0, loan.principalCents - principalRepaidCents(loan.method, loan.repayments));
  // Settlement = outstanding principal + interest accrued (pro-rated by day) since the last paid period.
  const accruedInterestCents = amortizing && remainingPrincipalCents > 0 ? loanInterestDueCents(loan, asOf) : 0;
  const payoffAmountCents = remainingPrincipalCents + accruedInterestCents;
  const interestSavingsCents = Math.max(0, remainingTotalContractCents - payoffAmountCents);

  return {
    loanId: loan._id,
    lender: loan.lender,
    principalCents: loan.principalCents,
    totalInterestCents: loan.totalInterestCents,
    totalRepaidCents,
    totalPrincipalRepaidCents,
    totalInterestRepaidCents,
    remainingBalanceCents: amortizing ? remainingPrincipalCents : loan.balanceCents,
    remainingTotalContractCents,
    accruedInterestCents,
    asOfDate: asOf,
    payoffAmountCents,
    interestSavingsCents,
  };
}

export interface RecordPawnPaymentParams {
  amount?: number;
  paymentType?: 'interest' | 'part_principal' | 'redemption';
  paymentMethod?: string;
  bankAccountId?: string | null;
  date?: string;
  note?: string;
}

export async function recordPawnPayment(
  userId: string,
  pawnId: string,
  params: RecordPawnPaymentParams = {},
) {
  if (!mongoose.isValidObjectId(pawnId)) throw new HttpError(400, 'Invalid pawned item id');
  const item = await PawnedItemModel.findOne({ _id: pawnId, userId });
  if (!item) throw new HttpError(404, 'Pawned item not found');
  if (item.status !== 'active') throw new HttpError(400, `Cannot make payment on a pawned item that is ${item.status}`);

  const paymentType = params.paymentType || 'interest';
  const paymentMethod = params.paymentMethod || 'cash';
  const paymentDate = params.date && isValidIsoDate(params.date) ? params.date : new Date().toISOString().slice(0, 10);

  let targetBankAccountId: mongoose.Types.ObjectId | null = null;
  if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(paymentMethod)) {
    if (!params.bankAccountId || !params.bankAccountId.trim()) {
      throw new HttpError(400, `Bank account is required for ${paymentMethod.replace('_', ' ')} payments`);
    }
  }
  if (params.bankAccountId && params.bankAccountId.trim() !== '') {
    if (!mongoose.isValidObjectId(params.bankAccountId)) throw new HttpError(400, 'Invalid bank account id');
    const bankAccount = await BankAccountModel.findOne({ _id: params.bankAccountId, userId });
    if (!bankAccount) throw new HttpError(404, 'Bank account not found');
    targetBankAccountId = bankAccount._id as mongoose.Types.ObjectId;
  }

  const currentPrincipal = item.principalOutstandingCents ?? item.amountReceivedCents;

  let amountCents = 0;
  if (params.amount !== undefined && params.amount !== null && params.amount > 0) {
    amountCents = Math.round(params.amount * 100);
  } else if (paymentType === 'interest') {
    // Pawn rates are quoted per month, so one interest payment is principal × monthly rate.
    const rate = item.interestRatePercent || 0;
    amountCents = Math.max(1, Math.round(currentPrincipal * (rate / 100)));
  } else if (paymentType === 'redemption') {
    amountCents = currentPrincipal;
  } else {
    throw new HttpError(400, 'Amount must be specified for part-principal payment');
  }

  // Track exactly how much of this payment reduced principal vs. paid interest so undo restores both with no drift.
  let principalPortionCents = 0;
  let interestPortionCents = 0;
  if (paymentType === 'interest') {
    interestPortionCents = amountCents;
  } else if (paymentType === 'part_principal') {
    if (amountCents > currentPrincipal) {
      throw new HttpError(400, `Part-principal payment exceeds the outstanding principal of ${(currentPrincipal / 100).toFixed(2)}`);
    }
    principalPortionCents = amountCents;
  } else {
    if (amountCents < currentPrincipal) {
      throw new HttpError(400, `Redemption amount must cover the outstanding principal of ${(currentPrincipal / 100).toFixed(2)}`);
    }
    principalPortionCents = currentPrincipal;
    interestPortionCents = amountCents - currentPrincipal;
  }

  const subdocId = new mongoose.Types.ObjectId();

  const tx = await postTransaction({
    userId,
    type: 'expense',
    amountCents,
    date: paymentDate,
    category: 'Pawn Payment',
    description: params.note || `Pawn payment (${paymentType}) for ${item.description}`,
    paymentMethod: paymentMethod as any,
    bankAccountId: targetBankAccountId,
    referenceId: `pawn_payment_${item._id}_${subdocId}`,
  });

  if (paymentType === 'interest') {
    item.interestPaidCents = (item.interestPaidCents || 0) + amountCents;
    const dueDate = new Date(`${item.nextDue}T00:00:00.000Z`);
    dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
    item.nextDue = dueDate.toISOString().slice(0, 10);
  } else if (paymentType === 'part_principal') {
    item.principalOutstandingCents = currentPrincipal - principalPortionCents;
    if (item.principalOutstandingCents === 0) {
      item.status = 'redeemed';
      item.redemptionDate = paymentDate;
    }
  } else if (paymentType === 'redemption') {
    item.principalOutstandingCents = 0;
    item.interestPaidCents = (item.interestPaidCents || 0) + interestPortionCents;
    item.status = 'redeemed';
    item.redemptionDate = paymentDate;
  }

  item.payments = item.payments || [];
  item.payments.push({
    _id: subdocId,
    date: paymentDate,
    amountCents,
    principalCents: principalPortionCents,
    interestCents: interestPortionCents,
    paymentType,
    paymentMethod,
    bankAccountId: targetBankAccountId,
    transactionId: tx._id,
    note: params.note || '',
  });

  await item.save();
  await AuditLogModel.create({
    userId,
    action: paymentType === 'interest' ? 'interest-paid' : paymentType === 'redemption' ? 'redeemed' : 'part-principal-paid',
    resourceType: 'pawnedItems',
    resourceId: item._id,
  });

  return item;
}

export async function deletePawnPayment(userId: string, pawnId: string, paymentId: string) {
  if (!mongoose.isValidObjectId(pawnId)) throw new HttpError(400, 'Invalid pawned item id');
  if (!mongoose.isValidObjectId(paymentId)) throw new HttpError(400, 'Invalid payment id');

  const item = await PawnedItemModel.findOne({ _id: pawnId, userId });
  if (!item) throw new HttpError(404, 'Pawned item not found');

  const idx = (item.payments || []).findIndex((p: any) => String(p._id) === String(paymentId));
  if (idx === -1) throw new HttpError(404, 'Payment not found');

  const payment = item.payments[idx];
  const refId = `pawn_payment_${item._id}_${payment._id}`;

  await reverseTransaction(userId, refId);

  if (payment.paymentType === 'interest') {
    item.interestPaidCents = Math.max(0, (item.interestPaidCents || 0) - payment.amountCents);
    const dueDate = new Date(`${item.nextDue}T00:00:00.000Z`);
    dueDate.setUTCMonth(dueDate.getUTCMonth() - 1);
    item.nextDue = dueDate.toISOString().slice(0, 10);
  } else if (payment.paymentType === 'part_principal' || payment.paymentType === 'redemption') {
    // Legacy payments predate the principal/interest split and were applied wholly to principal.
    const principalPortion = payment.principalCents || payment.interestCents ? Number(payment.principalCents) || 0 : payment.amountCents;
    const interestPortion = payment.principalCents || payment.interestCents ? Number(payment.interestCents) || 0 : 0;
    item.principalOutstandingCents = (item.principalOutstandingCents || 0) + principalPortion;
    item.interestPaidCents = Math.max(0, (item.interestPaidCents || 0) - interestPortion);
    if (item.status === 'redeemed' && item.principalOutstandingCents > 0) {
      item.status = 'active';
      item.redemptionDate = '';
    }
  }

  item.payments.splice(idx, 1);
  await item.save();

  await AuditLogModel.create({ userId, action: 'undo-pawn-payment', resourceType: 'pawnedItems', resourceId: item._id });
  return item;
}

export interface RecordFinancePaymentParams {
  amount?: number;
  paymentMethod?: string;
  bankAccountId?: string | null;
  date?: string;
  note?: string;
}

export async function recordFinancePayment(
  userId: string,
  paymentId: string,
  params: RecordFinancePaymentParams = {},
) {
  if (!mongoose.isValidObjectId(paymentId)) throw new HttpError(400, 'Invalid finance payment id');
  const item = await FinancePaymentModel.findOne({ _id: paymentId, userId });
  if (!item) throw new HttpError(404, 'Finance payment not found');
  if (item.status === 'completed' || item.status === 'cancelled') {
    throw new HttpError(400, `Cannot make payment on a finance payment that is ${item.status}`);
  }

  const paymentDate = params.date && isValidIsoDate(params.date) ? params.date : new Date().toISOString().slice(0, 10);
  const paymentMethod = params.paymentMethod || (item.paymentKind === 'standing_order' ? 'standing_order' : item.paymentKind === 'cheque' ? 'cheque' : 'bank_transfer');

  let targetBankAccountId: mongoose.Types.ObjectId | null = null;
  const inputBankId = params.bankAccountId !== undefined ? params.bankAccountId : (item.bankAccountId ? String(item.bankAccountId) : null);

  if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(paymentMethod)) {
    if (!inputBankId || !inputBankId.trim()) {
      throw new HttpError(400, `Bank account is required for ${paymentMethod.replace('_', ' ')} payments`);
    }
  }

  if (inputBankId && inputBankId.trim() !== '') {
    if (!mongoose.isValidObjectId(inputBankId)) throw new HttpError(400, 'Invalid bank account id');
    const bankAccount = await BankAccountModel.findOne({ _id: inputBankId, userId });
    if (!bankAccount) throw new HttpError(404, 'Bank account not found');
    targetBankAccountId = bankAccount._id as mongoose.Types.ObjectId;
  }

  const amountCents = params.amount !== undefined && params.amount !== null && params.amount > 0
    ? Math.round(params.amount * 100)
    : item.amountCents;

  const subdocId = new mongoose.Types.ObjectId();

  const label = item.lender || item.payee || 'Finance Payment';
  const tx = await postTransaction({
    userId,
    type: 'expense',
    amountCents,
    date: paymentDate,
    category: 'Finance Payment',
    description: params.note || `${item.paymentKind || 'Instalment'} payment for ${label}`,
    paymentMethod: paymentMethod as any,
    bankAccountId: targetBankAccountId,
    referenceId: `finance_payment_${item._id}_${subdocId}`,
  });

  // Advance nextDueDate
  const currentDueDateStr = item.nextDueDate || deriveNextDueDate(item.dueDay);
  const currentDueDate = new Date(`${currentDueDateStr}T00:00:00.000Z`);
  currentDueDate.setUTCMonth(currentDueDate.getUTCMonth() + 1);
  item.nextDueDate = currentDueDate.toISOString().slice(0, 10);

  // Decrement monthsRemaining
  const newMonths = Math.max(0, (item.monthsRemaining || 1) - 1);
  item.monthsRemaining = newMonths;
  if (newMonths === 0) {
    item.status = 'completed';
  }

  item.payments = item.payments || [];
  item.payments.push({
    _id: subdocId,
    date: paymentDate,
    amountCents,
    paymentMethod,
    bankAccountId: targetBankAccountId,
    transactionId: tx._id,
    note: params.note || '',
  });

  await item.save();
  await AuditLogModel.create({
    userId,
    action: 'mark-as-paid',
    resourceType: 'financePayments',
    resourceId: item._id,
  });

  return item;
}

export async function deleteFinancePaymentPayment(userId: string, financePaymentId: string, paymentHistoryId: string) {
  if (!mongoose.isValidObjectId(financePaymentId)) throw new HttpError(400, 'Invalid finance payment id');
  if (!mongoose.isValidObjectId(paymentHistoryId)) throw new HttpError(400, 'Invalid payment id');

  const item = await FinancePaymentModel.findOne({ _id: financePaymentId, userId });
  if (!item) throw new HttpError(404, 'Finance payment not found');

  const idx = (item.payments || []).findIndex((p: any) => String(p._id) === String(paymentHistoryId));
  if (idx === -1) throw new HttpError(404, 'Payment not found');

  const payment = item.payments[idx];
  const refId = `finance_payment_${item._id}_${payment._id}`;

  await reverseTransaction(userId, refId);

  // Restore monthsRemaining and nextDueDate
  item.monthsRemaining = (item.monthsRemaining || 0) + 1;
  if (item.status === 'completed' && item.monthsRemaining > 0) {
    item.status = 'active';
  }

  if (item.nextDueDate) {
    const currentDueDate = new Date(`${item.nextDueDate}T00:00:00.000Z`);
    currentDueDate.setUTCMonth(currentDueDate.getUTCMonth() - 1);
    item.nextDueDate = currentDueDate.toISOString().slice(0, 10);
  }

  item.payments.splice(idx, 1);
  await item.save();

  await AuditLogModel.create({
    userId,
    action: 'undo-payment',
    resourceType: 'financePayments',
    resourceId: item._id,
  });

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
  search?: string;
  limit?: number;
  skip?: number;
}

export async function getTransactionHistory(userId: string, filters: TransactionHistoryFilters = {}) {
  const uId = new mongoose.Types.ObjectId(userId);
  const baseMatch: Record<string, any> = { userId: uId };

  let targetAccount: any = null;
  if (filters.bankAccountId) {
    if (filters.bankAccountId === 'cash') {
      targetAccount = await ensureCashWallet(uId);
      baseMatch.bankAccountId = targetAccount._id;
    } else {
      if (!mongoose.isValidObjectId(filters.bankAccountId)) {
        throw new HttpError(400, 'Invalid bank account id');
      }
      targetAccount = await BankAccountModel.findOne({ _id: filters.bankAccountId, userId: uId });
      if (!targetAccount) {
        throw new HttpError(404, 'Bank account not found');
      }
      baseMatch.bankAccountId = targetAccount._id;
    }
  }

  if (filters.cardId) {
    if (!mongoose.isValidObjectId(filters.cardId)) {
      throw new HttpError(400, 'Invalid card id');
    }
    const targetCard = await CardModel.findOne({ _id: filters.cardId, userId: uId });
    if (!targetCard) {
      throw new HttpError(404, 'Card not found');
    }
    baseMatch.cardId = targetCard._id;
  }

  const pipeline: any[] = [
    { $match: baseMatch },
    {
      $addFields: {
        signedDeltaCents: {
          $cond: [
            {
              $or: [
                { $eq: ['$type', 'income'] },
                { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'incoming'] }] },
              ],
            },
            '$amountCents',
            {
              $cond: [
                {
                  $or: [
                    { $eq: ['$type', 'expense'] },
                    { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'outgoing'] }] },
                  ],
                },
                { $multiply: ['$amountCents', -1] },
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $setWindowFields: {
        partitionBy: '$bankAccountId',
        sortBy: { date: 1, createdAt: 1, _id: 1 },
        output: {
          cumulativeDeltaCents: {
            $sum: '$signedDeltaCents',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
    {
      $lookup: {
        from: BankAccountModel.collection.name,
        localField: 'bankAccountId',
        foreignField: '_id',
        as: 'accountDoc',
      },
    },
    {
      $addFields: {
        runningBalanceCents: {
          $add: [
            { $ifNull: [{ $arrayElemAt: ['$accountDoc.openingBalanceCents', 0] }, 0] },
            '$cumulativeDeltaCents',
          ],
        },
        balanceAfterCents: {
          $add: [
            { $ifNull: [{ $arrayElemAt: ['$accountDoc.openingBalanceCents', 0] }, 0] },
            '$cumulativeDeltaCents',
          ],
        },
      },
    },
    {
      $project: {
        accountDoc: 0,
        signedDeltaCents: 0,
        cumulativeDeltaCents: 0,
      },
    },
  ];

  // Secondary filters (applied after computing the running balance)
  const filterMatch: Record<string, any> = {};
  if (filters.type) {
    filterMatch.type = filters.type;
  }
  if (filters.category) {
    filterMatch.category = filters.category;
  }
  if (filters.paymentMethod) {
    filterMatch.paymentMethod = filters.paymentMethod;
  }
  if (filters.startDate || filters.endDate) {
    filterMatch.date = {};
    if (filters.startDate) filterMatch.date.$gte = filters.startDate;
    if (filters.endDate) filterMatch.date.$lte = filters.endDate;
  }
  if (filters.search && filters.search.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    filterMatch.$or = [
      { description: searchRegex },
      { category: searchRegex },
      { referenceId: searchRegex },
    ];
  }

  if (Object.keys(filterMatch).length > 0) {
    pipeline.push({ $match: filterMatch });
  }

  // Stable sort descending
  pipeline.push({ $sort: { date: -1, createdAt: -1, _id: -1 } });

  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 1000);
  const skip = Math.max(Number(filters.skip) || 0, 0);

  pipeline.push({
    $facet: {
      paginatedResults: [
        { $skip: skip },
        { $limit: limit },
      ],
      totalCount: [
        { $count: 'count' },
      ],
      summary: [
        {
          $group: {
            _id: null,
            totalIncomeCents: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$type', 'income'] },
                      { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'incoming'] }] },
                    ],
                  },
                  '$amountCents',
                  0,
                ],
              },
            },
            totalExpenseCents: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$type', 'expense'] },
                      { $and: [{ $eq: ['$type', 'transfer'] }, { $eq: ['$transferDirection', 'outgoing'] }] },
                    ],
                  },
                  '$amountCents',
                  0,
                ],
              },
            },
            firstRunningBalanceCents: { $first: '$runningBalanceCents' },
          },
        },
      ],
    },
  });

  const aggResult = await TransactionModel.aggregate(pipeline);
  const facetResult = aggResult[0] || {
    paginatedResults: [],
    totalCount: [],
    summary: [],
  };

  const paginatedTransactions = facetResult.paginatedResults || [];
  const totalCount = facetResult.totalCount[0]?.count || 0;
  const summaryDoc = facetResult.summary[0];

  const totalIncomeCents = summaryDoc?.totalIncomeCents || 0;
  const totalExpenseCents = summaryDoc?.totalExpenseCents || 0;
  const netCents = totalIncomeCents - totalExpenseCents;
  const closingBalanceCents = summaryDoc?.firstRunningBalanceCents !== undefined
    ? summaryDoc.firstRunningBalanceCents
    : (targetAccount ? targetAccount.openingBalanceCents : 0);

  return {
    transactions: paginatedTransactions,
    data: paginatedTransactions,
    totalCount,
    summary: {
      totalIncomeCents,
      totalExpenseCents,
      netCents,
      netFlowCents: netCents,
      closingBalanceCents,
      count: totalCount,
    },
  };
}

export async function createTransferRecord(userId: string, data: unknown) {
  const parsed = transferSchema.parse(data);
  const amountCents = Math.round(parsed.amount * 100);
  return transferFunds(userId, {
    fromAccountId: parsed.fromAccountId,
    fromCardId: parsed.fromCardId,
    toAccountId: parsed.toAccountId,
    toCardId: parsed.toCardId,
    amountCents,
    date: parsed.date,
    description: parsed.description,
    category: parsed.category,
  });
}

export async function deleteTransferRecord(userId: string, transferGroupId: string) {
  return deleteTransfer(userId, transferGroupId);
}