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

/**
 * The message to show for a failed API response. The server answers schema errors with a
 * generic "Validation failed" plus per-field `details`; the first detail is the useful part.
 */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const obj = payload as { error?: unknown; details?: unknown };
  if (Array.isArray(obj.details)) {
    const first = obj.details.find((d): d is { message: string; path?: string } => Boolean(d) && typeof (d as { message?: unknown }).message === 'string');
    // Our own messages are full sentences; zod defaults ("Required") need the field name.
    if (first) return first.path && !first.message.endsWith('.') ? `${first.path}: ${first.message}` : first.message;
  }
  return typeof obj.error === 'string' && obj.error ? obj.error : fallback;
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
    throw new ApiError(apiErrorMessage(payload, `Request failed with status ${response.status}`), response.status, payload);
  }
  return payload as T;
}