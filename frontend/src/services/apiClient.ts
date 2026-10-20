export class ApiError extends Error {
  public status: number;
  public code?: string;
  public requiredPlan?: string;
  public payload?: unknown;
  public collection?: string;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      if (typeof obj.code === 'string') this.code = obj.code;
      if (typeof obj.requiredPlan === 'string') this.requiredPlan = obj.requiredPlan;
    }
  }
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null) as T | { error?: string; code?: string; requiredPlan?: string } | null;
  if (!response.ok) {
    const errorMsg = (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' && payload.error)
      ? payload.error
      : `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, payload);
  }
  return payload as T;
}