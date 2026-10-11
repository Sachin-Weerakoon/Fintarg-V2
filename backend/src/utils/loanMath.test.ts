import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEMI,
  calculateTotalInterest,
  calculateSimpleInterest,
  calculateLoan,
  calculateAmortizationSchedule,
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
