import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
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

    it('returns structured 404 error for non-existent routes', async () => {
      const response = await fetch(`${baseUrl}/api/unregistered/random/path`);
      assert.strictEqual(response.status, 404);
      const data = await response.json();
      assert.strictEqual(data.error, 'Route not found');
    });
  });
});
