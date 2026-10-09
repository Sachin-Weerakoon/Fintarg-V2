import { describe, expect, it } from 'vitest';
import { formatCurrency, formatRs } from './formatCurrency';

describe('formatCurrency utility', () => {
  it('formats Sri Lankan Rupees (LKR) with commas and currency symbol', () => {
    const formatted = formatCurrency(150000);
    expect(formatted).toMatch(/150,000/);
  });

  it('formats zero correctly', () => {
    const formatted = formatCurrency(0);
    expect(formatted).toMatch(/0\.00/);
  });

  it('formats decimals correctly up to 2 fraction digits', () => {
    const formatted = formatCurrency(12345.67);
    expect(formatted).toMatch(/12,345\.67/);
  });

  it('formats negative amounts properly', () => {
    const formatted = formatCurrency(-500);
    expect(formatted).toMatch(/-.*500/);
  });
});

describe('formatRs utility', () => {
  it('formats positive rupee values with comma grouping', () => {
    expect(formatRs(5000)).toBe('Rs. 5,000');
    expect(formatRs(150000)).toBe('Rs. 150,000');
    expect(formatRs(2500000)).toBe('Rs. 2,500,000');
  });

  it('formats zero correctly', () => {
    expect(formatRs(0)).toBe('Rs. 0');
    expect(formatRs(-0)).toBe('Rs. 0');
  });

  it('formats negative rupee values with true Unicode minus sign (U+2212)', () => {
    expect(formatRs(-5000)).toBe('\u2212Rs. 5,000');
    expect(formatRs(-12500)).toBe('\u2212Rs. 12,500');
  });

  it('handles invalid numbers gracefully', () => {
    expect(formatRs(NaN)).toBe('Rs. 0');
    expect(formatRs(Infinity)).toBe('Rs. 0');
  });
});
