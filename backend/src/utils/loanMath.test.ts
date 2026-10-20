import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEMI,
  calculateTotalInterest,
  calculateSimpleInterest,
  calculateLoan,
  calculateAmortizationSchedule,
  accruedReducingBalanceInterestCents,
  addMonthsIso,
  completedPeriods,
  monthlyRateFor,
} from './loanMath';

describe('Shared Loan Maths (Test Vectors & Verification)', () => {
  it('matches Test Vector 1: Principal 100,000, Rate 12%, Tenure 12 months -> EMI 8,884.88', () => {
    const emi = calculateEMI(100_000, 12, 12);
    assert.strictEqual(emi, 8884.88);
  });

  it('matches Test Vector 2: Principal 100,000, Rate 12%, Tenure 12 months -> Total Interest 6,618.55', () => {
    const totalInterest = calculateTotalInterest(100_000, 12, 12);
    assert.strictEqual(totalInterest, 6618.55);
  });

  it('matches Test Vector 3: Principal 500,000, Rate 14%, Tenure 60 months -> EMI 11,634.13', () => {
    const emi = calculateEMI(500_000, 14, 60);
    assert.strictEqual(emi, 11634.13);
  });

  it('correctly calculates simple (flat) interest', () => {
    // 100,000 at 10% for 12 months = 10,000 interest
    const interest = calculateSimpleInterest(100_000, 10, 12);
    assert.strictEqual(interest, 10000);

    const loan = calculateLoan(100_000, 10, 12, 'simple');
    assert.strictEqual(loan.totalInterest, 10000);
    assert.strictEqual(loan.totalPayment, 110000);
    assert.strictEqual(loan.monthlyPayment, 9166.67);
  });

  it('handles zero interest or zero tenure gracefully', () => {
    assert.strictEqual(calculateEMI(120_000, 0, 12), 10000);
    assert.strictEqual(calculateTotalInterest(120_000, 0, 12), 0);
  });

  it('generates a full amortization schedule reducing balance to zero', () => {
    const schedule = calculateAmortizationSchedule(100_000, 12, 12);
    assert.strictEqual(schedule.length, 12);
    assert.strictEqual(schedule[0].payment, 8884.88);
    // Ending balance on last month should be 0
    assert.strictEqual(schedule[11].balance, 0);
  });

  it('supports monthly interestBasis with rate * 12 equivalence', () => {
    // 1% per month = 12% per year
    const monthlyLoan = calculateLoan(100_000, 1, 12, 'reducing_balance', 'monthly');
    assert.strictEqual(monthlyLoan.monthlyPayment, 8884.88);
    assert.strictEqual(monthlyLoan.totalInterest, 6618.55);

    const simpleMonthly = calculateLoan(100_000, 1, 12, 'simple', 'monthly');
    assert.strictEqual(simpleMonthly.totalInterest, 12000);

    const schedule = calculateAmortizationSchedule(100_000, 1, 12, 'monthly');
    assert.strictEqual(schedule.length, 12);
    assert.strictEqual(schedule[0].payment, 8884.88);
    assert.strictEqual(schedule[11].balance, 0);
  });

  it('treats compound and reducing_balance methods equivalently for installment loan math', () => {
    const compoundLoan = calculateLoan(100_000, 12, 12, 'compound');
    const reducingLoan = calculateLoan(100_000, 12, 12, 'reducing_balance');
    assert.strictEqual(compoundLoan.monthlyPayment, reducingLoan.monthlyPayment);
    assert.strictEqual(compoundLoan.totalInterest, reducingLoan.totalInterest);
  });
});

describe('Reducing-balance interest accrual', () => {
  it('addMonthsIso clamps to the end of shorter months', () => {
    assert.strictEqual(addMonthsIso('2026-01-31', 1), '2026-02-28');
    assert.strictEqual(addMonthsIso('2024-01-31', 1), '2024-02-29');
    assert.strictEqual(addMonthsIso('2026-11-15', 2), '2027-01-15');
  });

  it('completedPeriods counts installment anniversaries on or before the date', () => {
    assert.strictEqual(completedPeriods('2026-01-01', '2026-01-31'), 0);
    assert.strictEqual(completedPeriods('2026-01-01', '2026-02-01'), 1);
    assert.strictEqual(completedPeriods('2026-01-01', '2026-03-15'), 2);
  });

  it('accrues one full period of interest matching the amortization schedule', () => {
    const rate = monthlyRateFor(12, 'annual');
    assert.strictEqual(accruedReducingBalanceInterestCents(10_000_000, rate, '2026-01-01', [], '2026-02-01'), 100_000);
    // After paying 7,884.88 principal on Feb 1, March interest is on 92,115.12
    const reductions = [{ date: '2026-02-01', principalCents: 788_488 }];
    assert.strictEqual(accruedReducingBalanceInterestCents(10_000_000, rate, '2026-01-01', reductions, '2026-03-01'), 100_000 + 92_115);
  });

  it('pro-rates a partial period by days and ignores reductions after the as-of date', () => {
    const rate = monthlyRateFor(1, 'monthly');
    // 15 of 31 January days on 31,000.00 at 1%/month = 150.00
    assert.strictEqual(accruedReducingBalanceInterestCents(3_100_000, rate, '2026-01-01', [{ date: '2026-01-20', principalCents: 1_000_000 }], '2026-01-16'), 15_000);
    assert.strictEqual(accruedReducingBalanceInterestCents(10_000_000, rate, '2026-01-01', [], '2026-01-01'), 0);
  });
});
