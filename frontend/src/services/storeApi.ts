import { apiClient } from './apiClient';
import type { AppState, Transaction } from '@/types';

type RawRecord = Record<string, any> & { _id: string };
type ListResult = { data: RawRecord[] };

async function list(kind: string): Promise<RawRecord[]> {
  try {
    const result = await apiClient<ListResult>(`/api/backend/records/${kind}`);
    return result.data || [];
  } catch (error) {
    console.warn(`Failed to list ${kind}:`, error);
    return [];
  }
}

export async function loadPersistedData(): Promise<Partial<AppState>> {
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
    list('agreements'),
    list('companies'),
    list('businessBranches'),
    list('employmentProfiles'),
    list('ownerDraws'),
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
    })),
    financePayments: financePayments.map(row => ({
      id: row._id,
      lender: row.lender,
      amount: (row.amountCents || 0) / 100,
      dueDay: row.dueDay,
      monthsRemaining: row.monthsRemaining,
      paymentKind: row.paymentKind,
      chequeNumber: row.chequeNumber,
      bankAccountId: row.bankAccountId,
      payee: row.payee,
      frequency: row.frequency,
      status: row.status,
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
        date: r.date,
        amount: (r.amountCents || 0) / 100,
        note: r.note,
      })),
    })),
    bankAccounts: bankAccounts.map(row => ({
      id: row._id,
      name: row.name,
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      branch: row.branch || '',
      accountType: row.accountType || 'savings',
      currentBalance: (row.currentBalanceCents || 0) / 100,
      currency: row.currency || 'LKR',
      notes: row.notes || '',
    })),
    cards: cards.map(row => ({
      id: row._id,
      name: row.name,
      bankAccountId: row.bankAccountId,
      cardType: row.cardType || 'debit',
      lastFourDigits: row.lastFourDigits,
      cardNetwork: row.cardNetwork || 'visa',
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
      amountReceived: (row.amountReceivedCents || 0) / 100,
      interestRate: row.interestRatePercent,
      nextDue: row.nextDue,
      redemptionDate: row.redemptionDate,
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
      contributions: (row.contributions || []).map((item: RawRecord) => ({
        date: item.date,
        amount: (item.amountCents || 0) / 100,
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
    agreements: agreements.map(row => ({
      id: row._id,
      title: row.title,
      otherParty: row.otherParty,
      startDate: row.startDate,
      endDate: row.endDate,
      value: (row.valueCents || 0) / 100,
      summary: row.summary,
      status: row.status,
      fileName: row.fileName,
    })),
    companies: companies.map(row => ({
      id: row._id,
      name: row.name,
      address: row.address,
      contact: row.contact,
      logo: row.logo,
    })),
    businessBranches: businessBranches.map(row => ({
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
    })),
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
    ownerDraws: ownerDraws.map(row => ({
      id: row._id,
      companyId: row.companyId,
      amount: (row.amountCents || 0) / 100,
      date: row.date,
    })),
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

  const create = async (path: string, body: unknown) => {
    const result = await send<{ data: { _id: string } }>(path, 'POST', body);
    return result.data._id;
  };

  const id = encodeURIComponent(String(action.id || action.entry?.id || ''));

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
    case 'DELETE_FINANCE_PAYMENT':
      return void (await send(`/api/backend/records/financePayments/${id}`, 'DELETE'));

    case 'ADD_BANK_ACCOUNT':
      return create('/api/backend/records/bankAccounts', {
        ...action.entry,
        currentBalance: action.entry.currentBalance,
      });
    case 'UPDATE_BANK_ACCOUNT':
      return void (await send(`/api/backend/records/bankAccounts/${id}`, 'PATCH', action.entry));
    case 'DELETE_BANK_ACCOUNT':
      return void (await send(`/api/backend/records/bankAccounts/${id}`, 'DELETE'));

    case 'ADD_CARD':
      return create('/api/backend/records/cards', action.entry);
    case 'UPDATE_CARD':
      return void (await send(`/api/backend/records/cards/${id}`, 'PATCH', action.entry));
    case 'DELETE_CARD':
      return void (await send(`/api/backend/records/cards/${id}`, 'DELETE'));

    case 'ADD_TRANSACTION':
      return create('/api/backend/records/transactions', action.entry);
    case 'DELETE_TRANSACTION':
      return void (await send(`/api/backend/records/transactions/${id}`, 'DELETE'));

    case 'ADD_LOAN':
      return create('/api/backend/records/loans', {
        lender: action.entry.lender,
        amount: action.entry.principal,
        rate: action.entry.rate,
        method: action.entry.method,
        startDate: action.entry.startDate,
        dueDate: action.entry.dueDate,
        interestBasis: action.entry.interestBasis,
        tenureMonths: action.entry.tenureMonths,
        monthlyPayment: action.entry.monthlyPayment,
        totalInterest: action.entry.totalInterest,
      });
    case 'UPDATE_LOAN':
      return void (await send(`/api/backend/records/loans/${id}`, 'PATCH', action.entry));
    case 'DELETE_LOAN':
      return void (await send(`/api/backend/records/loans/${id}`, 'DELETE'));
    case 'RECORD_LOAN_REPAYMENT':
      return void (await send(`/api/backend/records/loans/${id}/repay`, 'POST', {
        amount: action.amount,
        note: action.note,
      }));

    case 'ADD_PAWNED':
      return create('/api/backend/records/pawnedItems', action.entry);
    case 'DELETE_PAWNED':
      return void (await send(`/api/backend/records/pawnedItems/${id}`, 'DELETE'));
    case 'RECORD_PAWN_PAYMENT':
      return void (await send(`/api/backend/records/pawnedItems/${id}/payment`, 'POST'));

    case 'ADD_GOAL':
      return create('/api/backend/records/goals', {
        name: action.entry.name,
        dailyAmount: action.entry.dailyAmount,
        monthlyTarget: action.entry.monthlyTarget,
        endDate: action.entry.endDate,
        targetAmount: action.entry.targetAmount,
        targetDate: action.entry.targetDate,
      });
    case 'UPDATE_GOAL':
      return void (await send(`/api/backend/records/goals/${id}`, 'PATCH', {
        dailyAmount: action.dailyAmount,
        monthlyTarget: action.monthlyTarget,
      }));
    case 'DELETE_GOAL':
      return void (await send(`/api/backend/records/goals/${id}`, 'DELETE'));
    case 'ADD_SAVING_CONTRIBUTION':
      return void (await send(
        `/api/backend/records/goals/${encodeURIComponent(action.goalId)}/contributions`,
        'POST',
        { amount: action.amount, date: action.date, note: action.note }
      ));

    case 'SET_PERSONAL_SPENDING_BUDGET':
      return void (await send('/api/backend/profile/personal-budget', 'PUT', { budget: action.budget }));
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

export async function fetchTransactionHistory(filters: Record<string, any> = {}): Promise<{
  data: Transaction[];
  summary: { totalIncome: number; totalExpense: number; netFlow: number; count: number };
}> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qStr = query.toString();
  const path = `/api/backend/transactions/history${qStr ? `?${qStr}` : ''}`;
  const res = await apiClient<{ data: any[]; summary: any }>(path);
  return {
    data: (res.data || []).map(row => ({
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
    summary: {
      totalIncome: (res.summary?.totalIncomeCents || 0) / 100,
      totalExpense: (res.summary?.totalExpenseCents || 0) / 100,
      netFlow: (res.summary?.netFlowCents || 0) / 100,
      count: res.summary?.count || 0,
    },
  };
}