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

/** An inclusive date range, both ends 'YYYY-MM-DD'. */
export interface DateRange {
  from: string;
  to: string;
}

/** True for a real calendar date in 'YYYY-MM-DD' form. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** First to last day of a 'YYYY-MM' month. */
export function monthRange(month: string): DateRange {
  const p = parseMonth(month);
  if (!p) return monthRange(getLocalMonth());
  const lastDay = new Date(p.year, p.month, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** Shift a 'YYYY-MM-DD' by delta days in local time. */
export function addDays(value: string, delta: number): string {
  const [y, m, d] = value.split('-').map(Number);
  return getLocalDate(new Date(y, m - 1, d + delta));
}

/** Every 'YYYY-MM' month the range touches, oldest first. */
export function monthsInRange(range: DateRange): string[] {
  const months: string[] = [];
  const last = range.to.slice(0, 7);
  for (let m = range.from.slice(0, 7); m <= last; m = addMonths(m, 1)) months.push(m);
  return months;
}

/**
 * How much of each month the range covers: 1 for the whole month, 15/30 for half of September.
 * Used to prorate monthly amounts (recurring income, instalments) over an arbitrary range.
 */
export function monthCoverage(range: DateRange): { month: string; fraction: number }[] {
  return monthsInRange(range).map(month => {
    const full = monthRange(month);
    const start = range.from > full.from ? range.from : full.from;
    const end = range.to < full.to ? range.to : full.to;
    const days = Number(end.slice(8, 10)) - Number(start.slice(8, 10)) + 1;
    return { month, fraction: days / Number(full.to.slice(8, 10)) };
  });
}

export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/** '2026-10-01'..'2026-10-31' -> '1 Oct – 31 Oct 2026' (years shown once when shared). */
export function formatDateRange(range: DateRange): string {
  const fmt = (value: string, withYear: boolean) => {
    const [y, m, d] = value.split('-').map(Number);
    return `${d} ${MONTH_SHORT[m - 1]}${withYear ? ` ${y}` : ''}`;
  };
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  if (range.from === range.to) return fmt(range.from, true);
  return `${fmt(range.from, !sameYear)} – ${fmt(range.to, true)}`;
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
