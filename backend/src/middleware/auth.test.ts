import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireBusinessPlan } from './auth';
import { HttpError } from './errors';

describe('requireBusinessPlan Middleware', () => {
  it('allows non-business record kinds through without checking plan', async () => {
    let nextCalled = false;
    let nextError: any = null;

    const req: any = {
      params: { kind: 'expenses' },
      userRecord: { plan: 'basic' },
    };
    const res: any = {};
    const next = (err?: any) => {
      nextCalled = true;
      nextError = err;
    };

    await requireBusinessPlan(req, res, next);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(nextError, undefined);
  });

  it('blocks basic plan user on business kinds with 403 and PLAN_REQUIRED code', async () => {
    const businessKinds = ['companies', 'businessBranches', 'ownerDraws', 'agreements'];

    for (const kind of businessKinds) {
      let nextError: any = null;
      const req: any = {
        params: { kind },
        userRecord: { plan: 'basic' },
      };
      const res: any = {};
      const next = (err?: any) => {
        nextError = err;
      };

      await requireBusinessPlan(req, res, next);
      assert.ok(nextError instanceof HttpError, `Expected HttpError for kind ${kind}`);
      assert.strictEqual(nextError.statusCode, 403);
      assert.strictEqual(nextError.code, 'PLAN_REQUIRED');
      assert.strictEqual(nextError.message, 'This feature requires the Business edition');
      assert.deepStrictEqual(nextError.extra, { requiredPlan: 'business' });
    }
  });

  it('allows business plan user access to business record kinds', async () => {
    const businessKinds = ['companies', 'businessBranches', 'ownerDraws', 'agreements'];

    for (const kind of businessKinds) {
      let nextCalled = false;
      let nextError: any = null;
      const req: any = {
        params: { kind },
        userRecord: { plan: 'business' },
      };
      const res: any = {};
      const next = (err?: any) => {
        nextCalled = true;
        nextError = err;
      };

      await requireBusinessPlan(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(nextError, undefined);
    }
  });
});
