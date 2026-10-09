/**
 * Formats a currency amount into Sri Lankan Rupee display format with proper minus sign (U+2212).
 * e.g. 5000 -> "Rs. 5,000", -5000 -> "−Rs. 5,000", 0 -> "Rs. 0"
 */
export function formatRs(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return 'Rs. 0';
  const rounded = Math.round(amount);
  if (rounded === 0 || Object.is(rounded, -0)) return 'Rs. 0';
  const isNegative = rounded < 0;
  const numStr = Math.abs(rounded).toLocaleString('en-LK');
  return isNegative ? `\u2212Rs. ${numStr}` : `Rs. ${numStr}`;
}

/**
 * Standard international currency formatter for en-LK locale.
 */
export function formatCurrency(amount: number, currency = 'LKR'): string {
  if (isNaN(amount) || !isFinite(amount)) return '0.00';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}