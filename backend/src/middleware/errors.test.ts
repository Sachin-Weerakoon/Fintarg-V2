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

  it('errorHandler maps SyntaxError (malformed body) to 400', async () => {
    const { errorHandler } = await import('./errors');
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: any) {
        capturedJson = payload;
      },
    };

    const syntaxErr: any = new SyntaxError('Unexpected token in JSON');
    syntaxErr.status = 400;
    syntaxErr.body = '{"bad":';

    errorHandler(syntaxErr, {} as any, mockRes, () => {});
    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedJson.error, 'Malformed JSON payload');
  });

  it('errorHandler maps Mongoose ValidationError to 400 with details', async () => {
    const { errorHandler } = await import('./errors');
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: any) {
        capturedJson = payload;
      },
    };

    const valErr = {
      name: 'ValidationError',
      errors: {
        field1: { path: 'field1', message: 'field1 is required' },
      },
    };

    errorHandler(valErr as any, {} as any, mockRes, () => {});
    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedJson.error, 'Database validation failed');
    assert.strictEqual(capturedJson.details[0].path, 'field1');
  });

  it('errorHandler maps Mongoose CastError to 400', async () => {
    const { errorHandler } = await import('./errors');
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: any) {
        capturedJson = payload;
      },
    };

    const castErr = {
      name: 'CastError',
      path: '_id',
      value: 'invalid-id-123',
    };

    errorHandler(castErr as any, {} as any, mockRes, () => {});
    assert.strictEqual(capturedStatus, 400);
    assert.ok(capturedJson.error.includes('invalid-id-123'));
  });

  it('errorHandler maps unhandled error to 500 without leaking stack traces', async () => {
    const { errorHandler } = await import('./errors');
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: any) {
        capturedJson = payload;
      },
    };

    errorHandler(new Error('Secret internal db explosion'), {} as any, mockRes, () => {});
    assert.strictEqual(capturedStatus, 500);
    assert.strictEqual(capturedJson.error, 'Internal server error');
    assert.strictEqual(capturedJson.stack, undefined);
  });

  it('errorHandler maps HttpError with code and extra metadata (PLAN_REQUIRED)', async () => {
    const { errorHandler } = await import('./errors');
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: any) {
        capturedJson = payload;
      },
    };

    const planErr = new HttpError(403, 'This feature requires the Business edition', 'PLAN_REQUIRED', { requiredPlan: 'business' });
    errorHandler(planErr, {} as any, mockRes, () => {});
    assert.strictEqual(capturedStatus, 403);
    assert.strictEqual(capturedJson.error, 'This feature requires the Business edition');
    assert.strictEqual(capturedJson.code, 'PLAN_REQUIRED');
    assert.strictEqual(capturedJson.requiredPlan, 'business');
  });
});
