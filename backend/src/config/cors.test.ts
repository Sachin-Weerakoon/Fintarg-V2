import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isOriginAllowed, getAllowedOrigins } from '../app';

describe('CORS Allowed Origins Policy (3.1)', () => {
  it('includes configured FRONTEND_ORIGIN and APP_ORIGIN', () => {
    const origins = getAllowedOrigins();
    assert.ok(origins.includes('http://localhost:3000'));
    assert.ok(origins.includes('http://localhost:5000'));
  });

  it('allows exact configured origins', () => {
    assert.strictEqual(isOriginAllowed('http://localhost:3000'), true);
    assert.strictEqual(isOriginAllowed('http://localhost:5000'), true);
  });

  it('allows empty origin (direct server/curl requests)', () => {
    assert.strictEqual(isOriginAllowed(''), true);
  });

  it('rejects arbitrary external origins', () => {
    assert.strictEqual(isOriginAllowed('https://evil-hacker.com'), false);
    assert.strictEqual(isOriginAllowed('http://phishing.site'), false);
  });

  it('rejects arbitrary unconfigured vercel.app domains', () => {
    assert.strictEqual(isOriginAllowed('https://arbitrary-attacker.vercel.app'), false);
    assert.strictEqual(isOriginAllowed('https://preview-deployment.vercel.app'), false);
  });

  it('allows localhost in non-production environments', () => {
    assert.strictEqual(isOriginAllowed('http://localhost:3001', false), true);
    assert.strictEqual(isOriginAllowed('http://127.0.0.1:8080', false), true);
  });

  it('rejects unconfigured localhost in production environments', () => {
    assert.strictEqual(isOriginAllowed('http://localhost:9999', true), false);
    assert.strictEqual(isOriginAllowed('http://127.0.0.1:9999', true), false);
  });
});
