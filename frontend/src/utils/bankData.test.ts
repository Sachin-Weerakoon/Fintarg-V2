import { describe, expect, it } from 'vitest';
import { expiryProblem, isValidCardNumber } from './bankData';

describe('bank card rules', () => {
  it('isValidCardNumber accepts Luhn-valid numbers with or without spaces', () => {
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(isValidCardNumber('5555555555554444')).toBe(true);
    expect(isValidCardNumber('378282246310005')).toBe(true);
  });

  it('isValidCardNumber rejects bad checksums and lengths', () => {
    expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false);
    expect(isValidCardNumber('41111111111')).toBe(false);
    expect(isValidCardNumber('•••• •••• •••• 1111')).toBe(false);
  });

  it('expiryProblem keeps a card valid through its expiry month', () => {
    const now = new Date(2026, 9, 22); // 22 Oct 2026
    expect(expiryProblem('10/26', now)).toBeNull();
    expect(expiryProblem('12/30', now)).toBeNull();
    expect(expiryProblem('09/26', now)).toBe('This card has expired.');
    expect(expiryProblem('13/27', now)).toBe('Expiry month must be from 01 to 12.');
    expect(expiryProblem('1027', now)).toBe('Enter the expiry date as MM/YY.');
  });
});
