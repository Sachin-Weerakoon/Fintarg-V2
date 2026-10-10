import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculateTotalInterest,
  calculateSimpleInterest,
  calculateLoan,
  calculateAmortizationSchedule,
} from './loanMath';

describe('loanMath frontend calculations', () => {
  it('matches test vector 1: 100,000 at 12% for 12 months reducing balance', () => {
    const emi = calculateEMI(100000, 12, 12);
    expect(emi).toBe(8884.88);

    const totalInterest = calculateTotalInterest(100000, 12, 12);
    expect(totalInterest).toBe(6618.55);

    const loan = calculateLoan(100000, 12, 12, 'reducing_balance');
    expect(loan.monthlyPayment).toBe(8884.88);
    expect(loan.totalInterest).toBe(6618.55);
  });

  it('matches test vector 3: 500,000 at 14% for 60 months reducing balance', () => {
    const emi = calculateEMI(500000, 14, 60);
    expect(emi).toBe(11634.13);
  });

  it('calculates simple interest accurately', () => {
    const interest = calculateSimpleInterest(100000, 12, 12);
    expect(interest).toBe(12000);

    const loan = calculateLoan(100000, 12, 12, 'simple');
    expect(loan.totalInterest).toBe(12000);
    expect(loan.monthlyPayment).toBe(9333.33);
  });

  it('generates a valid amortization schedule', () => {
    const schedule = calculateAmortizationSchedule(100000, 12, 12);
    expect(schedule).toHaveLength(12);
    expect(schedule[0].month).toBe(1);
    expect(schedule[0].payment).toBe(8884.88);
    expect(schedule[11].balance).toBe(0);
  });
});
