import { describe, expect, it } from 'vitest';
import { passwordProblem } from './passwordPolicy';

describe('passwordProblem', () => {
  it('accepts a mix of letters, numbers and special characters', () => {
    expect(passwordProblem('Pass@1234')).toBeNull();
  });

  it('names the first missing ingredient', () => {
    expect(passwordProblem('Ab1!')).toBe('Password must be at least 8 characters.');
    expect(passwordProblem('12345678!')).toBe('Password must include a letter.');
    expect(passwordProblem('Password!')).toBe('Password must include a number.');
    expect(passwordProblem('Password1')).toBe('Password must include a special character.');
    expect(passwordProblem('a1!' + 'x'.repeat(126))).toBe('Password must be at most 128 characters.');
  });
});
