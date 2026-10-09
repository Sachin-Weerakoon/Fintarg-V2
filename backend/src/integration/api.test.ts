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
});

