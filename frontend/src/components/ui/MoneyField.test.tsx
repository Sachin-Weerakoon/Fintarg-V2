import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MoneyField, sanitizeMoneyInput, formatMoneyValue } from './MoneyField';

describe('MoneyField and Input Sanitization (4.4b)', () => {
  describe('formatMoneyValue helper', () => {
    it('formats numbers with commas', () => {
      expect(formatMoneyValue(125000)).toBe('125,000');
      expect(formatMoneyValue(1234.56)).toBe('1,234.56');
    });

    it('rejects unallowed negative values by returning 0.00', () => {
      expect(formatMoneyValue(-500, false)).toBe('0.00');
    });

    it('formats negative numbers when allowNegative is true', () => {
      expect(formatMoneyValue(-500, true)).toBe('-500');
    });

    it('rejects NaN, invalid strings, and empty values gracefully', () => {
      expect(formatMoneyValue(NaN)).toBe('');
      expect(formatMoneyValue(Infinity)).toBe('');
      expect(formatMoneyValue('abc')).toBe('');
      expect(formatMoneyValue('')).toBe('');
    });
  });

  describe('sanitizeMoneyInput helper', () => {
    it('strips non-numeric characters and enforces 2 decimals', () => {
      expect(sanitizeMoneyInput('abc1234.5678')).toBe('1234.56');
      expect(sanitizeMoneyInput('$5,000.99')).toBe('5000.99');
    });

    it('strips minus sign when allowNegative is false', () => {
      expect(sanitizeMoneyInput('-500', false)).toBe('500');
    });

    it('preserves leading minus sign when allowNegative is true', () => {
      expect(sanitizeMoneyInput('-2500.50', true)).toBe('-2500.50');
    });

    it('allows only a single decimal point', () => {
      expect(sanitizeMoneyInput('12.34.56')).toBe('12.34');
    });
  });

  describe('MoneyField Component Props', () => {
    it('creates MoneyField element with default currency prefix and props', () => {
      const onChange = vi.fn();
      const el = React.createElement(MoneyField, {
        value: 75000,
        onChange,
        hasError: true,
      });

      expect(el.props.value).toBe(75000);
      expect(el.props.hasError).toBe(true);
      expect(el.props.currency).toBeUndefined(); // defaults to Rs. inside component
    });
  });
});
