import { describe, expect, it } from 'vitest';
import { addMonths, clampMonth, defaultMonthBounds, formatMonth, getLocalDate, getLocalMonth, isMonthKey, parseMonth } from './date';

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
});
