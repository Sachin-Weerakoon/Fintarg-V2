import { describe, expect, it } from 'vitest';
import type { MedicalExpense } from '@/types';
import { summariseByType } from './medicalSummary';

function expense(id: string, type: string, amount: number): MedicalExpense {
  return {
    id,
    date: '2026-09-10',
    type,
    amount,
    note: '',
  };
}

describe('summariseByType', () => {
  it('returns one row with 100 percent for a single type', () => {
    expect(summariseByType([
      expense('1', 'Medication', 25),
      expense('2', 'Medication', 75),
    ])).toEqual([
      { type: 'Medication', total: 100, percent: 100 },
    ]);
  });

  it('groups expenses, sums amounts, and sorts by highest total', () => {
    expect(summariseByType([
      expense('1', 'Dental', 15),
      expense('2', 'Medication', 20),
      expense('3', 'Transport', 10),
      expense('4', 'Medication', 5),
    ])).toEqual([
      { type: 'Medication', total: 25, percent: 50 },
      { type: 'Dental', total: 15, percent: 30 },
      { type: 'Transport', total: 10, percent: 20 },
    ]);
  });

  it('sorts equal totals alphabetically by type', () => {
    const rows = summariseByType([
      expense('1', 'Zoology', 10),
      expense('2', 'Dental', 10),
      expense('3', 'Medication', 10),
    ]);

    expect(rows.map(({ type }) => type)).toEqual([
      'Dental',
      'Medication',
      'Zoology',
    ]);
  });

  it('returns an empty array for empty expenses and non-positive totals', () => {
    expect(summariseByType([])).toEqual([]);
    expect(summariseByType([
      expense('1', 'Medication', 0),
      expense('2', 'Dental', 0),
    ])).toEqual([]);
  });

  it('adjusts rounded percentages to 100 for three equal types', () => {
    const rows = summariseByType([
      expense('1', 'C', 1),
      expense('2', 'A', 1),
      expense('3', 'B', 1),
    ]);

    expect(rows.map(({ type, percent }) => [type, percent])).toEqual([
      ['A', 34],
      ['B', 33],
      ['C', 33],
    ]);
    expect(rows.reduce((total, row) => total + row.percent, 0)).toBe(100);
  });

  it('adjusts percentages to 100 for many small uneven amounts', () => {
    const expenses = Array.from({ length: 11 }, (_, index) =>
      expense(String(index), `Type ${index + 1}`, index + 1)
    );
    const rows = summariseByType(expenses);

    expect(rows.reduce((total, row) => total + row.percent, 0)).toBe(100);
  });

  it('does not mutate the input array or its expenses', () => {
    const input = [
      expense('1', 'Transport', 10),
      expense('2', 'Medication', 20),
    ];
    const originalItems = [...input];
    const original = input.map((item) => ({ ...item }));

    summariseByType(input);

    expect(input).toEqual(original);
    expect(input[0]).toBe(originalItems[0]);
    expect(input[1]).toBe(originalItems[1]);
  });
});
