/**
 * Returns YYYY-MM formatted string in local time, preventing UTC boundary shifts in Asia/Colombo.
 */
export function getLocalMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns YYYY-MM-DD in local time (not UTC), so "today" is right between 00:00 and 05:30 in Asia/Colombo.
 */
export function getLocalDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  return `${getLocalMonth(date)}-${day}`;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** True for a well-formed 'YYYY-MM' with month 01–12. */
export function isMonthKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}

/** 'YYYY-MM' -> { year, month (1–12) }, or null when malformed. */
export function parseMonth(value: string): { year: number; month: number } | null {
  if (!isMonthKey(value)) return null;
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Shift a 'YYYY-MM' by delta months (handles year boundaries in both directions). */
export function addMonths(value: string, delta: number): string {
  const p = parseMonth(value);
  if (!p) return value;
  const idx = p.year * 12 + (p.month - 1) + delta;
  return toMonthKey(Math.floor(idx / 12), (((idx % 12) + 12) % 12) + 1);
}

/** 'YYYY-MM' -> 'Oct 2026' (or 'October 2026' with style 'long'). */
export function formatMonth(value: string, style: 'short' | 'long' = 'short'): string {
  const p = parseMonth(value);
  if (!p) return value;
  const date = new Date(p.year, p.month - 1, 1);
  return style === 'long'
    ? date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : `${MONTH_SHORT[p.month - 1]} ${p.year}`;
}

/** Keep a month inside [min, max] (either bound optional). 'YYYY-MM' strings compare lexically. */
export function clampMonth(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/** Default month-picker range: 36 months back to next month, around the current local month. */
export function defaultMonthBounds(now: Date = new Date()): { min: string; max: string } {
  const current = getLocalMonth(now);
  return { min: addMonths(current, -36), max: addMonths(current, 1) };
}

/**
 * Returns time-aware greeting ('Good morning', 'Good afternoon', 'Good evening') based on local time.
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
