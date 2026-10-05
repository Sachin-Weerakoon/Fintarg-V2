import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAccessToken, readAccessToken } from './jwt';

describe('JWT Utilities', () => {
  it('creates and verifies a valid JWT access token', () => {
    const userId = 'user_67890abcdef';
    const token = createAccessToken(userId);

    assert.ok(token, 'Token should be generated');
    assert.strictEqual(typeof token, 'string');

    const decoded = readAccessToken(token);
    assert.strictEqual(decoded.userId, userId, 'Decoded user ID should match original');
  });

  it('throws an error when verifying an invalid or tampered token', () => {
    const validToken = createAccessToken('user_123');
    const tamperedToken = validToken.slice(0, -5) + 'abcde';

    assert.throws(() => {
      readAccessToken(tamperedToken);
    });
  });

  it('throws an error when verifying an arbitrary malformed string', () => {
    assert.throws(() => {
      readAccessToken('malformed.token.value');
    });
  });
});
