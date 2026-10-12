import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { runPropertyLedgerVerification } from './verifyLedger';

describe('Property-based Ledger Verification (2.11)', () => {
  let memoryServer: any = null;

  before(async () => {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
    await mongoose.connect(memoryServer.getUri(), { dbName: 'fintarg-property-verify-test' });
  });

  after(async () => {
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
  });

  it('runs randomized operations across accounts, loans, pawns, finances, goals, transfers with strictly zero balance drift', async () => {
    const result = await runPropertyLedgerVerification({
      iterations: 30,
      seed: 987654321,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.maxDriftCents, 0);
    assert.ok(result.totalOperations >= 30);
    assert.strictEqual(result.accountsChecked, 3);
  });
});
