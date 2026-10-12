import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchTransactionHistory, persistStoreAction } from './storeApi';

describe('storeApi loan mapping and readonly field stripping (1.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ADD_LOAN maps principal to amount and does not send readonly fields to backend', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'loan_123' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const id = await persistStoreAction({
      type: 'ADD_LOAN',
      entry: {
        id: 'temp_local_id',
        lender: 'Commercial Bank',
        principal: 100000,
        rate: 12,
        method: 'reducing_balance',
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
        interestBasis: 'annual',
        tenureMonths: 12,
        balance: 100000,
        monthlyPayment: 8884.88,
        totalInterest: 6618.55,
        repayments: [],
      },
    });

    expect(id).toBe('loan_123');
    expect(capturedUrl).toContain('/api/backend/records/loans');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toEqual({
      lender: 'Commercial Bank',
      amount: 100000,
      rate: 12,
      method: 'reducing_balance',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
      interestBasis: 'annual',
      tenureMonths: 12,
    });
    // Ensure readonly fields were not sent
    expect(capturedBody.id).toBeUndefined();
    expect(capturedBody.principal).toBeUndefined();
    expect(capturedBody.balance).toBeUndefined();
    expect(capturedBody.monthlyPayment).toBeUndefined();
    expect(capturedBody.totalInterest).toBeUndefined();
    expect(capturedBody.repayments).toBeUndefined();
  });

  it('UPDATE_LOAN maps principal to amount and strips readonly fields on update', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'loan_123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await persistStoreAction({
      type: 'UPDATE_LOAN',
      entry: {
        id: 'loan_123',
        lender: 'Commercial Bank PLC',
        principal: 150000,
        rate: 14,
        method: 'simple',
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
        interestBasis: 'annual',
        tenureMonths: 24,
        balance: 130000,
        monthlyPayment: 8000,
        totalInterest: 42000,
        repayments: [{ date: '2026-02-01', amount: 20000, note: 'repaid' }],
      },
    });

    expect(capturedUrl).toContain('/api/backend/records/loans/loan_123');
    expect(capturedMethod).toBe('PATCH');
    expect(capturedBody).toEqual({
      lender: 'Commercial Bank PLC',
      amount: 150000,
      rate: 14,
      method: 'simple',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
      interestBasis: 'annual',
      tenureMonths: 24,
    });
    // Verify readonly fields are stripped
    expect(capturedBody.id).toBeUndefined();
    expect(capturedBody.principal).toBeUndefined();
    expect(capturedBody.balance).toBeUndefined();
    expect(capturedBody.monthlyPayment).toBeUndefined();
    expect(capturedBody.totalInterest).toBeUndefined();
    expect(capturedBody.repayments).toBeUndefined();
  });

  it('UPDATE_BANK_ACCOUNT strips balance and currentBalance from update payload (1.4)', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'bank_456' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await persistStoreAction({
      type: 'UPDATE_BANK_ACCOUNT',
      entry: {
        id: 'bank_456',
        name: 'Salary Account',
        bankName: 'Sampath Bank',
        accountNumber: '99887766',
        branch: 'Colombo 03',
        branchCode: '003',
        swiftCode: 'BSAMLKLX',
        accountType: 'savings',
        currentBalance: 75000,
        currency: 'LKR',
        notes: 'Updated payroll notes',
      },
    });

    expect(capturedUrl).toContain('/api/backend/records/bankAccounts/bank_456');
    expect(capturedMethod).toBe('PATCH');
    expect(capturedBody).toEqual({
      name: 'Salary Account',
      accountName: 'Salary Account',
      bankName: 'Sampath Bank',
      accountNumber: '99887766',
      branch: 'Colombo 03',
      branchCode: '003',
      swiftCode: 'BSAMLKLX',
      accountType: 'savings',
      currency: 'LKR',
      notes: 'Updated payroll notes',
    });
    // Critical: balance/currentBalance must not be sent
    expect(capturedBody.balance).toBeUndefined();
    expect(capturedBody.currentBalance).toBeUndefined();
  });

  it('TRANSFER_FUNDS posts to /api/backend/records/transfers and returns transferGroupId (2.7)', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { transferGroupId: 'trf_999' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await persistStoreAction({
      type: 'TRANSFER_FUNDS',
      fromAccountId: 'ba_111',
      toAccountId: 'ba_222',
      amount: 5000,
      date: '2026-10-12',
      description: 'Savings top-up',
    });

    expect(result).toBe('trf_999');
    expect(capturedUrl).toContain('/api/backend/records/transfers');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toEqual({
      fromAccountId: 'ba_111',
      toAccountId: 'ba_222',
      amount: 5000,
      date: '2026-10-12',
      description: 'Savings top-up',
    });
  });

  it('DELETE_TRANSFER sends DELETE to /api/backend/records/transfers/:transferGroupId (2.7)', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ data: { count: 2 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await persistStoreAction({
      type: 'DELETE_TRANSFER',
      transferGroupId: 'trf_999',
    });

    expect(capturedUrl).toContain('/api/backend/records/transfers/trf_999');
    expect(capturedMethod).toBe('DELETE');
  });
});

describe('fetchTransactionHistory contract alignment (2.10)', () => {
  it('maps transactions, totalCount, and summary accurately from backend response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response(
        JSON.stringify({
          transactions: [
            {
              _id: 'tx_1',
              type: 'income',
              amountCents: 150000,
              date: '2026-10-12',
              category: 'Salary',
              description: 'October Pay',
              paymentMethod: 'bank_transfer',
              bankAccountId: 'ba_1',
              runningBalanceCents: 250000,
            },
          ],
          totalCount: 1,
          summary: {
            totalIncomeCents: 150000,
            totalExpenseCents: 0,
            netFlowCents: 150000,
            closingBalanceCents: 250000,
            count: 1,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const res = await fetchTransactionHistory({
      bankAccountId: 'ba_1',
      limit: 25,
      skip: 0,
    });

    expect(res.transactions).toHaveLength(1);
    expect(res.data).toHaveLength(1);
    expect(res.totalCount).toBe(1);
    expect(res.transactions[0].amount).toBe(1500);
    expect(res.transactions[0].balanceAfter).toBe(2500);
    expect(res.summary.totalIncome).toBe(1500);
    expect(res.summary.totalExpense).toBe(0);
    expect(res.summary.netFlow).toBe(1500);
    expect(res.summary.closingBalance).toBe(2500);
  });

  it('ADD_LOAN_FROM_SHORTFALL persists as a normal loan create (4.6)', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'loan_shortfall_999' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const id = await persistStoreAction({
      type: 'ADD_LOAN_FROM_SHORTFALL',
      amount: 15000,
      month: '2026-09',
    });

    expect(id).toBe('loan_shortfall_999');
    expect(capturedUrl).toContain('/api/backend/records/loans');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toEqual({
      lender: 'Self (shortfall 2026-09)',
      amount: 15000,
      rate: 0,
      method: 'simple',
      interestBasis: 'annual',
      tenureMonths: 12,
      startDate: '2026-09-01',
      dueDate: '',
    });
  });

  it('SET_PERSONAL_SPENDING_BUDGET persists budget and month to /api/backend/profile/personal-budget (4.5)', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await persistStoreAction({
      type: 'SET_PERSONAL_SPENDING_BUDGET',
      budget: 25000,
      month: '2026-09',
    });

    expect(capturedUrl).toContain('/api/backend/profile/personal-budget');
    expect(capturedMethod).toBe('PUT');
    expect(capturedBody).toEqual({
      budget: 25000,
      month: '2026-09',
    });
  });
});


