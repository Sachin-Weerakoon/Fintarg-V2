import { describe, expect, it } from 'vitest';
import { addDays, addMonths, clampMonth, defaultMonthBounds, formatDateRange, formatMonth, getLocalDate, getLocalMonth, isInRange, isIsoDate, isMonthKey, monthCoverage, monthRange, monthsInRange, parseMonth } from './date';

describe('date utils', () => {
  it('getLocalDate / getLocalMonth use local time, not UTC', () => {
    // 1 Oct 2026 00:30 local: toISOString() could still say 30 Sep in UTC+05:30.
    const d = new Date(2026, 9, 1, 0, 30);
    expect(getLocalDate(d)).toBe('2026-10-01');
    expect(getLocalMonth(d)).toBe('2026-10');
  });

  it('isMonthKey / parseMonth validate YYYY-MM', () => {
    expect(isMonthKey('2026-10')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-00')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey(null)).toBe(false);
    expect(parseMonth('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseMonth('oops')).toBeNull();
  });

  it('addMonths crosses year boundaries both ways', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', -36)).toBe('2023-10');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });

  it('formatMonth', () => {
    expect(formatMonth('2026-10')).toBe('Oct 2026');
    expect(formatMonth('2026-01', 'long')).toBe('January 2026');
    expect(formatMonth('bad')).toBe('bad');
  });

  it('clampMonth keeps a month inside the bounds', () => {
    expect(clampMonth('2023-01', '2023-10', '2026-11')).toBe('2023-10');
    expect(clampMonth('2027-05', '2023-10', '2026-11')).toBe('2026-11');
    expect(clampMonth('2026-10', '2023-10', '2026-11')).toBe('2026-10');
    expect(clampMonth('2026-10')).toBe('2026-10');
  });

  it('defaultMonthBounds: 36 months back to next month', () => {
    expect(defaultMonthBounds(new Date(2026, 9, 20))).toEqual({ min: '2023-10', max: '2026-11' });
  });

  it('isIsoDate rejects impossible calendar dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-1-01')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('monthRange covers the whole month, including leap Februaries', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('monthsInRange / monthCoverage prorate partial months', () => {
    const range = { from: '2026-09-16', to: '2026-10-31' };
    expect(monthsInRange(range)).toEqual(['2026-09', '2026-10']);
    expect(monthCoverage(range)).toEqual([
      { month: '2026-09', fraction: 0.5 },
      { month: '2026-10', fraction: 1 },
    ]);
  });

  it('isInRange is inclusive at both ends', () => {
    const range = { from: '2026-10-01', to: '2026-10-31' };
    expect(isInRange('2026-10-01', range)).toBe(true);
    expect(isInRange('2026-10-31', range)).toBe(true);
    expect(isInRange('2026-11-01', range)).toBe(false);
  });

  it('formatDateRange shows the year once when both ends share it', () => {
    expect(formatDateRange({ from: '2026-10-01', to: '2026-10-31' })).toBe('1 Oct – 31 Oct 2026');
    expect(formatDateRange({ from: '2025-12-15', to: '2026-01-14' })).toBe('15 Dec 2025 – 14 Jan 2026');
    expect(formatDateRange({ from: '2026-10-05', to: '2026-10-05' })).toBe('5 Oct 2026');
  });
});
