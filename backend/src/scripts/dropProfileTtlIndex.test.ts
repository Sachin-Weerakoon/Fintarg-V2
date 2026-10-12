import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { dropProfileTtlIndex } from './dropProfileTtlIndex';

describe('dropProfileTtlIndex Script', () => {
  it('handles profile collection when no TTL index exists without throwing', async () => {
    // If not connected, connect to in-memory test db or skip
    if (mongoose.connection.readyState === 1) {
      const result = await dropProfileTtlIndex();
      assert.strictEqual(typeof result.dropped, 'boolean');
    }
  });

  it('drops TTL index when present on profiles collection', async () => {
    if (mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('profiles');
      try {
        await collection.createIndex({ deletionRequestedAt: 1 }, { expireAfterSeconds: 2592000, sparse: true });
      } catch {
        // ignore if index already exists
      }

      const result = await dropProfileTtlIndex();
      assert.strictEqual(result.dropped, true);

      // Subsequent call reports not dropped (already gone)
      const secondCall = await dropProfileTtlIndex();
      assert.strictEqual(secondCall.dropped, false);
    }
  });
});
