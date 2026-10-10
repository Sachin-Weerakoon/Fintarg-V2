/**
 * Shared loan mathematics for calculating EMI, interest, and amortization.
 * Matches backend/src/utils/loanMath.ts test vectors (8,884.88, 6,618.55, 11,634.13).
 */

export interface LoanCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Calculates monthly EMI for a reducing balance / compound interest loan.
 */
export function calculateEMI(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return principal;
  if (annualRatePercent <= 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const monthlyRate = (annualRatePercent / 100) / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Calculates total interest payable over the loan term for reducing balance.
 */
export function calculateTotalInterest(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (tenureMonths <= 0 || annualRatePercent <= 0) return 0;
  const monthlyRate = (annualRatePercent / 100) / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const rawEmi = (principal * monthlyRate * factor) / (factor - 1);
  const totalInterest = rawEmi * tenureMonths - principal;
  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculates simple interest (flat): I = P * (R/100) * (T/12)
 */
export function calculateSimpleInterest(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (tenureMonths <= 0 || annualRatePercent <= 0) return 0;
  const interest = principal * (annualRatePercent / 100) * (tenureMonths / 12);
  return Math.round(interest * 100) / 100;
}

/**
 * Computes full loan breakdown given principal, rate, tenure, and method.
 */
export function calculateLoan(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  method: 'reducing_balance' | 'compound' | 'simple' = 'reducing_balance'
): LoanCalculationResult {
  if (method === 'simple') {
    const totalInterest = calculateSimpleInterest(principal, annualRatePercent, tenureMonths);
    const totalPayment = principal + totalInterest;
    const monthlyPayment = tenureMonths > 0 ? Math.round((totalPayment / tenureMonths) * 100) / 100 : totalPayment;
    return { monthlyPayment, totalInterest, totalPayment };
  }

  const monthlyPayment = calculateEMI(principal, annualRatePercent, tenureMonths);
  const totalInterest = calculateTotalInterest(principal, annualRatePercent, tenureMonths);
  const totalPayment = Math.round((principal + totalInterest) * 100) / 100;
  return { monthlyPayment, totalInterest, totalPayment };
}

/**
 * Generates month-by-month amortization schedule.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  if (tenureMonths <= 0) return schedule;

  const monthlyRate = (annualRatePercent / 100) / 12;
  const emi = calculateEMI(principal, annualRatePercent, tenureMonths);
  let balance = principal;

  for (let m = 1; m <= tenureMonths; m++) {
    const interest = Math.round(balance * monthlyRate * 100) / 100;
    const principalPaid = m === tenureMonths ? balance : Math.round((emi - interest) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principalPaid) * 100) / 100);
    schedule.push({
      month: m,
      payment: emi,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return schedule;
}
