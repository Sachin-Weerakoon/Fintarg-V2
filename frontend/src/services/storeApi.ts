import { apiClient, ApiError } from './apiClient';
import type { AppState, Transaction, UserPlan } from '@/types';

type RawRecord = Record<string, any> & { _id: string };
type ListResult = { data: RawRecord[] };

export const pendingCreations = new Map<string, Promise<string>>();
export const resolvedServerIds = new Map<string, string>();

export async function resolveRecordId(rawId: string | undefined): Promise<string> {
  if (!rawId) return '';
  if (resolvedServerIds.has(rawId)) {
    return resolvedServerIds.get(rawId)!;
  }
  if (pendingCreations.has(rawId)) {
    try {
      const serverId = await pendingCreations.get(rawId);
      if (serverId) {
        resolvedServerIds.set(rawId, serverId);
        return serverId;
      }
    } catch {
      // If create failed, return rawId so subsequent call fails cleanly
    }
  }
  return rawId;
}

export async function list(kind: string): Promise<RawRecord[]> {
  try {
    const result = await apiClient<ListResult>(`/api/backend/records/${kind}`);
    return result?.data || [];
  } catch (err: unknown) {
    if (
      err instanceof ApiError &&
      (err.status === 403 || err.code === 'PLAN_REQUIRED' || err.message.toLowerCase().includes('business edition'))
    ) {
      console.warn(`[storeApi] Skipping record kind "${kind}": requires Business edition (${err.message}).`);
      return [];
    }
    if (err && typeof err === 'object') {
      (err as { collection?: string }).collection = kind;
    }
    throw err;
  }
}

function mapAgreements(agreements: RawRecord[] = []) {
  return agreements.map(row => ({
    id: row._id,
    title: row.title,
    otherParty: row.otherParty,
    startDate: row.startDate,
    endDate: row.endDate,
    value: (row.valueCents || 0) / 100,
    summary: row.summary,
    status: row.status,
    fileName: row.fileName,
  }));
}

function mapCompanies(companies: RawRecord[] = []) {
  return companies.map(row => ({
    id: row._id,
    name: row.name,
    address: row.address,
    contact: row.contact,
    logo: row.logo,
    businessType: row.businessType,
    openingDate: row.openingDate,
    brNumber: row.brNumber,
    tinNumber: row.tinNumber,
    entityType: row.entityType,
    sector: row.sector,
    email: row.email,
    monthlyRevenueTarget: row.monthlyRevenueTargetCents ? row.monthlyRevenueTargetCents / 100 : (row.monthlyRevenueTarget || undefined),
    annualRevenueTarget: row.annualRevenueTargetCents ? row.annualRevenueTargetCents / 100 : (row.annualRevenueTarget || undefined),
  }));
}

function mapBusinessBranches(businessBranches: RawRecord[] = []) {
  return businessBranches.map(row => ({
    id: row._id,
    companyId: row.companyId,
    name: row.name,
    location: row.location,
    branchType: row.branchType,
    openingDate: row.openingDate,
    logo: row.logo,
    monthlyTarget: (row.monthlyTargetCents || 0) / 100,
    annualTarget: (row.annualTargetCents || 0) / 100,
    entries: (row.entries || []).map((entry: RawRecord) => ({
      id: entry._id,
      date: entry.date,
      type: entry.type,
      category: entry.category,
      amount: (entry.amountCents || 0) / 100,
      note: entry.note,
    })),
  }));
}

function mapOwnerDraws(ownerDraws: RawRecord[] = []) {
  return ownerDraws.map(row => ({
    id: row._id,
    companyId: row.companyId,
    amount: (row.amountCents || 0) / 100,
    date: row.date,
  }));
}

export async function loadBusinessData(): Promise<Pick<AppState, 'agreements' | 'companies' | 'businessBranches' | 'ownerDraws'>> {
  const [agreements, companies, businessBranches, ownerDraws] = await Promise.all([
    list('agreements'),
    list('companies'),
    list('businessBranches'),
    list('ownerDraws'),
  ]);
  return {
    agreements: mapAgreements(agreements),
    companies: mapCompanies(companies),
    businessBranches: mapBusinessBranches(businessBranches),
    ownerDraws: mapOwnerDraws(ownerDraws),
  };
}

export async function loadPersistedData(plan: UserPlan = 'basic'): Promise<Partial<AppState>> {
  const isBusiness = plan === 'business';
  const emptyRecords = Promise.resolve([] as RawRecord[]);

  const [
    income,
    expenses,
    financePayments,
    loans,
    bankAccounts,
    cards,
    transactions,
    pawnedItems,
    savingsGoals,
    letters,
    agreements,
    companies,
    businessBranches,
    employmentProfiles,
    ownerDraws,
    medicalExpenses,
    documents,
    reminders,
    budgetData,
  ] = await Promise.all([
    list('incomes'),
    list('expenses'),
    list('financePayments'),
    list('loans'),
    list('bankAccounts'),
    list('cards'),
    list('transactions'),
    list('pawnedItems'),
    list('goals'),
    list('letters'),
    isBusiness ? list('agreements') : emptyRecords,
    isBusiness ? list('companies') : emptyRecords,
    isBusiness ? list('businessBranches') : emptyRecords,
    list('employmentProfiles'),
    isBusiness ? list('ownerDraws') : emptyRecords,
    list('medicalExpenses'),
    list('documents'),
    list('reminders'),
    apiClient<{ budget: number }>('/api/backend/profile/personal-budget').catch(() => ({ budget: 0 })),
  ]);

  return {
    income: income.map(row => ({
      id: row._id,
      source: row.source,
      type: row.type,
      amount: (row.amountCents || 0) / 100,
      frequency: row.frequency,
      date: row.date,
      paymentMethod: row.paymentMethod,
      bankAccountId: row.bankAccountId,
    })),
    expenses: expenses.map(row => ({
      id: row._id,
      date: row.date,
      amount: (row.amountCents || 0) / 100,
      category: row.category,
      note: row.note,
      recurring: row.recurring,
      paymentMethod: row.paymentMethod,
      bankAccountId: row.bankAccountId,
      cardId: row.cardId,
      sourceType: row.sourceType,
      companyId: row.companyId ? String(row.companyId) : undefined,
      branchId: row.branchId ? String(row.branchId) : undefined,
    })),
    financePayments: financePayments.map(row => ({
      id: row._id,
      lender: row.lender,
      amount: (row.amountCents || 0) / 100,
      dueDay: row.dueDay,
      nextDueDate: row.nextDueDate || '',
      monthsRemaining: row.monthsRemaining,
      paymentKind: row.paymentKind,
      chequeNumber: row.chequeNumber,
      bankAccountId: row.bankAccountId ? String(row.bankAccountId) : undefined,
      payee: row.payee,
      frequency: row.frequency,
      status: row.status,
      payments: (row.payments || []).map((p: RawRecord) => ({
        id: p._id,
        _id: p._id,
        date: p.date,
        amount: (p.amountCents || 0) / 100,
        paymentMethod: p.paymentMethod || 'bank_transfer',
        bankAccountId: p.bankAccountId ? String(p.bankAccountId) : null,
        transactionId: p.transactionId ? String(p.transactionId) : null,
        note: p.note,
      })),
    })),
    loans: loans.map(row => ({
      id: row._id,
      lender: row.lender,
      principal: (row.principalCents || 0) / 100,
      rate: row.ratePercent,
      method: row.method || 'simple',
      startDate: row.startDate,
      dueDate: row.dueDate,
      balance: (row.balanceCents || 0) / 100,
      interestBasis: row.interestBasis,
      tenureMonths: row.tenureMonths,
      monthlyPayment: row.monthlyPaymentCents ? row.monthlyPaymentCents / 100 : undefined,
      totalInterest: row.totalInterestCents ? row.totalInterestCents / 100 : undefined,
      repayments: (row.repayments || []).map((r: RawRecord) => ({
        id: r._id,
        _id: r._id,
        date: r.date,
        amount: (r.amountCents || 0) / 100,
        principal: (r.principalCents || 0) / 100,
        interest: (r.interestCents || 0) / 100,
        note: r.note,
        paymentMethod: r.paymentMethod,
        bankAccountId: r.bankAccountId,
        transactionId: r.transactionId,
      })),
    })),
    bankAccounts: bankAccounts.map(row => ({
      id: row._id,
      name: row.name || row.accountName || 'Main Account',
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      branch: row.branch || '',
      branchCode: row.branchCode || '',
      swiftCode: row.swiftCode || '',
      accountType: row.accountType || 'savings',
      currentBalance: (row.currentBalanceCents ?? row.balanceCents ?? 0) / 100,
      openingBalance: (row.openingBalanceCents ?? row.balanceCents ?? 0) / 100,
      currency: row.currency || 'LKR',
      notes: row.notes || '',
    })),
    cards: cards.map(row => ({
      id: row._id,
      name: row.name || row.cardName || 'Payment Card',
      bankAccountId: row.bankAccountId,
      cardType: row.cardType || 'debit',
      cardNumber: row.cardNumber,
      cardHolder: row.cardHolder,
      lastFourDigits: row.lastFourDigits || row.last4 || '0000',
      cardNetwork: row.cardNetwork || 'visa',
      expiryDate: row.expiryDate,
      expiryMonth: row.expiryMonth,
      expiryYear: row.expiryYear,
      creditLimit: (row.creditLimitCents || 0) / 100,
      currentBalance: (row.currentBalanceCents || 0) / 100,
      billingDay: row.billingDay,
      dueDay: row.dueDay,
    })),
    transactions: transactions.map(row => ({
      id: row._id,
      type: row.type,
      amount: (row.amountCents || 0) / 100,
      date: row.date,
      category: row.category,
      description: row.description,
      paymentMethod: row.paymentMethod,
      bankAccountId: row.bankAccountId,
      cardId: row.cardId,
      sourceRecordId: row.sourceRecordId,
      sourceRecordKind: row.sourceRecordKind,
      balanceAfter: row.balanceAfterCents !== undefined ? row.balanceAfterCents / 100 : undefined,
    })),
    pawnedItems: pawnedItems.map(row => ({
      id: row._id,
      description: row.description,
      ticketNumber: row.ticketNumber || '',
      status: row.status || 'active',
      amountReceived: (row.amountReceivedCents || 0) / 100,
      principalOutstanding: (row.principalOutstandingCents ?? row.amountReceivedCents ?? 0) / 100,
      interestPaid: (row.interestPaidCents || 0) / 100,
      interestRate: row.interestRatePercent,
      nextDue: row.nextDue,
      redemptionDate: row.redemptionDate,
      payments: (row.payments || []).map((p: RawRecord) => ({
        id: p._id,
        _id: p._id,
        date: p.date,
        amount: (p.amountCents || 0) / 100,
        paymentType: p.paymentType || 'interest',
        paymentMethod: p.paymentMethod || 'cash',
        bankAccountId: p.bankAccountId,
        transactionId: p.transactionId,
        note: p.note,
      })),
    })),
    savingsGoals: savingsGoals.map(row => ({
      id: row._id,
      name: row.name,
      dailyAmount: (row.dailyAmountCents || 0) / 100,
      monthlyTarget: (row.monthlyTargetCents || 0) / 100,
      endDate: row.endDate,
      savedAmount: (row.savedAmountCents || 0) / 100,
      targetAmount: row.targetAmountCents ? row.targetAmountCents / 100 : undefined,
      targetDate: row.targetDate,
      scope: (row.scope as any) || 'personal',
      companyId: row.companyId ? String(row.companyId) : undefined,
      branchId: row.branchId ? String(row.branchId) : undefined,
      targetType: (row.targetType as any) || 'savings',
      contributions: (row.contributions || []).map((item: RawRecord) => ({
        id: item._id,
        _id: item._id,
        date: item.date,
        amount: (item.amountCents || 0) / 100,
        paymentMethod: item.paymentMethod || undefined,
        bankAccountId: item.bankAccountId ? String(item.bankAccountId) : undefined,
        transactionId: item.transactionId ? String(item.transactionId) : undefined,
        note: item.note,
      })),
    })),
    letters: letters.map(row => ({
      id: row._id,
      type: row.type,
      mode: row.mode,
      date: row.date,
      addressedTo: row.addressedTo,
      purpose: row.purpose,
      body: row.body,
      companyId: row.companyId,
    })),
    agreements: mapAgreements(agreements),
    companies: mapCompanies(companies),
    businessBranches: mapBusinessBranches(businessBranches),
    employmentProfiles: employmentProfiles.map(row => ({
      id: row._id,
      employer: row.employer,
      role: row.role,
      monthlyGross: (row.monthlyGrossCents || 0) / 100,
      payday: row.payday,
      monthlyDeductions: (row.monthlyDeductionsCents || 0) / 100,
      monthlySavingsTarget: (row.monthlySavingsTargetCents || 0) / 100,
      careerGoal: row.careerGoal,
    })),
    ownerDraws: mapOwnerDraws(ownerDraws),
    medicalExpenses: medicalExpenses.map(row => ({
      id: row._id,
      date: row.date,
      type: row.type,
      amount: (row.amountCents || 0) / 100,
      note: row.note,
    })),
    documents: documents.map(row => ({
      id: row._id,
      type: row.type,
      label: row.label,
      uploadDate: row.uploadDate,
      note: row.note,
      fileName: row.fileName,
      fileId: row.fileId,
    })),
    reminders: reminders.map(row => ({
      id: row._id,
      type: row.type,
      relatedId: row.relatedId,
      label: row.label,
      dueDate: row.dueDate,
      channel: row.channel,
      status: row.status,
    })),
    personalSpendingBudget: budgetData && 'budget' in budgetData ? budgetData.budget : 0,
  };
}

export async function persistStoreAction(action: { type: string; [key: string]: any }): Promise<string | undefined> {
  const send = <T = unknown>(path: string, method: string, body?: unknown) =>
    apiClient<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  const rawTargetId = String(
    action.id ||
    (action.entry && typeof action.entry === 'object' && 'id' in action.entry ? action.entry.id : '') ||
    action.goalId ||
    ''
  );

  const isAdd = action.type.startsWith('ADD_');
  const localAddId = isAdd ? rawTargetId : '';

  let resolvePending!: (id: string) => void;
  let rejectPending!: (err: any) => void;
  if (localAddId) {
    const pendingPromise = new Promise<string>((res, rej) => {
      resolvePending = res;
      rejectPending = rej;
    });
    pendingCreations.set(localAddId, pendingPromise);
  }

  const create = async (path: string, body: unknown) => {
    try {
      const result = await send<{ data: { _id: string } }>(path, 'POST', body);
      const serverId = result.data._id;
      if (localAddId) {
        resolvedServerIds.set(localAddId, serverId);
        resolvePending(serverId);
      }
      return serverId;
    } catch (err) {
      if (localAddId) {
        rejectPending(err);
      }
      throw err;
    } finally {
      if (localAddId) {
        pendingCreations.delete(localAddId);
      }
    }
  };

  const resolvedId = isAdd ? rawTargetId : await resolveRecordId(rawTargetId);
  const id = encodeURIComponent(resolvedId);

  if (action.entry && typeof action.entry === 'object' && 'id' in action.entry && action.entry.id === rawTargetId) {
    action.entry.id = resolvedId;
  }

  switch (action.type) {
    case 'ADD_INCOME':
      return create('/api/backend/records/incomes', action.entry);
    case 'UPDATE_INCOME':
      return void (await send(`/api/backend/records/incomes/${id}`, 'PATCH', action.entry));
    case 'DELETE_INCOME':
      return void (await send(`/api/backend/records/incomes/${id}`, 'DELETE'));

    case 'ADD_EXPENSE':
      return create('/api/backend/records/expenses', action.entry);
    case 'UPDATE_EXPENSE':
      return void (await send(`/api/backend/records/expenses/${id}`, 'PATCH', action.entry));
    case 'DELETE_EXPENSE':
      return void (await send(`/api/backend/records/expenses/${id}`, 'DELETE'));

    case 'ADD_FINANCE_PAYMENT':
      return create('/api/backend/records/financePayments', action.entry);
    case 'UPDATE_FINANCE_PAYMENT':
      return void (await send(`/api/backend/records/financePayments/${id}`, 'PATCH', action.entry));
    case 'DELETE_FINANCE_PAYMENT':
      return void (await send(`/api/backend/records/financePayments/${id}`, 'DELETE'));
    case 'MARK_FINANCE_PAYMENT_PAID':
      return void (await send(`/api/backend/records/financePayments/${id}/pay`, 'POST', {
        amount: action.amount,
        paymentMethod: action.paymentMethod,
        bankAccountId: action.bankAccountId,
        date: action.date,
        note: action.note,
      }));
    case 'DELETE_FINANCE_PAYMENT_PAYMENT':
      return void (await send(`/api/backend/records/financePayments/${id}/payments/${action.paymentId}`, 'DELETE'));

    case 'ADD_BANK_ACCOUNT':
      return create('/api/backend/records/bankAccounts', {
        name: action.entry.name,
        accountName: action.entry.name,
        bankName: action.entry.bankName,
        accountNumber: action.entry.accountNumber,
        branch: action.entry.branch || '',
        branchCode: action.entry.branchCode || '',
        swiftCode: action.entry.swiftCode || '',
        accountType: action.entry.accountType === 'checking' ? 'current' : action.entry.accountType || 'savings',
        openingBalance: Number(action.entry.openingBalance ?? action.entry.currentBalance ?? 0),
        balance: Number(action.entry.currentBalance || 0),
        currentBalance: Number(action.entry.currentBalance || 0),
        currency: action.entry.currency || 'LKR',
        notes: action.entry.notes || '',
        isDefault: false,
      });
    case 'UPDATE_BANK_ACCOUNT':
      return void (await send(`/api/backend/records/bankAccounts/${id}`, 'PATCH', {
        name: action.entry.name,
        accountName: action.entry.name,
        bankName: action.entry.bankName,
        accountNumber: action.entry.accountNumber,
        branch: action.entry.branch || '',
        branchCode: action.entry.branchCode || '',
        swiftCode: action.entry.swiftCode || '',
        accountType: action.entry.accountType === 'checking' ? 'current' : action.entry.accountType || 'savings',
        currency: action.entry.currency || 'LKR',
        notes: action.entry.notes || '',
      }));
    case 'DELETE_BANK_ACCOUNT':
      return void (await send(`/api/backend/records/bankAccounts/${id}`, 'DELETE'));

    case 'ADD_CARD':
      return create('/api/backend/records/cards', {
        name: action.entry.name,
        cardName: action.entry.name,
        bankAccountId: action.entry.bankAccountId || null,
        cardType: action.entry.cardType || 'debit',
        cardNetwork: action.entry.cardNetwork || 'visa',
        last4: (action.entry.lastFourDigits || '0000').slice(-4),
        lastFourDigits: action.entry.lastFourDigits,
        expiryDate: action.entry.expiryDate,
        expiryMonth: action.entry.expiryMonth,
        expiryYear: action.entry.expiryYear,
        creditLimit: Number(action.entry.creditLimit || 0),
        balance: Number(action.entry.currentBalance || 0),
        billingDay: action.entry.billingDay,
        dueDay: action.entry.dueDay,
      });
    case 'UPDATE_CARD':
      return void (await send(`/api/backend/records/cards/${id}`, 'PATCH', {
        name: action.entry.name,
        cardName: action.entry.name,
        bankAccountId: action.entry.bankAccountId || null,
        cardType: action.entry.cardType || 'debit',
        cardNetwork: action.entry.cardNetwork || 'visa',
        last4: (action.entry.lastFourDigits || '0000').slice(-4),
        lastFourDigits: action.entry.lastFourDigits,
        expiryDate: action.entry.expiryDate,
        expiryMonth: action.entry.expiryMonth,
        expiryYear: action.entry.expiryYear,
        creditLimit: Number(action.entry.creditLimit || 0),
        balance: Number(action.entry.currentBalance || 0),
        billingDay: action.entry.billingDay,
        dueDay: action.entry.dueDay,
      }));
    case 'DELETE_CARD':
      return void (await send(`/api/backend/records/cards/${id}`, 'DELETE'));

    case 'ADD_TRANSACTION':
      return create('/api/backend/records/transactions', action.entry);
    case 'DELETE_TRANSACTION':
      return void (await send(`/api/backend/records/transactions/${id}`, 'DELETE'));

    case 'TRANSFER_FUNDS': {
      const fromAccountId = action.fromAccountId && action.fromAccountId !== 'cash'
        ? await resolveRecordId(action.fromAccountId)
        : action.fromAccountId;
      const toAccountId = action.toAccountId && action.toAccountId !== 'cash'
        ? await resolveRecordId(action.toAccountId)
        : action.toAccountId;
      const fromCardId = action.fromCardId ? await resolveRecordId(action.fromCardId) : action.fromCardId;
      const toCardId = action.toCardId ? await resolveRecordId(action.toCardId) : action.toCardId;
      const res = await send('/api/backend/records/transfers', 'POST', {
        fromAccountId,
        fromCardId,
        toAccountId,
        toCardId,
        amount: action.amount,
        date: action.date,
        description: action.description,
        category: action.category,
      });
      return (res as any)?.data?.transferGroupId;
    }
    case 'DELETE_TRANSFER':
      return void (await send(`/api/backend/records/transfers/${action.transferGroupId}`, 'DELETE'));

    case 'ADD_LOAN': {
      const payload: Record<string, any> = {
        lender: action.entry.lender,
        amount: action.entry.amount !== undefined ? action.entry.amount : action.entry.principal,
        rate: action.entry.rate,
        method: action.entry.method,
        startDate: action.entry.startDate,
        dueDate: action.entry.dueDate,
      };
      if (action.entry.interestBasis) payload.interestBasis = action.entry.interestBasis;
      if (action.entry.tenureMonths) payload.tenureMonths = action.entry.tenureMonths;
      return create('/api/backend/records/loans', payload);
    }
    case 'UPDATE_LOAN': {
      const payload: Record<string, any> = {};
      const src = action.entry || {};
      if (src.lender !== undefined) payload.lender = src.lender;
      if (src.amount !== undefined) payload.amount = src.amount;
      else if (src.principal !== undefined) payload.amount = src.principal;
      if (src.rate !== undefined) payload.rate = src.rate;
      if (src.method !== undefined) payload.method = src.method;
      if (src.startDate !== undefined) payload.startDate = src.startDate;
      if (src.dueDate !== undefined) payload.dueDate = src.dueDate;
      if (src.interestBasis !== undefined) payload.interestBasis = src.interestBasis;
      if (src.tenureMonths !== undefined) payload.tenureMonths = src.tenureMonths;
      return void (await send(`/api/backend/records/loans/${id}`, 'PATCH', payload));
    }
    case 'DELETE_LOAN':
      return void (await send(`/api/backend/records/loans/${id}`, 'DELETE'));
    case 'ADD_LOAN_FROM_SHORTFALL':
      return create('/api/backend/records/loans', {
        lender: 'Self (shortfall ' + action.month + ')',
        amount: action.amount,
        rate: 0,
        method: 'simple',
        interestBasis: 'annual',
        tenureMonths: 12,
        startDate: action.month + '-01',
        dueDate: '',
      });
    case 'RECORD_LOAN_REPAYMENT':
      return void (await send(`/api/backend/records/loans/${id}/repay`, 'POST', {
        amount: action.amount,
        date: action.date,
        note: action.note,
        paymentMethod: action.paymentMethod,
        bankAccountId: action.bankAccountId,
      }));
    case 'DELETE_LOAN_REPAYMENT':
      return void (await send(`/api/backend/records/loans/${id}/repayments/${action.repaymentId}`, 'DELETE'));

    case 'ADD_PAWNED':
      return create('/api/backend/records/pawnedItems', action.entry);
    case 'DELETE_PAWNED':
      return void (await send(`/api/backend/records/pawnedItems/${id}`, 'DELETE'));
    case 'RECORD_PAWN_PAYMENT':
      return void (await send(`/api/backend/records/pawnedItems/${id}/payment`, 'POST', {
        amount: action.amount,
        paymentType: action.paymentType,
        paymentMethod: action.paymentMethod,
        bankAccountId: action.bankAccountId,
        date: action.date,
        note: action.note,
      }));
    case 'DELETE_PAWN_PAYMENT':
      return void (await send(`/api/backend/records/pawnedItems/${id}/payments/${action.paymentId}`, 'DELETE'));

    case 'ADD_GOAL':
      return create('/api/backend/records/goals', {
        name: action.entry.name,
        dailyAmount: action.entry.dailyAmount,
        monthlyTarget: action.entry.monthlyTarget,
        endDate: action.entry.endDate,
        targetAmount: action.entry.targetAmount,
        targetDate: action.entry.targetDate,
        scope: action.entry.scope || 'personal',
        companyId: action.entry.companyId || undefined,
        branchId: action.entry.branchId || undefined,
        targetType: action.entry.targetType || 'savings',
      });
    case 'UPDATE_GOAL':
      return void (await send(`/api/backend/records/goals/${id}`, 'PATCH', {
        dailyAmount: action.dailyAmount,
        monthlyTarget: action.monthlyTarget,
        targetAmount: action.targetAmount,
        targetDate: action.targetDate,
      }));
    case 'DELETE_GOAL':
      return void (await send(`/api/backend/records/goals/${id}`, 'DELETE'));
    case 'ADD_SAVING_CONTRIBUTION':
      return void (await send(
        `/api/backend/records/goals/${encodeURIComponent(action.goalId)}/contributions`,
        'POST',
        {
          amount: action.amount,
          date: action.date,
          note: action.note,
          debitAccount: action.debitAccount,
          paymentMethod: action.paymentMethod,
          bankAccountId: action.bankAccountId,
        }
      ));
    case 'DELETE_SAVING_CONTRIBUTION':
      return void (await send(
        `/api/backend/records/goals/${encodeURIComponent(action.goalId)}/contributions/${encodeURIComponent(action.contributionId)}`,
        'DELETE'
      ));

    case 'SET_PERSONAL_SPENDING_BUDGET':
      return void (await send('/api/backend/profile/personal-budget', 'PUT', {
        budget: action.budget,
        month: action.month || new Date().toISOString().slice(0, 7),
      }));
    case 'UPDATE_PROFILE':
      return void (await send('/api/backend/profile', 'PATCH', action.profile));
    case 'ADD_LETTER':
      return create('/api/backend/records/letters', action.entry);
    case 'DELETE_LETTER':
      return void (await send(`/api/backend/records/letters/${id}`, 'DELETE'));
    case 'ADD_AGREEMENT':
      return create('/api/backend/records/agreements', { ...action.entry, value: action.entry.value });
    case 'DELETE_AGREEMENT':
      return void (await send(`/api/backend/records/agreements/${id}`, 'DELETE'));
    case 'ADD_COMPANY':
      return create('/api/backend/records/companies', action.entry);
    case 'UPDATE_COMPANY':
      return void (await send(`/api/backend/records/companies/${id}`, 'PATCH', action.entry));
    case 'DELETE_COMPANY':
      return void (await send(`/api/backend/records/companies/${id}`, 'DELETE'));
    case 'ADD_BRANCH':
      return create('/api/backend/records/businessBranches', action.entry);
    case 'UPDATE_BRANCH':
      return void (await send(`/api/backend/records/businessBranches/${id}`, 'PATCH', action.entry));
    case 'DELETE_BRANCH':
      return void (await send(`/api/backend/records/businessBranches/${id}`, 'DELETE'));
    case 'ADD_EMPLOYMENT':
      return create('/api/backend/records/employmentProfiles', action.entry);
    case 'UPDATE_EMPLOYMENT':
      return void (await send(`/api/backend/records/employmentProfiles/${id}`, 'PATCH', action.entry));
    case 'DELETE_EMPLOYMENT':
      return void (await send(`/api/backend/records/employmentProfiles/${id}`, 'DELETE'));
    case 'ADD_OWNER_DRAW':
      return create('/api/backend/records/ownerDraws', action.entry);
    case 'UPDATE_AGREEMENT':
      return void (await send(`/api/backend/records/agreements/${id}`, 'PATCH', action.updates));
    case 'ADD_MEDICAL_EXPENSE':
      return create('/api/backend/records/medicalExpenses', action.entry);
    case 'DELETE_MEDICAL_EXPENSE':
      return void (await send(`/api/backend/records/medicalExpenses/${id}`, 'DELETE'));
    case 'ADD_DOCUMENT':
      return create('/api/backend/records/documents', action.entry);
    case 'DELETE_DOCUMENT':
      return void (await send(`/api/backend/records/documents/${id}`, 'DELETE'));
    case 'ADD_REMINDER':
      return create('/api/backend/records/reminders', action.entry);
    case 'UPDATE_REMINDER':
      return void (await send(`/api/backend/records/reminders/${id}`, 'PATCH', { status: action.status }));
    case 'DELETE_REMINDER':
      return void (await send(`/api/backend/records/reminders/${id}`, 'DELETE'));
  }
}

export interface TransactionHistoryResult {
  transactions: Transaction[];
  data: Transaction[];
  totalCount: number;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netFlow: number;
    closingBalance?: number;
    count: number;
  };
}

export async function fetchTransactionHistory(filters: Record<string, any> = {}): Promise<TransactionHistoryResult> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qStr = query.toString();
  const path = `/api/backend/transactions/history${qStr ? `?${qStr}` : ''}`;
  const res = await apiClient<{ transactions?: any[]; data?: any[]; totalCount?: number; summary: any }>(path);
  const rawList = res.transactions || res.data || [];
  const mapped = rawList.map(row => ({
    id: row._id,
    type: row.type,
    transferDirection: row.transferDirection,
    transferGroupId: row.transferGroupId,
    amount: (row.amountCents || 0) / 100,
    date: row.date,
    category: row.category,
    description: row.description,
    paymentMethod: row.paymentMethod,
    bankAccountId: row.bankAccountId,
    cardId: row.cardId,
    sourceRecordId: row.sourceRecordId,
    sourceRecordKind: row.sourceRecordKind,
    balanceAfter: row.balanceAfterCents !== undefined
      ? row.balanceAfterCents / 100
      : (row.runningBalanceCents !== undefined ? row.runningBalanceCents / 100 : undefined),
  }));

  const totalCount = res.totalCount ?? res.summary?.count ?? mapped.length;

  return {
    transactions: mapped,
    data: mapped,
    totalCount,
    summary: {
      totalIncome: (res.summary?.totalIncomeCents || 0) / 100,
      totalExpense: (res.summary?.totalExpenseCents || 0) / 100,
      netFlow: (res.summary?.netFlowCents ?? res.summary?.netCents ?? 0) / 100,
      closingBalance: res.summary?.closingBalanceCents !== undefined ? res.summary.closingBalanceCents / 100 : undefined,
      count: totalCount,
    },
  };
}