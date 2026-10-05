import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from './errors';

describe('Error Middleware & HttpError', () => {
  it('instantiates HttpError with status and message', () => {
    const error = new HttpError(404, 'User not found');
    assert.strictEqual(error.statusCode, 404);
    assert.strictEqual(error.status, 404);
    assert.strictEqual(error.message, 'User not found');
    assert.strictEqual(error.name, 'HttpError');
    assert.ok(error instanceof Error);
  });

  it('handles 401 Unauthorized and 503 Database Unavailable statuses', () => {
    const err401 = new HttpError(401, 'Unauthorized');
    const err503 = new HttpError(503, 'Database temporarily unavailable');

    assert.strictEqual(err401.statusCode, 401);
    assert.strictEqual(err401.status, 401);
    assert.strictEqual(err503.statusCode, 503);
    assert.strictEqual(err503.status, 503);
  });
});
