import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { app } from '../app';

describe('Backend API Integration Tests', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
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

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100).unref();
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

    it('configures CORS for vercel.app domains', async () => {
      const response = await fetch(`${baseUrl}/api`, {
        headers: { Origin: 'https://preview-deploy.vercel.app' },
      });
      assert.strictEqual(response.headers.get('access-control-allow-origin'), 'https://preview-deploy.vercel.app');
      assert.strictEqual(response.headers.get('access-control-allow-credentials'), 'true');
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
      assert.strictEqual(historyData.summary.totalExpenseCents, 1500000);
      assert.strictEqual(historyData.summary.netCents, 3500000);

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
});

