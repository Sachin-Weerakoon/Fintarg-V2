import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { app } from '../app';

describe('Backend API Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let memoryServer: any = null;
  let skipSuite = false;

  before(async (t) => {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
      const memoryUri = memoryServer.getUri();
      await mongoose.disconnect();
      await mongoose.connect(memoryUri, {
        dbName: 'fintarg-test',
        serverSelectionTimeoutMS: 10000,
      });
      // Ensure indexes (especially unique indexes like User.email) are built before test execution
      const { UserModel } = await import('../models/User');
      await UserModel.init();
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      console.warn('Skipping integration tests: mongodb-memory-server could not be initialized:', msg);
      skipSuite = true;
      if (t && typeof (t as any).skip === 'function') {
        (t as any).skip('mongodb-memory-server could not be initialized: ' + msg);
      }
      return;
    }

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  beforeEach((t: any) => {
    if (skipSuite && t && typeof t.skip === 'function') {
      t.skip('mongodb-memory-server unavailable');
    }
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  });

  describe('Root Endpoints & Content Negotiation', () => {
    it('returns JSON status by default on GET /', async () => {
      const response = await fetch(`${baseUrl}/`, {
        headers: { Accept: 'application/json' },
      });
      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type')?.includes('application/json'));

      const data = await response.json();
      assert.strictEqual(data.name, 'Fintarg Backend API');
      assert.strictEqual(data.status, 'online');
      assert.ok(data.endpoints);
      assert.strictEqual(data.endpoints.health, '/api/health');
    });

    it('returns styled HTML dashboard when text/html is requested on GET /', async () => {
      const response = await fetch(`${baseUrl}/`, {
        headers: { Accept: 'text/html' },
      });
      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type')?.includes('text/html'));

      const text = await response.text();
      assert.ok(text.includes('<!DOCTYPE html>'));
      assert.ok(text.includes('Fintarg API Server'));
      assert.ok(text.includes('Backend API Online & Running'));
    });

    it('returns API endpoint catalog on GET /api', async () => {
      const response = await fetch(`${baseUrl}/api`);
      assert.strictEqual(response.status, 200);

      const data = await response.json();
      assert.strictEqual(data.status, 'online');
      assert.strictEqual(data.endpoints.auth, '/api/auth');
      assert.strictEqual(data.endpoints.records, '/api/records');
    });
  });

  describe('Health Checks', () => {
    it('returns health check status on GET /api/health', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      assert.ok([200, 503].includes(response.status));

      const data = await response.json();
      assert.ok(data.status === 'ok' || data.status === 'degraded');
      assert.ok(data.database === 'connected' || data.database === 'disconnected');
    });

    it('supports /health alias endpoint', async () => {
      const response = await fetch(`${baseUrl}/health`);
      assert.ok([200, 503].includes(response.status));

      const data = await response.json();
      assert.ok(data.status);
    });
  });

  describe('Security & HTTP Headers', () => {
    it('sets Helmet security headers (nosniff, frame-options, etc.)', async () => {
      const response = await fetch(`${baseUrl}/`);
      assert.strictEqual(response.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(response.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.ok(response.headers.get('content-security-policy'));
    });

    it('allows configured frontend origin and rejects arbitrary vercel.app domains', async () => {
      const allowedRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost:3000' },
      });
      assert.strictEqual(allowedRes.headers.get('access-control-allow-origin'), 'http://localhost:3000');
      assert.strictEqual(allowedRes.headers.get('access-control-allow-credentials'), 'true');

      const rejectedRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://arbitrary-attacker.vercel.app' },
      });
      assert.notStrictEqual(rejectedRes.headers.get('access-control-allow-origin'), 'https://arbitrary-attacker.vercel.app');
    });
  });

  describe('Authentication & Route Protection', () => {
    it('rejects registration with invalid email or short password (400)', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          email: 'invalid-email',
          password: '123',
          workMode: 'salary',
        }),
      });

      assert.strictEqual(response.status, 400);
      const data = await response.json();
      assert.strictEqual(data.error, 'Validation failed');
      assert.ok(Array.isArray(data.details));
    });

    it('rejects login with non-existent user credentials (401)', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent-user-123456@fintarg.example.com',
          password: 'WrongPassword123!',
        }),
      });

      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.ok(data.error);
    });

    it('rejects /api/auth/me when unauthenticated without cookie (401)', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.strictEqual(data.error, 'Authentication required');
    });

    it('handles concurrent registration for the same email gracefully with 409 and clear message', async () => {
      const email = `concurrent-test-${Date.now()}@fintarg.example.com`;
      const payload = {
        name: 'Concurrent User',
        email,
        password: 'SecurePassword123!',
        workMode: 'salary',
      };

      // Fire two simultaneous registration requests
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One request should succeed (201) and the duplicate must return 409 (not 500!)
      assert.deepStrictEqual(statuses, [201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      const data = await conflictRes.json();
      assert.strictEqual(data.error, 'Email already registered');
    });

    it('rejects CORS requests from untrusted external origins', async () => {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://evil-untrusted-site.com' },
      });
      // Express CORS middleware either omits the allow-origin header or sends an error
      assert.notStrictEqual(response.headers.get('access-control-allow-origin'), 'https://evil-untrusted-site.com');
    });

    it('returns structured 404 error for non-existent routes', async () => {
      const response = await fetch(`${baseUrl}/api/unregistered/random/path`);
      assert.strictEqual(response.status, 404);
      const data = await response.json();
      assert.strictEqual(data.error, 'Route not found');
    });
  });

  describe('Stage 2: Data Integrity & Persistence', () => {
    let authCookie: string;

    before(async () => {
      const email = `stage2-user-${Date.now()}@fintarg.example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stage2 Test User',
          email,
          password: 'Password123!',
          workMode: 'salary',
        }),
      });
      assert.strictEqual(regRes.status, 201);
      const cookieHeader = regRes.headers.get('set-cookie');
      assert.ok(cookieHeader, 'Expected auth cookie to be set');
      authCookie = cookieHeader;
    });

    it('persists a loan with startDate and dueDate, and reloads it intact (Gate 2)', async () => {
      // 1. Create a loan
      const createRes = await fetch(`${baseUrl}/api/records/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          lender: 'National Bank',
          amount: 50000,
          rate: 12.5,
          method: 'simple',
          startDate: '2026-01-01',
          dueDate: '2026-12-31',
        }),
      });

      assert.strictEqual(createRes.status, 201);
      const created = await createRes.json();
      assert.strictEqual(created.data.lender, 'National Bank');
      assert.strictEqual(created.data.principalCents, 5000000);
      assert.strictEqual(created.data.startDate, '2026-01-01');
      assert.strictEqual(created.data.dueDate, '2026-12-31');

      // 2. Also test loan with empty dueDate
      const emptyDueRes = await fetch(`${baseUrl}/api/records/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          lender: 'Private Friend',
          amount: 15000,
          rate: 0,
          method: 'simple',
          startDate: '2026-02-01',
          dueDate: '',
        }),
      });
      assert.strictEqual(emptyDueRes.status, 201);

      // 3. Reload list (GET /api/records/loans)
      const listRes = await fetch(`${baseUrl}/api/records/loans`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.ok(Array.isArray(listData.data));
      const found = listData.data.find((l: any) => l._id === created.data._id);
      assert.ok(found, 'Created loan must be present after reload');
      assert.strictEqual(found.lender, 'National Bank');
      assert.strictEqual(found.startDate, '2026-01-01');
      assert.strictEqual(found.dueDate, '2026-12-31');
    });

    it('persists a pawned item with redemptionDate support', async () => {
      const createRes = await fetch(`${baseUrl}/api/records/pawnedItems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          description: '22K Gold Necklace',
          amountReceived: 80000,
          interestRate: 14,
          nextDue: '2026-04-01',
          redemptionDate: '2026-09-01',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const created = await createRes.json();
      assert.strictEqual(created.data.description, '22K Gold Necklace');
      assert.strictEqual(created.data.redemptionDate, '2026-09-01');
    });

    it('retains savings goal progress and contributions when editing the goal (Gate 2)', async () => {
      // 1. Create goal
      const createRes = await fetch(`${baseUrl}/api/records/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'House Downpayment',
          dailyAmount: 500,
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const goal = (await createRes.json()).data;
      assert.strictEqual(goal.savedAmountCents, 0);
      assert.deepStrictEqual(goal.contributions, []);

      // 2. Add contributions
      const contribRes1 = await fetch(`${baseUrl}/api/records/goals/${goal._id}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          amount: 2500,
          date: '2026-01-10',
        }),
      });
      assert.strictEqual(contribRes1.status, 200);

      const contribRes2 = await fetch(`${baseUrl}/api/records/goals/${goal._id}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          amount: 1500,
          date: '2026-01-20',
        }),
      });
      assert.strictEqual(contribRes2.status, 200);
      const withContribs = (await contribRes2.json()).data;
      assert.strictEqual(withContribs.savedAmountCents, 400000); // 4000 * 100
      assert.strictEqual(withContribs.contributions.length, 2);

      // 3. Edit goal details (e.g. rename, change dailyAmount)
      const editRes = await fetch(`${baseUrl}/api/records/goals/${goal._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Dream House Downpayment (Updated)',
          dailyAmount: 600,
        }),
      });
      assert.strictEqual(editRes.status, 200);
      const edited = (await editRes.json()).data;

      // Crucial Gate Check: savedAmountCents and contributions must NOT be wiped!
      assert.strictEqual(edited.name, 'Dream House Downpayment (Updated)');
      assert.strictEqual(edited.savedAmountCents, 400000, 'savedAmountCents must not be reset to 0 on edit');
      assert.strictEqual(edited.contributions.length, 2, 'contributions array must not be wiped on edit');
    });

    it('persists and retrieves personal spending budget via /api/profile/personal-budget', async () => {
      // 1. Initial GET
      const getRes1 = await fetch(`${baseUrl}/api/profile/personal-budget`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(getRes1.status, 200);
      const initialData = await getRes1.json();
      assert.ok('budget' in initialData);

      // 2. PUT new budget
      const putRes = await fetch(`${baseUrl}/api/profile/personal-budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ budget: 75000 }),
      });
      assert.strictEqual(putRes.status, 200);
      const putData = await putRes.json();
      assert.strictEqual(putData.ok, true);
      assert.strictEqual(putData.budget, 75000);

      // 3. GET verify persistence
      const getRes2 = await fetch(`${baseUrl}/api/profile/personal-budget`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(getRes2.status, 200);
      const updatedData = await getRes2.json();
      assert.strictEqual(updatedData.budget, 75000);
    });

    it('rejects invalid month format on GET and PUT /api/profile/personal-budget (1.8)', async () => {
      // 1. Invalid month on GET
      const getBadRes = await fetch(`${baseUrl}/api/profile/personal-budget?month=not-a-month`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(getBadRes.status, 400);

      // 2. Invalid month on PUT
      const putBadRes = await fetch(`${baseUrl}/api/profile/personal-budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ budget: 50000, month: '2026-13' }),
      });
      assert.strictEqual(putBadRes.status, 400);
    });
  });

  describe('Stage 3: Backend Data Model (Phase 1)', () => {
    let userACookie: string;
    let userBCookie: string;
    let userABankAccountId: string;
    let userACardId: string;
    let userALoanId: string;
    let userAGoalId: string;

    before(async () => {
      // 1. Create User A
      const resA = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'User Alpha',
          email: `usera-${Date.now()}@fintarg.example.com`,
          password: 'Password123!',
          workMode: 'salary',
        }),
      });
      assert.strictEqual(resA.status, 201);
      userACookie = resA.headers.get('set-cookie')!;

      // 2. Create User B
      const resB = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'User Beta',
          email: `userb-${Date.now()}@fintarg.example.com`,
          password: 'Password123!',
          workMode: 'salary',
        }),
      });
      assert.strictEqual(resB.status, 201);
      userBCookie = resB.headers.get('set-cookie')!;
    });

    it('creates and manages bankAccounts and cards with validation', async () => {
      // 1. Create bank account
      const bankRes = await fetch(`${baseUrl}/api/records/bankAccounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          bankName: 'Commercial Bank',
          accountNumber: '1098273645',
          accountName: 'Main Salary Account',
          branch: 'Kollupitiya',
          accountType: 'savings',
          balance: 250000,
          currency: 'LKR',
          isDefault: true,
        }),
      });
      assert.strictEqual(bankRes.status, 201);
      const bankData = (await bankRes.json()).data;
      assert.strictEqual(bankData.bankName, 'Commercial Bank');
      assert.strictEqual(bankData.balanceCents, 25000000);
      userABankAccountId = bankData._id;

      // 2. Create linked card
      const cardRes = await fetch(`${baseUrl}/api/records/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          bankAccountId: userABankAccountId,
          cardName: 'Commercial Bank Visa Debit',
          cardType: 'debit',
          last4: '9876',
          expiryMonth: 11,
          expiryYear: 2028,
        }),
      });
      assert.strictEqual(cardRes.status, 201);
      const cardData = (await cardRes.json()).data;
      assert.strictEqual(cardData.cardName, 'Commercial Bank Visa Debit');
      assert.strictEqual(cardData.last4, '9876');
      userACardId = cardData._id;
    });

    it('extends incomes and expenses with paymentMethod and bankAccount, updating balance and transactions', async () => {
      // 1. Add income linked to bank account
      const incomeRes = await fetch(`${baseUrl}/api/records/incomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          source: 'Consulting Gig',
          type: 'other',
          amount: 50000,
          frequency: 'one-time',
          date: '2026-10-01',
          paymentMethod: 'bank_transfer',
          bankAccountId: userABankAccountId,
        }),
      });
      assert.strictEqual(incomeRes.status, 201);

      // 2. Add expense linked to bank account and card
      const expenseRes = await fetch(`${baseUrl}/api/records/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          date: '2026-10-05',
          amount: 15000,
          category: 'Hardware',
          note: 'Office monitor',
          paymentMethod: 'card',
          bankAccountId: userABankAccountId,
          cardId: userACardId,
        }),
      });
      assert.strictEqual(expenseRes.status, 201);

      // 3. Verify bank account balance: 250,000 + 50,000 - 15,000 = 285,000 (28,500,000 cents)
      const listBanks = await fetch(`${baseUrl}/api/records/bankAccounts`, {
        headers: { Cookie: userACookie },
      });
      assert.strictEqual(listBanks.status, 200);
      const accounts = (await listBanks.json()).data;
      const account = accounts.find((a: any) => a._id === userABankAccountId);
      assert.ok(account);
      assert.strictEqual(account.balanceCents, 28500000);
    });

    it('creates and manages reworked financePayments (cheque and standing orders)', async () => {
      const chequeRes = await fetch(`${baseUrl}/api/records/financePayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          lender: 'ABC Leasing',
          amount: 35000,
          dueDay: 15,
          monthsRemaining: 24,
          paymentKind: 'cheque',
          chequeNumber: 'CHQ-55019',
          bankAccountId: userABankAccountId,
        }),
      });
      assert.strictEqual(chequeRes.status, 201);
      const chequeData = (await chequeRes.json()).data;
      assert.strictEqual(chequeData.paymentKind, 'cheque');
      assert.strictEqual(chequeData.chequeNumber, 'CHQ-55019');

      const soRes = await fetch(`${baseUrl}/api/records/financePayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          lender: 'Insurance Provider',
          amount: 8500,
          dueDay: 1,
          monthsRemaining: 12,
          paymentKind: 'standing_order',
          bankAccountId: userABankAccountId,
        }),
      });
      assert.strictEqual(soRes.status, 201);
      const soData = (await soRes.json()).data;
      assert.strictEqual(soData.paymentKind, 'standing_order');
    });

    it('creates loan with reducing balance math and records repayment history', async () => {
      // 1. Create reducing_balance loan: 100,000 at 12% for 12 months
      const loanRes = await fetch(`${baseUrl}/api/records/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          lender: 'Commercial Bank Loan',
          amount: 100000,
          rate: 12,
          method: 'reducing_balance',
          interestBasis: 'annual',
          tenureMonths: 12,
          startDate: '2026-01-01',
          dueDate: '2026-12-31',
        }),
      });
      assert.strictEqual(loanRes.status, 201);
      const loanData = (await loanRes.json()).data;
      userALoanId = loanData._id;

      // Check loan math calculations match test vectors:
      // Monthly EMI: 8,884.88 -> 888488 cents
      // Total Interest: 6,618.55 -> 661855 cents
      assert.strictEqual(loanData.monthlyPaymentCents, 888488);
      assert.strictEqual(loanData.totalInterestCents, 661855);

      // 2. Record repayment with date and note
      const repayRes = await fetch(`${baseUrl}/api/records/loans/${userALoanId}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          amount: 8884.88,
          date: '2026-02-01',
          note: 'Installment #1',
        }),
      });
      assert.strictEqual(repayRes.status, 200);
      const updatedLoan = (await repayRes.json()).data;
      assert.strictEqual(updatedLoan.balanceCents, 10000000 - 888488);
      assert.strictEqual(updatedLoan.repayments.length, 1);
      assert.strictEqual(updatedLoan.repayments[0].note, 'Installment #1');
      assert.strictEqual(updatedLoan.repayments[0].amountCents, 888488);
    });

    it('creates reworked goals with targetAmount and targetDate and adds contributions', async () => {
      const goalRes = await fetch(`${baseUrl}/api/records/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          name: 'Home Renovation',
          targetAmount: 500000,
          targetDate: '2027-06-30',
        }),
      });
      assert.strictEqual(goalRes.status, 201);
      const goalData = (await goalRes.json()).data;
      userAGoalId = goalData._id;
      assert.strictEqual(goalData.targetAmountCents, 50000000);
      assert.strictEqual(goalData.endDate, '2027-06-30');

      // Add contribution
      const contribRes = await fetch(`${baseUrl}/api/records/goals/${userAGoalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          amount: 25000,
          date: '2026-10-09',
          note: 'Q3 savings',
        }),
      });
      assert.strictEqual(contribRes.status, 200);
      const updatedGoal = (await contribRes.json()).data;
      assert.strictEqual(updatedGoal.savedAmountCents, 2500000);
      assert.strictEqual(updatedGoal.contributions[0].note, 'Q3 savings');
    });

    it('provides transactions-history endpoint with filters and running totals', async () => {
      // 1. Fetch via /api/transactions/history
      const historyRes = await fetch(`${baseUrl}/api/transactions/history`, {
        headers: { Cookie: userACookie },
      });
      assert.strictEqual(historyRes.status, 200);
      const historyData = await historyRes.json();
      assert.ok(Array.isArray(historyData.transactions));
      assert.ok(historyData.transactions.length >= 2); // income + expense created earlier
      assert.ok(historyData.summary);
      assert.strictEqual(historyData.summary.totalIncomeCents, 5000000);
      assert.strictEqual(historyData.summary.totalExpenseCents, 1500000 + 888488);
      assert.strictEqual(historyData.summary.netCents, 5000000 - (1500000 + 888488));

      // 2. Fetch with filter by bankAccountId
      const filterRes = await fetch(`${baseUrl}/api/transactions/history?bankAccountId=${userABankAccountId}`, {
        headers: { Cookie: userACookie },
      });
      assert.strictEqual(filterRes.status, 200);
      const filteredData = await filterRes.json();
      assert.strictEqual(filteredData.transactions.length, 2);
    });

    it('enforces multi-tenant data isolation: User B cannot view or mutate User A data', async () => {
      // 1. User B lists bank accounts -> User A bank account not visible
      const bAccountsRes = await fetch(`${baseUrl}/api/records/bankAccounts`, {
        headers: { Cookie: userBCookie },
      });
      assert.strictEqual(bAccountsRes.status, 200);
      const bAccounts = (await bAccountsRes.json()).data;
      assert.strictEqual(bAccounts.length, 0);

      // 2. User B tries to update User A loan -> 404
      const bPatchLoanRes = await fetch(`${baseUrl}/api/records/loans/${userALoanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
        body: JSON.stringify({ lender: 'Hacked Lender' }),
      });
      assert.strictEqual(bPatchLoanRes.status, 404);

      // 3. User B tries to delete User A loan -> 404
      const bDeleteLoanRes = await fetch(`${baseUrl}/api/records/loans/${userALoanId}`, {
        method: 'DELETE',
        headers: { Cookie: userBCookie },
      });
      assert.strictEqual(bDeleteLoanRes.status, 404);

      // 4. User B tries to contribute to User A goal -> 404
      const bContribGoalRes = await fetch(`${baseUrl}/api/records/goals/${userAGoalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
        body: JSON.stringify({ amount: 1000, date: '2026-10-10' }),
      });
      assert.strictEqual(bContribGoalRes.status, 404);

      // 5. User B transactions history has 0 records
      const bHistoryRes = await fetch(`${baseUrl}/api/transactions/history`, {
        headers: { Cookie: userBCookie },
      });
      assert.strictEqual(bHistoryRes.status, 200);
      const bHistory = await bHistoryRes.json();
      assert.strictEqual(bHistory.transactions.length, 0);
      assert.strictEqual(bHistory.summary.totalIncomeCents, 0);
      assert.strictEqual(bHistory.summary.totalExpenseCents, 0);
    });
  });

  describe('Session Revocation & Password Lifecycle (tokenVersion)', () => {
    const testEmail = 'session-revoke-user@example.com';
    const initialPassword = 'InitialSecretPassword123!';
    const updatedPassword = 'NewSecretPassword456!';

    it('manages password change, tokenVersion bumping, and session revocation', async () => {
      // 1. Register test user
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Session Revoke Tester',
          email: testEmail,
          password: initialPassword,
          workMode: 'salary',
        }),
      });
      assert.strictEqual(regRes.status, 201);
      const sessionCookie1 = regRes.headers.get('set-cookie')?.split(';')[0] || '';
      assert.ok(sessionCookie1.includes('fintarg_token'));

      // 2. Verify session 1 works
      const meRes1 = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie1 },
      });
      assert.strictEqual(meRes1.status, 200);

      // 3. Reject password change with incorrect current password
      const badChangeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie1 },
        body: JSON.stringify({
          currentPassword: 'WrongPassword123!',
          newPassword: updatedPassword,
        }),
      });
      assert.strictEqual(badChangeRes.status, 400);

      // 4. Change password with correct credentials
      const goodChangeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie1 },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
        }),
      });
      assert.strictEqual(goodChangeRes.status, 200);
      const sessionCookie2 = goodChangeRes.headers.get('set-cookie')?.split(';')[0] || '';
      assert.ok(sessionCookie2.includes('fintarg_token'));

      // 5. Old session cookie 1 is now revoked
      const meResOld = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie1 },
      });
      assert.strictEqual(meResOld.status, 401);
      const oldErr = await meResOld.json();
      assert.ok(oldErr.error?.includes('revoked'));

      // 6. New session cookie 2 is valid
      const meResNew = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie2 },
      });
      assert.strictEqual(meResNew.status, 200);

      // 7. Logout-all invalidates session cookie 2
      const logoutAllRes = await fetch(`${baseUrl}/api/auth/logout-all`, {
        method: 'POST',
        headers: { Cookie: sessionCookie2 },
      });
      assert.strictEqual(logoutAllRes.status, 200);

      // 8. Session cookie 2 is now rejected
      const meAfterLogoutAll = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie2 },
      });
      assert.strictEqual(meAfterLogoutAll.status, 401);

      // 9. Login with new password succeeds
      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: updatedPassword,
        }),
      });
      assert.strictEqual(newLoginRes.status, 200);
    });

    it('locks account after 5 failed attempts and resets counter when lockout period expires', async () => {
      const lockEmail = 'lockout-test@example.com';
      const lockPass = 'ValidSecretPass123!';

      // 1. Register user
      const reg = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Lockout Tester',
          email: lockEmail,
          password: lockPass,
          workMode: 'salary',
        }),
      });
      assert.strictEqual(reg.status, 201);

      // 2. Fail login 4 times -> 401 each time
      for (let i = 0; i < 4; i++) {
        const failRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: lockEmail, password: 'WrongPassword!' }),
        });
        assert.strictEqual(failRes.status, 401);
      }

      // 3. 5th failure triggers lockout
      const fifthFail = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockEmail, password: 'WrongPassword!' }),
      });
      assert.strictEqual(fifthFail.status, 401);

      // 4. 6th attempt while locked -> 429 Too Many Requests
      const lockedAttempt = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockEmail, password: lockPass }),
      });
      assert.strictEqual(lockedAttempt.status, 429);
      const lockedData = await lockedAttempt.json();
      assert.ok(lockedData.error.includes('temporarily locked'));

      // 5. Simulate lockout expiration by updating lockedUntil in database
      const { UserModel } = await import('../models/User');
      await UserModel.updateOne(
        { email: lockEmail },
        { $set: { lockedUntil: new Date(Date.now() - 5000) } }
      );

      // 6. After expiry, failed attempt starts fresh at 1 failure and does NOT immediately relock
      const postExpiryFail = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockEmail, password: 'WrongPasswordAgain!' }),
      });
      assert.strictEqual(postExpiryFail.status, 401);

      const userDoc = await UserModel.findOne({ email: lockEmail }).lean();
      assert.strictEqual((userDoc as any).failedLoginAttempts, 1);
      assert.strictEqual((userDoc as any).lockedUntil, undefined);

      // 7. Successful login with valid password succeeds
      const postExpirySuccess = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockEmail, password: lockPass }),
      });
      assert.strictEqual(postExpirySuccess.status, 200);

      const userDocAfterSuccess = await UserModel.findOne({ email: lockEmail }).lean();
      assert.strictEqual((userDocAfterSuccess as any).failedLoginAttempts, 0);
    });

    it('returns uniform 401 for non-existent email and 200 for forgot password without leaking', async () => {
      const nonExistentEmail = 'nobody-here@example.com';

      // 1. Non-existent login returns 401
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonExistentEmail, password: 'AnyPassword123!' }),
      });
      assert.strictEqual(loginRes.status, 401);
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.error, 'Invalid email or password');

      // 2. Forgot password returns ok: true without disclosing whether email exists
      const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonExistentEmail }),
      });
      assert.strictEqual(forgotRes.status, 200);
      const forgotData = await forgotRes.json();
      assert.strictEqual(forgotData.ok, true);
    });

    it('atomically consumes reset token, invalidates alternate pending tokens, and revokes active sessions', async () => {
      const resetUserEmail = 'atomic-reset-user@example.com';
      const initialPassword = 'BeforeResetPassword123!';
      const brandNewPassword = 'AfterResetPassword999!';

      // 1. Register and login
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Atomic Reset Tester',
          email: resetUserEmail,
          password: initialPassword,
          workMode: 'salary',
        }),
      });
      assert.strictEqual(regRes.status, 201);
      const activeCookie = regRes.headers.get('set-cookie')?.split(';')[0] || '';

      // 2. Session cookie is valid
      const meBeforeReset = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: activeCookie },
      });
      assert.strictEqual(meBeforeReset.status, 200);

      // 3. Create two pending reset tokens in DB
      const { UserModel } = await import('../models/User');
      const { PasswordResetModel } = await import('../models/PasswordReset');
      const { randomBytes, createHash } = await import('node:crypto');

      const userDoc = await UserModel.findOne({ email: resetUserEmail });
      assert.ok(userDoc);

      const rawToken1 = randomBytes(32).toString('hex');
      const rawToken2 = randomBytes(32).toString('hex');

      await PasswordResetModel.create([
        {
          userId: userDoc._id,
          tokenHash: createHash('sha256').update(rawToken1).digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        },
        {
          userId: userDoc._id,
          tokenHash: createHash('sha256').update(rawToken2).digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        },
      ]);

      // 4. Apply password reset with token 1
      const resetRes1 = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken1,
          newPassword: brandNewPassword,
        }),
      });
      assert.strictEqual(resetRes1.status, 200);

      // 5. Token 1 cannot be reused
      const replayRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken1,
          newPassword: brandNewPassword,
        }),
      });
      assert.strictEqual(replayRes.status, 400);

      // 6. Token 2 has been invalidated as well
      const token2Res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken2,
          newPassword: brandNewPassword,
        }),
      });
      assert.strictEqual(token2Res.status, 400);

      // 7. Old active session has been revoked
      const meAfterReset = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: activeCookie },
      });
      assert.strictEqual(meAfterReset.status, 401);

      // 8. User can sign in with new password
      const loginNewRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetUserEmail,
          password: brandNewPassword,
        }),
      });
      assert.strictEqual(loginNewRes.status, 200);
    });
  });

  describe('File Upload Hardening, Magic Bytes & Limits (3.5)', () => {
    let fileUserCookie: string;

    before(async () => {
      const reg = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Files Tester',
          email: 'files-tester@example.com',
          password: 'Password123!',
          workMode: 'salary',
        }),
      });
      assert.strictEqual(reg.status, 201);
      fileUserCookie = reg.headers.get('set-cookie')?.split(';')[0] || '';
    });

    it('rejects spoofed files whose magic bytes do not match allowed formats with 415', async () => {
      const fakePng = Buffer.from('not really a png file at all');
      const res = await fetch(`${baseUrl}/api/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          Cookie: fileUserCookie,
        },
        body: fakePng,
      });
      assert.strictEqual(res.status, 415);
      const data = await res.json();
      assert.ok(data.error.includes('signature mismatch'));
    });

    it('accepts real PNG image and sets inline disposition and nosniff headers on download', async () => {
      const realPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      const uploadRes = await fetch(`${baseUrl}/api/files?purpose=avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          Cookie: fileUserCookie,
        },
        body: realPng,
      });
      assert.strictEqual(uploadRes.status, 201);
      const { id } = await uploadRes.json();
      assert.ok(id);

      const downloadRes = await fetch(`${baseUrl}/api/files/${id}`, {
        headers: { Cookie: fileUserCookie },
      });
      assert.strictEqual(downloadRes.status, 200);
      assert.strictEqual(downloadRes.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(downloadRes.headers.get('content-type'), 'image/png');
      assert.ok(downloadRes.headers.get('content-disposition')?.includes('inline'));
    });

    it('accepts real WebP image and sets image/webp mimeType', async () => {
      const realWebp = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // file length
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20, // VP8 chunk
      ]);
      const uploadRes = await fetch(`${baseUrl}/api/files?purpose=avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/webp',
          Cookie: fileUserCookie,
        },
        body: realWebp,
      });
      assert.strictEqual(uploadRes.status, 201);
      const { id, mimeType } = await uploadRes.json();
      assert.strictEqual(mimeType, 'image/webp');

      const downloadRes = await fetch(`${baseUrl}/api/files/${id}`, {
        headers: { Cookie: fileUserCookie },
      });
      assert.strictEqual(downloadRes.status, 200);
      assert.strictEqual(downloadRes.headers.get('content-type'), 'image/webp');
      assert.ok(downloadRes.headers.get('content-disposition')?.includes('inline'));
    });

    it('rejects non-image when uploaded with ?purpose=avatar', async () => {
      const realPdf = Buffer.from('%PDF-1.4 dummy pdf document content');
      const res = await fetch(`${baseUrl}/api/files?purpose=avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          Cookie: fileUserCookie,
        },
        body: realPdf,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Avatar must be a valid image file'));
    });

    it('serves docx files with Content-Disposition: attachment for security', async () => {
      const realDocx = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00]);
      const uploadRes = await fetch(`${baseUrl}/api/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          Cookie: fileUserCookie,
        },
        body: realDocx,
      });
      assert.strictEqual(uploadRes.status, 201);
      const { id } = await uploadRes.json();

      const downloadRes = await fetch(`${baseUrl}/api/files/${id}`, {
        headers: { Cookie: fileUserCookie },
      });
      assert.strictEqual(downloadRes.status, 200);
      assert.strictEqual(downloadRes.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(downloadRes.headers.get('content-disposition')?.includes('attachment'));
    });

    it('enforces avatar 2MB size limit and document 4MB size limit', async () => {
      // 1. Avatar exceeding 2MB
      const bigAvatar = Buffer.alloc(2 * 1024 * 1024 + 1024);
      bigAvatar[0] = 0x89;
      bigAvatar[1] = 0x50;
      bigAvatar[2] = 0x4E;
      bigAvatar[3] = 0x47;
      bigAvatar[4] = 0x0D;
      bigAvatar[5] = 0x0A;
      bigAvatar[6] = 0x1A;
      bigAvatar[7] = 0x0A;

      const avatarRes = await fetch(`${baseUrl}/api/files?purpose=avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          Cookie: fileUserCookie,
        },
        body: bigAvatar,
      });
      assert.strictEqual(avatarRes.status, 400);
      const avatarData = await avatarRes.json();
      assert.ok(avatarData.error.includes('exceeds the 2 MB limit'));

      // 2. Document exceeding 4MB
      const bigDoc = Buffer.alloc(4 * 1024 * 1024 + 1024);
      bigDoc[0] = 0x25;
      bigDoc[1] = 0x50;
      bigDoc[2] = 0x44;
      bigDoc[3] = 0x46; // %PDF

      const docRes = await fetch(`${baseUrl}/api/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          Cookie: fileUserCookie,
        },
        body: bigDoc,
      });
      assert.strictEqual(docRes.status, 400);
      const docData = await docRes.json();
      assert.ok(docData.error.includes('exceeds the 4 MB limit'));
    });
  });
});

