import { describe, it, expect } from 'vitest';
import { roundToCents } from './money';

describe('roundToCents', () => {
  it('rounds classic floating point drift 0.1 + 0.2 to 0.3', () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds 1.005 up to 1.01', () => {
    expect(roundToCents(1.005)).toBe(1.01);
  });

  it('rounds 2.675 up to 2.68', () => {
    expect(roundToCents(2.675)).toBe(2.68);
  });

  it('rounds negative values to cents', () => {
    expect(roundToCents(-1.005)).toBe(-1);
  });

  it('returns 0 for NaN', () => {
    expect(roundToCents(NaN)).toBe(0);
  });

  it('returns 0 for Infinity and -Infinity', () => {
    expect(roundToCents(Infinity)).toBe(0);
    expect(roundToCents(-Infinity)).toBe(0);
  });

  it('leaves an already-rounded value unchanged', () => {
    expect(roundToCents(25.5)).toBe(25.5);
  });
});
