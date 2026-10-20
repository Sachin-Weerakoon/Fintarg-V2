/**
 * Shared loan mathematics for calculating EMI, interest, and amortization.
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
 * @param principal Loan principal amount (in major units, e.g. rupees)
 * @param annualRatePercent Annual interest rate (e.g. 12 for 12%)
 * @param tenureMonths Tenure in months (e.g. 12)
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
 * Uses exact continuous precision: Total Payments - Principal.
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
  method: 'reducing_balance' | 'compound' | 'simple' = 'reducing_balance',
  interestBasis: 'monthly' | 'annual' = 'annual'
): LoanCalculationResult {
  const effectiveAnnualRate = interestBasis === 'monthly' ? annualRatePercent * 12 : annualRatePercent;
  if (method === 'simple') {
    const totalInterest = calculateSimpleInterest(principal, effectiveAnnualRate, tenureMonths);
    const totalPayment = principal + totalInterest;
    const monthlyPayment = tenureMonths > 0 ? Math.round((totalPayment / tenureMonths) * 100) / 100 : totalPayment;
    return { monthlyPayment, totalInterest, totalPayment };
  }

  const monthlyPayment = calculateEMI(principal, effectiveAnnualRate, tenureMonths);
  const totalInterest = calculateTotalInterest(principal, effectiveAnnualRate, tenureMonths);
  const totalPayment = Math.round((principal + totalInterest) * 100) / 100;
  return { monthlyPayment, totalInterest, totalPayment };
}

/**
 * Generates month-by-month amortization schedule.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  interestBasis: 'monthly' | 'annual' = 'annual'
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  if (tenureMonths <= 0) return schedule;

  const effectiveAnnualRate = interestBasis === 'monthly' ? annualRatePercent * 12 : annualRatePercent;
  const monthlyRate = (effectiveAnnualRate / 100) / 12;
  const emi = calculateEMI(principal, effectiveAnnualRate, tenureMonths);
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


/**
 * Monthly interest rate (as a fraction) for a loan's quoted rate and basis.
 */
export function monthlyRateFor(ratePercent: number, interestBasis: 'monthly' | 'annual' = 'annual'): number {
  const effectiveAnnualRate = interestBasis === 'monthly' ? ratePercent * 12 : ratePercent;
  return (effectiveAnnualRate / 100) / 12;
}

function isoToDayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * Adds calendar months to a YYYY-MM-DD date, clamping the day to the target month's length
 * (e.g. 2026-01-31 + 1 month = 2026-02-28).
 */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, daysInTarget));
  return target.toISOString().slice(0, 10);
}

/**
 * Number of whole installment periods (anniversaries of startDate) that have fallen due on or before asOfDate.
 */
export function completedPeriods(startDate: string, asOfDate: string): number {
  if (asOfDate <= startDate) return 0;
  let k = 0;
  while (addMonthsIso(startDate, k + 1) <= asOfDate) k++;
  return k;
}

export interface PrincipalReduction {
  date: string;
  principalCents: number;
}

/**
 * Total interest (in cents) accrued on a reducing-balance loan from startDate up to asOfDate.
 *
 * Interest accrues on the actual outstanding principal: each installment period earns
 * `balance * monthlyRate`, pro-rated by days whenever the balance changes mid-period or
 * asOfDate falls inside a period. This makes the split independent of how many payments
 * were made, so extra, partial, or same-month payments allocate interest correctly.
 */
export function accruedReducingBalanceInterestCents(
  principalCents: number,
  monthlyRate: number,
  startDate: string,
  reductions: PrincipalReduction[],
  asOfDate: string,
): number {
  if (monthlyRate <= 0 || asOfDate <= startDate) return 0;
  const events = reductions
    .filter(r => r.date <= asOfDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let balance = principalCents;
  let eventIdx = 0;
  let period = 1;
  let periodStart = startDate;
  let periodEnd = addMonthsIso(startDate, 1);
  let cursor = startDate;
  let accrued = 0;

  while (cursor < asOfDate) {
    while (eventIdx < events.length && events[eventIdx].date <= cursor) {
      balance = Math.max(0, balance - (Number(events[eventIdx].principalCents) || 0));
      eventIdx++;
    }
    let segmentEnd = periodEnd < asOfDate ? periodEnd : asOfDate;
    if (eventIdx < events.length && events[eventIdx].date < segmentEnd) segmentEnd = events[eventIdx].date;

    const periodDays = isoToDayNumber(periodEnd) - isoToDayNumber(periodStart);
    const segmentDays = isoToDayNumber(segmentEnd) - isoToDayNumber(cursor);
    accrued += balance * monthlyRate * (segmentDays / periodDays);

    cursor = segmentEnd;
    if (cursor === periodEnd) {
      period++;
      periodStart = periodEnd;
      periodEnd = addMonthsIso(startDate, period);
    }
  }

  return Math.round(accrued);
}
