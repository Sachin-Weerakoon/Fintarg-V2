import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

describe('Password Utilities', () => {
  it('hashes password with a random salt and verifies correctly', async () => {
    const password = 'SuperSecretPassword123!';
    const { salt, hash } = await hashPassword(password);

    assert.ok(salt, 'Salt should be generated');
    assert.ok(hash, 'Hash should be generated');
    assert.strictEqual(salt.length, 32, 'Salt should be 16 bytes hex (32 characters)');

    const isValid = await verifyPassword(password, salt, hash);
    assert.strictEqual(isValid, true, 'Correct password should verify successfully');
  });

  it('rejects an incorrect password', async () => {
    const password = 'CorrectPassword123!';
    const wrongPassword = 'WrongPassword456!';
    const { salt, hash } = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, salt, hash);
    assert.strictEqual(isValid, false, 'Wrong password should fail verification');
  });

  it('produces different hashes for the same password with different salts', async () => {
    const password = 'IdenticalPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.notStrictEqual(hash1.salt, hash2.salt);
    assert.notStrictEqual(hash1.hash, hash2.hash);
  });
});
