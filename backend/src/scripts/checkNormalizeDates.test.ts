import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attemptNormalizeDate, attemptNormalizeMonth } from './checkNormalizeDates';

describe('Date and Month Normalization Script', () => {
  describe('attemptNormalizeDate', () => {
    it('returns valid ISO date unchanged', () => {
      assert.strictEqual(attemptNormalizeDate('2026-10-11'), '2026-10-11');
      assert.strictEqual(attemptNormalizeDate('2024-02-29'), '2024-02-29');
    });

    it('returns empty string for empty inputs', () => {
      assert.strictEqual(attemptNormalizeDate(''), '');
      assert.strictEqual(attemptNormalizeDate('   '), '');
    });

    it('normalizes ISO timestamps with time component', () => {
      assert.strictEqual(attemptNormalizeDate('2026-10-11T14:30:00.000Z'), '2026-10-11');
      assert.strictEqual(attemptNormalizeDate('2026-05-01 00:00:00'), '2026-05-01');
    });

    it('normalizes slash formatted YYYY/MM/DD', () => {
      assert.strictEqual(attemptNormalizeDate('2026/10/11'), '2026-10-11');
    });

    it('normalizes DD-MM-YYYY and DD/MM/YYYY formats', () => {
      assert.strictEqual(attemptNormalizeDate('11-10-2026'), '2026-10-11');
      assert.strictEqual(attemptNormalizeDate('11/10/2026'), '2026-10-11');
    });

    it('returns null for impossible or gibberish dates', () => {
      assert.strictEqual(attemptNormalizeDate('not-a-date'), null);
      assert.strictEqual(attemptNormalizeDate('2026-02-31'), null);
      assert.strictEqual(attemptNormalizeDate('2025-02-29'), null);
      assert.strictEqual(attemptNormalizeDate(12345), null);
    });
  });

  describe('attemptNormalizeMonth', () => {
    it('returns valid YYYY-MM unchanged', () => {
      assert.strictEqual(attemptNormalizeMonth('2026-10'), '2026-10');
      assert.strictEqual(attemptNormalizeMonth('2026-01'), '2026-01');
    });

    it('normalizes full ISO date or timestamp to YYYY-MM', () => {
      assert.strictEqual(attemptNormalizeMonth('2026-10-11'), '2026-10');
      assert.strictEqual(attemptNormalizeMonth('2026-10-11T12:00:00.000Z'), '2026-10');
    });

    it('normalizes slash YYYY/MM to YYYY-MM', () => {
      assert.strictEqual(attemptNormalizeMonth('2026/10'), '2026-10');
    });

    it('returns null for invalid month strings', () => {
      assert.strictEqual(attemptNormalizeMonth(''), null);
      assert.strictEqual(attemptNormalizeMonth('invalid'), null);
      assert.strictEqual(attemptNormalizeMonth('2026-13'), null);
      assert.strictEqual(attemptNormalizeMonth('2026-00'), null);
    });
  });
});
