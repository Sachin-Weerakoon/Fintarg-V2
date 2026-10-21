import { describe, expect, it } from 'vitest';
import { buildCalendarMonth, compactAmount, mondayIndex } from './billsCalendar';
import type { Obligation } from './insights';

const ob = (date: string, amount?: number, id = date): Obligation => ({
  id, kind: 'finance', label: `Bill ${id}`, date, daysUntil: 0, amount, href: '/financial?tab=finance',
});

const flat = (month: string, obligations: Obligation[] = [], today = '2026-10-21') =>
  buildCalendarMonth(month, obligations, today).weeks.flat();

describe('mondayIndex', () => {
  it('maps weekdays Monday-first', () => {
    expect(mondayIndex('2026-10-19')).toBe(0); // Monday
    expect(mondayIndex('2026-10-21')).toBe(2); // Wednesday
    expect(mondayIndex('2026-03-01')).toBe(6); // Sunday
  });
});

describe('buildCalendarMonth', () => {
  it('always returns 6 weeks of 7 days, starting on a Monday', () => {
    for (const month of ['2026-02', '2026-03', '2026-10', '2028-02']) {
      const { weeks } = buildCalendarMonth(month, [], '2026-10-21');
      expect(weeks).toHaveLength(6);
      weeks.forEach(w => expect(w).toHaveLength(7));
      expect(mondayIndex(weeks[0][0].date)).toBe(0);
    }
  });

  it('October 2026: starts Thursday, leading September days flagged outside', () => {
    const days = flat('2026-10');
    expect(days[0]).toMatchObject({ date: '2026-09-28', inMonth: false });
    expect(days[3]).toMatchObject({ date: '2026-10-01', day: 1, inMonth: true });
    expect(days.filter(d => d.inMonth)).toHaveLength(31);
    expect(days[41]).toMatchObject({ date: '2026-11-08', inMonth: false });
  });

  it('a month starting on Sunday needs all 6 rows (March 2026)', () => {
    const { weeks } = buildCalendarMonth('2026-03', [], '2026-10-21');
    expect(weeks[0][0].date).toBe('2026-02-23');
    expect(weeks[0][6]).toMatchObject({ date: '2026-03-01', inMonth: true });
    expect(weeks[5][1]).toMatchObject({ date: '2026-03-31', inMonth: true });
    expect(weeks[5][6]).toMatchObject({ date: '2026-04-05', inMonth: false });
  });

  it('February 2026 (Sunday start, 28 days): last row is entirely next month', () => {
    const { weeks } = buildCalendarMonth('2026-02', [], '2026-10-21');
    expect(weeks[0][6]).toMatchObject({ date: '2026-02-01', inMonth: true });
    expect(weeks[4][6]).toMatchObject({ date: '2026-03-01', inMonth: false });
    expect(weeks[5].every(d => !d.inMonth)).toBe(true);
    expect(weeks.flat().filter(d => d.inMonth)).toHaveLength(28);
  });

  it('leap-year February 2028 has 29 in-month days', () => {
    const days = flat('2028-02');
    expect(days[0].date).toBe('2028-01-31'); // 1 Feb 2028 is a Tuesday
    expect(days.filter(d => d.inMonth)).toHaveLength(29);
    expect(days.find(d => d.date === '2028-02-29')?.inMonth).toBe(true);
    expect(days.find(d => d.date === '2028-03-01')?.inMonth).toBe(false);
  });

  it('flags today', () => {
    const days = flat('2026-10');
    expect(days.filter(d => d.isToday).map(d => d.date)).toEqual(['2026-10-21']);
  });

  it('attaches obligations, totals the month and marks overdue days', () => {
    const cal = buildCalendarMonth('2026-10', [
      ob('2026-10-10', 1500, 'past'),
      ob('2026-10-25', 5000, 'a'),
      ob('2026-10-25', undefined, 'b'), // e.g. an agreement end, no amount
      ob('2026-11-02', 9000, 'next'),   // visible in the grid, not in the month total
      ob('2026-12-15', 7000, 'far'),    // outside the grid
    ], '2026-10-21');
    const days = cal.weeks.flat();
    const d25 = days.find(d => d.date === '2026-10-25')!;
    expect(d25.items.map(i => i.id)).toEqual(['a', 'b']);
    expect(d25.total).toBe(5000);
    expect(d25.overdue).toBe(false);
    expect(days.find(d => d.date === '2026-10-10')).toMatchObject({ total: 1500, overdue: true });
    expect(days.find(d => d.date === '2026-11-02')).toMatchObject({ inMonth: false, total: 9000 });
    expect(cal.total).toBe(6500);
    expect(cal.count).toBe(3);
  });

  it('accepts full timestamps on obligations', () => {
    const days = flat('2026-10', [ob('2026-10-05T00:00:00.000Z', 100)]);
    expect(days.find(d => d.date === '2026-10-05')?.total).toBe(100);
  });

  it('an empty month has no items and a zero total', () => {
    const cal = buildCalendarMonth('2026-10', [], '2026-10-21');
    expect(cal.total).toBe(0);
    expect(cal.count).toBe(0);
    expect(cal.weeks.flat().every(d => d.items.length === 0 && !d.overdue)).toBe(true);
  });
});

describe('compactAmount', () => {
  it.each([
    [0, '0'],
    [950, '950'],
    [1000, '1k'],
    [25000, '25k'],
    [12500, '12.5k'],
    [150000, '150k'],
    [1250000, '1.3M'],
    [-2500, '-2.5k'],
  ])('%d -> %s', (n, s) => expect(compactAmount(n)).toBe(s));
});
