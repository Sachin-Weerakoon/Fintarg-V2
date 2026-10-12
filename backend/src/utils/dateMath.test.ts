import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDaysInMonth } from './dateMath';

describe('Date and Month Math (backend)', () => {
  it('correctly calculates 28 days for February non-leap years', () => {
    assert.equal(getDaysInMonth('2026-02'), 28);
    assert.equal(getDaysInMonth('2025-02'), 28);
    assert.equal(getDaysInMonth('2023-02-14'), 28);
  });

  it('correctly calculates 29 days for February leap years', () => {
    assert.equal(getDaysInMonth('2024-02'), 29);
    assert.equal(getDaysInMonth('2028-02-29'), 29);
    assert.equal(getDaysInMonth('2000-02'), 29);
  });

  it('correctly calculates 30 days for April, June, September, November', () => {
    assert.equal(getDaysInMonth('2026-04'), 30);
    assert.equal(getDaysInMonth('2026-06'), 30);
    assert.equal(getDaysInMonth('2026-09'), 30);
    assert.equal(getDaysInMonth('2026-11'), 30);
  });

  it('correctly calculates 31 days for January, March, May, July, August, October, December', () => {
    assert.equal(getDaysInMonth('2026-01'), 31);
    assert.equal(getDaysInMonth('2026-03'), 31);
    assert.equal(getDaysInMonth('2026-05'), 31);
    assert.equal(getDaysInMonth('2026-07'), 31);
    assert.equal(getDaysInMonth('2026-08'), 31);
    assert.equal(getDaysInMonth('2026-10'), 31);
    assert.equal(getDaysInMonth('2026-12'), 31);
  });

  it('handles Date instances and fallback gracefully', () => {
    const leapDate = new Date(2024, 1, 15);
    assert.equal(getDaysInMonth(leapDate), 29);
    assert.ok(getDaysInMonth() >= 28 && getDaysInMonth() <= 31);
  });
});
