import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000';

export async function proxyBackend(request: NextRequest, path: string, body?: unknown) {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (cookie) headers.set('cookie', cookie);
  if (authorization) headers.set('authorization', authorization);
  if (cronSecret) headers.set('x-cron-secret', cronSecret);
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  if (realIp) headers.set('x-real-ip', realIp);
  if (body !== undefined) headers.set('content-type', 'application/json');

  const upstream = await fetch(new URL(path, backendUrl), {
    method: request.method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => ({ error: 'Backend returned an invalid response' }));
  const response = NextResponse.json(payload, { status: upstream.status });
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) response.headers.set('set-cookie', setCookie);
  return response;
}

export async function proxyBackendRequest(request: NextRequest, path: string) {
  try {
    const headers = new Headers();
    for (const name of ['cookie', 'authorization', 'x-cron-secret', 'content-type', 'x-forwarded-for', 'x-real-ip']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstream = await fetch(new URL(path, backendUrl), { method: request.method, headers, body, cache: 'no-store' });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'set-cookie']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}