import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxyBackend, proxyBackendRequest } from './backendProxy';

describe('Frontend Backend Proxy Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles unreachable upstream by returning 503 Backend unavailable in proxyBackendRequest', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const request = new NextRequest('http://localhost:3000/api/backend/records/incomes', {
      method: 'GET',
    });

    const response = await proxyBackendRequest(request, '/api/records/incomes');
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({ error: 'Backend unavailable' });
  });

  it('forwards cookie, authorization, and custom headers to upstream in proxyBackend', async () => {
    let capturedHeaders: Headers | undefined;
    let capturedUrl: URL | undefined;
    let capturedBody: string | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = url as URL;
      capturedHeaders = new Headers(init?.headers);
      capturedBody = init?.body as string;

      return new Response(JSON.stringify({ ok: true, records: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'fintarg_token=jwt_sample_token; Path=/; HttpOnly; SameSite=Strict',
        },
      });
    });

    const request = new NextRequest('http://localhost:3000/api/backend/records/incomes', {
      method: 'POST',
      headers: {
        'cookie': 'fintarg_token=existing_token',
        'authorization': 'Bearer test_token',
        'x-cron-secret': 'secret_123',
      },
    });

    const response = await proxyBackend(request, '/api/records/incomes', { amount: 50000 });

    expect(response.status).toBe(200);
    expect(capturedUrl).toBeDefined();
    expect(capturedHeaders).toBeDefined();
    expect((capturedUrl as any)?.pathname).toBe('/api/records/incomes');
    expect((capturedHeaders as any)?.get('cookie')).toBe('fintarg_token=existing_token');
    expect((capturedHeaders as any)?.get('authorization')).toBe('Bearer test_token');
    expect((capturedHeaders as any)?.get('x-cron-secret')).toBe('secret_123');
    expect((capturedHeaders as any)?.get('content-type')).toBe('application/json');
    expect(capturedBody).toBe(JSON.stringify({ amount: 50000 }));

    // Verify Set-Cookie header is forwarded back
    expect(response.headers.get('set-cookie')).toBe('fintarg_token=jwt_sample_token; Path=/; HttpOnly; SameSite=Strict');
  });

  it('handles invalid non-JSON upstream response gracefully in proxyBackend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error HTML', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
    });

    const response = await proxyBackend(request, '/api/auth/login');
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body).toEqual({ error: 'Backend returned an invalid response' });
  });
});
