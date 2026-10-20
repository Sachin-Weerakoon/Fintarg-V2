import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchTransactionHistory, persistStoreAction, loadPersistedData, list, loadBusinessData } from './storeApi';

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

  it('handles local ID race: pending create resolves before update/delete is submitted (5.2)', async () => {
    let addResolved = false;
    let patchUrl: string | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.includes('/api/backend/records/incomes') && init?.method === 'POST') {
        await new Promise(r => setTimeout(r, 20));
        addResolved = true;
        return new Response(JSON.stringify({ data: { _id: 'srv_income_555' } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (init?.method === 'PATCH') {
        patchUrl = u;
        return new Response(JSON.stringify({ data: { _id: 'srv_income_555' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    });

    const localId = 'loc_inc_' + Date.now();
    const addPromise = persistStoreAction({
      type: 'ADD_INCOME',
      entry: {
        id: localId,
        source: 'Freelance',
        amount: 50000,
        type: 'side_income',
        date: '2026-09-10',
        frequency: 'one_time',
      },
    });

    const updatePromise = persistStoreAction({
      type: 'UPDATE_INCOME',
      id: localId,
      entry: {
        id: localId,
        source: 'Freelance Design',
        amount: 60000,
        type: 'side_income',
        date: '2026-09-10',
        frequency: 'one_time',
      },
    });

    const [createdId] = await Promise.all([addPromise, updatePromise]);

    expect(createdId).toBe('srv_income_555');
    expect(addResolved).toBe(true);
    expect(patchUrl).toBe('/api/backend/records/incomes/srv_income_555');
  });

  it('loadPersistedData rejects on backend API failure rather than silently wiping data (5.3)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(loadPersistedData()).rejects.toThrow('Database connection failed');
  });

  describe('plan-gated store loading and 403 PLAN_REQUIRED resilience', () => {
    it('loadPersistedData(basic) does not request business collections and returns empty arrays', async () => {
      const requestedUrls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        requestedUrls.push(u);
        if (u.includes('/api/backend/profile/personal-budget')) {
          return new Response(JSON.stringify({ budget: 5000 }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      const data = await loadPersistedData('basic');

      // Verify business endpoints were never fetched
      expect(requestedUrls.some(u => u.includes('/records/companies'))).toBe(false);
      expect(requestedUrls.some(u => u.includes('/records/businessBranches'))).toBe(false);
      expect(requestedUrls.some(u => u.includes('/records/ownerDraws'))).toBe(false);
      expect(requestedUrls.some(u => u.includes('/records/agreements'))).toBe(false);

      // Verify empty collections in data
      expect(data.companies).toEqual([]);
      expect(data.businessBranches).toEqual([]);
      expect(data.ownerDraws).toEqual([]);
      expect(data.agreements).toEqual([]);
      expect(data.personalSpendingBudget).toBe(5000);
    });

    it('loadPersistedData(business) fetches business collections and populates them', async () => {
      const requestedUrls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        requestedUrls.push(u);
        if (u.includes('/records/companies')) {
          return new Response(JSON.stringify({ data: [{ _id: 'comp_1', name: 'Acme Corp' }] }), { status: 200 });
        }
        if (u.includes('/records/agreements')) {
          return new Response(JSON.stringify({ data: [{ _id: 'agr_1', title: 'Service Agreement', valueCents: 500000 }] }), { status: 200 });
        }
        if (u.includes('/api/backend/profile/personal-budget')) {
          return new Response(JSON.stringify({ budget: 0 }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      const data = await loadPersistedData('business');

      expect(requestedUrls.some(u => u.includes('/records/companies'))).toBe(true);
      expect(requestedUrls.some(u => u.includes('/records/businessBranches'))).toBe(true);
      expect(requestedUrls.some(u => u.includes('/records/ownerDraws'))).toBe(true);
      expect(requestedUrls.some(u => u.includes('/records/agreements'))).toBe(true);

      expect(data.companies).toHaveLength(1);
      expect(data.companies?.[0].name).toBe('Acme Corp');
      expect(data.agreements).toHaveLength(1);
      expect(data.agreements?.[0].value).toBe(5000);
    });

    it('list() tolerates 403 PLAN_REQUIRED, logs warning, and returns empty array', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        return new Response(
          JSON.stringify({
            error: 'This feature requires the Business edition',
            code: 'PLAN_REQUIRED',
            requiredPlan: 'business',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await list('companies');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping record kind "companies"')
      );
    });

    it('list() rethrows 500 server error and attaches collection name to error', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        return new Response(
          JSON.stringify({ error: 'Database query timeout' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      });

      let caughtErr: any;
      try {
        await list('expenses');
      } catch (err) {
        caughtErr = err;
      }

      expect(caughtErr).toBeDefined();
      expect(caughtErr.message).toBe('Database query timeout');
      expect(caughtErr.status).toBe(500);
      expect(caughtErr.collection).toBe('expenses');
    });

    it('loadBusinessData fetches and maps all four business collections', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('/records/companies')) {
          return new Response(JSON.stringify({ data: [{ _id: 'c1', name: 'Corp 1', address: 'Colombo' }] }), { status: 200 });
        }
        if (u.includes('/records/businessBranches')) {
          return new Response(JSON.stringify({ data: [{ _id: 'b1', name: 'Branch 1', monthlyTargetCents: 100000 }] }), { status: 200 });
        }
        if (u.includes('/records/agreements')) {
          return new Response(JSON.stringify({ data: [{ _id: 'a1', title: 'Lease', valueCents: 200000 }] }), { status: 200 });
        }
        if (u.includes('/records/ownerDraws')) {
          return new Response(JSON.stringify({ data: [{ _id: 'd1', amountCents: 50000, date: '2026-10-01' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      const res = await loadBusinessData();
      expect(res.companies[0].name).toBe('Corp 1');
      expect(res.businessBranches[0].monthlyTarget).toBe(1000);
      expect(res.agreements[0].value).toBe(2000);
      expect(res.ownerDraws[0].amount).toBe(500);
    });
  });
});



