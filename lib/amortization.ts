/**
 * Reducing-balance (equal installment / EMI) amortization schedule generator.
 *
 * All money math happens in integer cents to avoid floating point drift; the
 * final installment absorbs any rounding remainder so the balance always
 * reaches exactly zero.
 */

export interface AmortizationInstallment {
  installmentNo: number;
  dueDate: string; // ISO date (YYYY-MM-DD)
  amountDue: number;
  principalComponent: number;
  interestComponent: number;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function toCurrency(cents: number): number {
  return Math.round(cents) / 100;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * @param principal Loan principal (currency units, e.g. dollars/rupees).
 * @param annualInterestRatePercent Nominal annual interest rate, e.g. 12 for 12%.
 * @param tenureMonths Number of monthly installments.
 * @param startDate Disbursement date; the first installment is due one month later.
 */
export function generateAmortizationSchedule(
  principal: number,
  annualInterestRatePercent: number,
  tenureMonths: number,
  startDate: Date = new Date()
): AmortizationInstallment[] {
  if (principal <= 0) throw new Error("principal must be positive");
  if (tenureMonths <= 0) throw new Error("tenureMonths must be positive");
  if (annualInterestRatePercent < 0)
    throw new Error("annualInterestRatePercent cannot be negative");

  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const principalCents = toCents(principal);

  let emiCents: number;
  if (monthlyRate === 0) {
    emiCents = Math.round(principalCents / tenureMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    emiCents = Math.round(emi * 100);
  }

  const schedule: AmortizationInstallment[] = [];
  let balanceCents = principalCents;

  for (let i = 1; i <= tenureMonths; i++) {
    const interestCents = Math.round(balanceCents * monthlyRate);
    const isLast = i === tenureMonths;
    const principalCentsThisRound = isLast
      ? balanceCents
      : Math.min(emiCents - interestCents, balanceCents);
    const amountDueCents = principalCentsThisRound + interestCents;

    balanceCents -= principalCentsThisRound;

    schedule.push({
      installmentNo: i,
      dueDate: toISODate(addMonths(startDate, i)),
      amountDue: toCurrency(amountDueCents),
      principalComponent: toCurrency(principalCentsThisRound),
      interestComponent: toCurrency(interestCents),
    });
  }

  return schedule;
}
