/**
 * Date and calendar month mathematics.
 */

/**
 * Returns the exact number of days in the month for a given month or date string ("YYYY-MM", "YYYY-MM-DD") or Date.
 * Accurately handles leap years (e.g. Feb 2024 = 29 days, Feb 2026 = 28 days).
 */
export function getDaysInMonth(monthOrDate?: string | Date): number {
  if (!monthOrDate) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  if (monthOrDate instanceof Date) {
    return new Date(monthOrDate.getFullYear(), monthOrDate.getMonth() + 1, 0).getDate();
  }
  const parts = String(monthOrDate).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!y || !m || m < 1 || m > 12) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  return new Date(y, m, 0).getDate();
}
