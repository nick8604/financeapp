import { describe, expect, it } from "vitest";
import { generateAmortizationSchedule } from "./amortization";

describe("generateAmortizationSchedule", () => {
  it("produces the correct number of installments", () => {
    const schedule = generateAmortizationSchedule(120000, 10.5, 12);
    expect(schedule).toHaveLength(12);
  });

  it("fully amortizes: the last installment brings the balance to exactly zero", () => {
    const principal = 500000;
    const rate = 12;
    const tenure = 24;
    const schedule = generateAmortizationSchedule(principal, rate, tenure);

    const totalPrincipalPaid = schedule.reduce(
      (sum, row) => sum + row.principalComponent,
      0
    );

    expect(Math.round(totalPrincipalPaid * 100) / 100).toBeCloseTo(
      principal,
      2
    );
  });

  it("matches a hand/calculator-verified EMI for a known case", () => {
    // Principal 100,000 at 12% annual (1% monthly) over 12 months.
    // Standard EMI formula: EMI = P*r*(1+r)^n / ((1+r)^n - 1) = 8884.88 (rounded)
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    expect(schedule[0].amountDue).toBeCloseTo(8884.88, 1);
    // Every installment (except possibly the last, due to rounding) should
    // charge the same EMI.
    for (const row of schedule.slice(0, -1)) {
      expect(row.amountDue).toBeCloseTo(8884.88, 1);
    }
  });

  it("interest component decreases and principal component increases over time", () => {
    const schedule = generateAmortizationSchedule(200000, 9, 18);
    expect(schedule[0].interestComponent).toBeGreaterThan(
      schedule[schedule.length - 1].interestComponent
    );
    expect(schedule[0].principalComponent).toBeLessThan(
      schedule[schedule.length - 1].principalComponent
    );
  });

  it("handles a 0% interest rate as straight-line principal", () => {
    const schedule = generateAmortizationSchedule(12000, 0, 12);
    expect(schedule.every((row) => row.interestComponent === 0)).toBe(true);
    const total = schedule.reduce((sum, row) => sum + row.amountDue, 0);
    expect(Math.round(total * 100) / 100).toBeCloseTo(12000, 2);
  });

  it("due dates increment monthly from the disbursement date", () => {
    const start = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15
    const schedule = generateAmortizationSchedule(10000, 10, 3, start);
    expect(schedule.map((s) => s.dueDate)).toEqual([
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("rejects invalid input", () => {
    expect(() => generateAmortizationSchedule(0, 10, 12)).toThrow();
    expect(() => generateAmortizationSchedule(1000, 10, 0)).toThrow();
    expect(() => generateAmortizationSchedule(1000, -1, 12)).toThrow();
  });
});
