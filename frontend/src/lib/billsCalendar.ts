/**
 * Month grid for the upcoming-bills calendar on the Finance tab.
 *
 * Pure and date-string based: every date is a local 'YYYY-MM-DD' string and all
 * weekday maths uses UTC on those strings, so the grid never shifts a day in
 * Asia/Colombo (no toISOString() on "now").
 */
import { addDays, daysInMonth, todayISO, type Obligation } from './insights';

export interface CalendarDay {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Day of the month, 1–31. */
  day: number;
  /** false for the leading/trailing days that belong to the previous/next month. */
  inMonth: boolean;
  isToday: boolean;
  /** Obligations due on this date. */
  items: Obligation[];
  /** Sum of the items' amounts (items without an amount count as 0). */
  total: number;
  /** Has items and the date is before today. */
  overdue: boolean;
}

export interface CalendarMonth {
  /** 'YYYY-MM' */
  month: string;
  /** Always 6 rows of 7 days, weeks start on Monday. */
  weeks: CalendarDay[][];
  /** Total due on in-month days. */
  total: number;
  /** Number of obligations on in-month days. */
  count: number;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 0 = Monday … 6 = Sunday, for a 'YYYY-MM-DD' string. */
export function mondayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * Build the 6×7 grid for `month` ('YYYY-MM') and attach each obligation to its date.
 * Obligations outside the grid are ignored, so a wide upcomingObligations() window
 * (e.g. 62 days) can be passed in and filtered here.
 */
export function buildCalendarMonth(month: string, obligations: Obligation[], today: string = todayISO()): CalendarMonth {
  const first = `${month}-01`;
  const gridStart = addDays(first, -mondayIndex(first));
  const lastInMonth = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;

  const byDate = new Map<string, Obligation[]>();
  for (const o of obligations) {
    const key = o.date.slice(0, 10);
    const list = byDate.get(key);
    if (list) list.push(o);
    else byDate.set(key, [o]);
  }

  const weeks: CalendarDay[][] = [];
  let total = 0;
  let count = 0;
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      const inMonth = date >= first && date <= lastInMonth;
      const items = byDate.get(date) ?? [];
      const dayTotal = items.reduce((s, o) => s + (o.amount ?? 0), 0);
      if (inMonth) {
        total += dayTotal;
        count += items.length;
      }
      week.push({
        date,
        day: Number(date.slice(8, 10)),
        inMonth,
        isToday: date === today,
        items,
        total: dayTotal,
        overdue: items.length > 0 && date < today,
      });
    }
    weeks.push(week);
  }

  return { month, weeks, total, count };
}

/** Short amount for a day cell: 950, 25k, 1.2M. */
export function compactAmount(amount: number): string {
  const n = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (n >= 1_000_000) return `${sign}${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${sign}${trim(n / 1_000)}k`;
  return `${sign}${Math.round(n)}`;
}

function trim(v: number): string {
  return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}
