/**
 * Mocked credit bureau response. Biased by income-to-requested-amount ratio
 * so demo data looks plausible, then randomized -- not a real scoring model.
 */
export function generateMockCreditScore(
  income: number,
  requestedAmount: number
): number {
  const ratio = requestedAmount > 0 ? income / requestedAmount : 1;
  const base = 500 + Math.min(ratio, 4) * 60; // richer-relative-to-loan => higher base
  const noise = (Math.random() - 0.5) * 200;
  return Math.max(300, Math.min(900, Math.round(base + noise)));
}
