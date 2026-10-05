import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input and normalizes email', () => {
      const input = {
        name: 'Sachin Weerakoon',
        email: '  Sachin@Example.COM  ',
        password: 'Password123!',
        workMode: 'both',
      };

      const parsed = registerSchema.safeParse(input);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.name, 'Sachin Weerakoon');
        assert.strictEqual(parsed.data.email, 'sachin@example.com', 'Email should be lowercase and trimmed');
        assert.strictEqual(parsed.data.workMode, 'both');
      }
    });

    it('rejects short password less than 8 characters', () => {
      const input = {
        name: 'Sachin',
        email: 'sachin@example.com',
        password: 'short',
        workMode: 'salary',
      };

      const parsed = registerSchema.safeParse(input);
      assert.strictEqual(parsed.success, false);
    });

    it('rejects invalid email formats', () => {
      const input = {
        name: 'Sachin',
        email: 'not-an-email',
        password: 'Password123!',
        workMode: 'salary',
      };

      const parsed = registerSchema.safeParse(input);
      assert.strictEqual(parsed.success, false);
    });

    it('rejects invalid workMode', () => {
      const input = {
        name: 'Sachin',
        email: 'sachin@example.com',
        password: 'Password123!',
        workMode: 'invalid_mode',
      };

      const parsed = registerSchema.safeParse(input);
      assert.strictEqual(parsed.success, false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login credentials', () => {
      const input = {
        email: 'User@Domain.com',
        password: 'Password123!',
      };

      const parsed = loginSchema.safeParse(input);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.email, 'user@domain.com');
      }
    });

    it('rejects empty password', () => {
      const input = { email: 'user@domain.com', password: '' };
      const parsed = loginSchema.safeParse(input);
      assert.strictEqual(parsed.success, false);
    });
  });

  describe('forgotPasswordSchema & resetPasswordSchema', () => {
    it('validates forgot password email', () => {
      assert.strictEqual(forgotPasswordSchema.safeParse({ email: 'test@example.com' }).success, true);
      assert.strictEqual(forgotPasswordSchema.safeParse({ email: 'invalid' }).success, false);
    });

    it('validates reset password token length (min 32 chars) and password', () => {
      const valid = {
        token: 'a'.repeat(32),
        newPassword: 'NewSecurePassword123!',
      };
      assert.strictEqual(resetPasswordSchema.safeParse(valid).success, true);

      const invalidToken = {
        token: 'too_short',
        newPassword: 'NewSecurePassword123!',
      };
      assert.strictEqual(resetPasswordSchema.safeParse(invalidToken).success, false);
    });
  });
});
