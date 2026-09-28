import { describe, it, expect } from 'vitest';
import { formatAmount } from './currency';

describe('formatAmount', () => {
  it('formats a value with thousands separator and two decimals (es-PE)', () => {
    expect(formatAmount(1234.5)).toBe('1,234.50');
  });

  it('formats zero as 0.00', () => {
    expect(formatAmount(0)).toBe('0.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatAmount(12.345)).toBe('12.35');
  });

  it('returns 0.00 for non-finite values', () => {
    expect(formatAmount(NaN)).toBe('0.00');
  });
});
