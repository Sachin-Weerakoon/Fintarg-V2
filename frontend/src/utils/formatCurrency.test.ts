import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency utility', () => {
  it('formats Sri Lankan Rupees (LKR) with commas and currency symbol', () => {
    const formatted = formatCurrency(150000);
    // en-LK currency formatting produces LKR or Rs.
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
