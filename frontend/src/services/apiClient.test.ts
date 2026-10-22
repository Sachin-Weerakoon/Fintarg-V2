import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './apiClient';

describe('apiErrorMessage', () => {
  it('prefers the first validation detail over the generic error', () => {
    const payload = { error: 'Validation failed', details: [{ path: 'password', message: 'Password must include a number.' }] };
    expect(apiErrorMessage(payload, 'fallback')).toBe('Password must include a number.');
  });

  it('names the field for terse zod defaults', () => {
    expect(apiErrorMessage({ error: 'Validation failed', details: [{ path: 'amount', message: 'Required' }] }, 'x')).toBe('amount: Required');
  });

  it('falls back to error, then to the fallback', () => {
    expect(apiErrorMessage({ error: 'Email already registered' }, 'x')).toBe('Email already registered');
    expect(apiErrorMessage(null, 'Network error')).toBe('Network error');
  });
});
