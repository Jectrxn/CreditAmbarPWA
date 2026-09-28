/**
 * Rounds a monetary amount to cents (2 decimal places), guarding against
 * classic floating-point drift (e.g. 0.1 + 0.2 !== 0.3) via Number.EPSILON.
 * Non-finite input (NaN, Infinity, -Infinity) safely resolves to 0 so a bad
 * value never propagates into a stored balance or transaction amount.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
