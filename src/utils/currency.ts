const amountFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount using the es-PE locale (comma thousands separator,
 * dot decimal separator, always two decimals). Returns the number only —
 * callers render the "S/" currency prefix separately.
 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return amountFormatter.format(0);
  }
  return amountFormatter.format(value);
}
