import { describe, it, expect } from 'vitest';
import {
  validateFloatDeclaration,
  validateTransactionForFCC,
  calculateExpectedSessionCash,
  validateCreditLimit,
  checkAuditGraceWindow,
  CashierSessionSnapshot,
} from './transactionRules';

describe('Transaction Rules & FCC Domain Logic', () => {
  describe('Starting Float Declaration (Requirement 2: cashier-session)', () => {
    it('approves valid positive float declaration of $50', () => {
      const result = validateFloatDeclaration(50);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('approves zero starting float declaration of $0', () => {
      const result = validateFloatDeclaration(0);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects negative float declaration of -$10 with validation error', () => {
      const result = validateFloatDeclaration(-10);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/positive or zero/i);
    });

    it('rejects invalid non-number or NaN float values', () => {
      const result = validateFloatDeclaration(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid/i);
    });
  });

  describe('FCC Cash Isolation vs QR Treasury (Requirement 1: cashier-session & design)', () => {
    const activeSession: CashierSessionSnapshot = {
      id: 'session-cajero-1',
      cashierId: 'cajero-1',
      cashierName: 'Cashier A',
      storeId: 'store-100',
      status: 'open',
      startingFloat: 50,
      currentCashTotal: 50,
      cashPaymentsTotal: 0,
      qrPaymentsTotal: 0,
      openedAt: new Date().toISOString(),
    };

    it('links cash payment to active cashier session and flags cash drawer increment', () => {
      const result = validateTransactionForFCC(activeSession, {
        paymentMethod: 'cash',
        amount: 25,
        type: 'payment',
      });

      expect(result.allowed).toBe(true);
      expect(result.affectsCashierDrawer).toBe(true);
      expect(result.sessionId).toBe('session-cajero-1');
    });

    it('blocks cash payment when no active cashier session exists', () => {
      const result = validateTransactionForFCC(null, {
        paymentMethod: 'cash',
        amount: 30,
        type: 'payment',
      });

      expect(result.allowed).toBe(false);
      expect(result.affectsCashierDrawer).toBe(false);
      expect(result.error).toMatch(/active.*session/i);
    });

    it('blocks cash payment when session is closed', () => {
      const closedSession: CashierSessionSnapshot = {
        ...activeSession,
        status: 'closed',
      };

      const result = validateTransactionForFCC(closedSession, {
        paymentMethod: 'cash',
        amount: 30,
        type: 'payment',
      });

      expect(result.allowed).toBe(false);
      expect(result.affectsCashierDrawer).toBe(false);
      expect(result.error).toMatch(/closed|active/i);
    });

    it('allows QR payment to proceed to store treasury without incrementing cash drawer', () => {
      const result = validateTransactionForFCC(activeSession, {
        paymentMethod: 'qr',
        amount: 100,
        type: 'payment',
      });

      expect(result.allowed).toBe(true);
      expect(result.affectsCashierDrawer).toBe(false);
    });

    it('credit purchase (fiado) does not affect physical cash drawer', () => {
      const result = validateTransactionForFCC(activeSession, {
        paymentMethod: 'cash',
        amount: 40,
        type: 'credit_purchase',
      });

      expect(result.allowed).toBe(true);
      expect(result.affectsCashierDrawer).toBe(false);
    });

    it('correctly calculates expected session cash isolating FCC cash from QR payments', () => {
      const startingFloat = 50;
      const cashPayments = 75; // cash in drawer
      const cashRefunds = 10;  // refunds/voids in cash

      const expectedCash = calculateExpectedSessionCash(startingFloat, cashPayments, cashRefunds);
      expect(expectedCash).toBe(115); // 50 + 75 - 10
    });
  });

  describe('Customer Credit Limit Enforcement (Requirement 2: credit-management)', () => {
    it('approves credit purchase within available limit and calculates remaining credit', () => {
      const customer = {
        credit_limit: 100,
        balance: 0, // currently owes 0, available credit = 100
      };

      const result = validateCreditLimit(customer, 50);

      expect(result.allowed).toBe(true);
      expect(result.availableCredit).toBe(50);
      expect(result.newBalance).toBe(50);
      expect(result.error).toBeUndefined();
    });

    it('rejects credit purchase exceeding available limit with informative notification', () => {
      const customer = {
        credit_limit: 100,
        balance: 0,
      };

      const result = validateCreditLimit(customer, 150);

      expect(result.allowed).toBe(false);
      expect(result.availableCredit).toBe(100);
      expect(result.newBalance).toBe(0);
      expect(result.error).toMatch(/insufficient credit limit|exceeds/i);
      expect(result.error).toContain('S/');
      expect(result.error).not.toContain('$');
    });

    it('is cents-safe: balance 0.1 + purchase 0.2 against limit 0.3 is allowed and rounds newBalance', () => {
      const customer = {
        credit_limit: 0.3,
        balance: 0.1,
      };

      const result = validateCreditLimit(customer, 0.2);

      expect(result.allowed).toBe(true);
      expect(result.newBalance).toBe(0.3);
      expect(result.availableCredit).toBe(0);
    });

    it('approves purchase that uses exactly 100% of remaining available credit', () => {
      const customer = {
        credit_limit: 100,
        balance: 60, // available credit = 40
      };

      const result = validateCreditLimit(customer, 40);

      expect(result.allowed).toBe(true);
      expect(result.availableCredit).toBe(0);
      expect(result.newBalance).toBe(100);
    });

    it('rejects purchase when customer has already exhausted credit limit', () => {
      const customer = {
        credit_limit: 100,
        balance: 100, // available credit = 0
      };

      const result = validateCreditLimit(customer, 1);

      expect(result.allowed).toBe(false);
      expect(result.error).toMatch(/insufficient credit limit|exceeds/i);
    });

    it('rejects invalid non-positive purchase amounts', () => {
      const customer = {
        credit_limit: 100,
        balance: 20,
      };

      const resultZero = validateCreditLimit(customer, 0);
      expect(resultZero.allowed).toBe(false);
      expect(resultZero.error).toMatch(/greater than zero/i);

      const resultNegative = validateCreditLimit(customer, -20);
      expect(resultNegative.allowed).toBe(false);
      expect(resultNegative.error).toMatch(/greater than zero/i);
    });
  });

  describe('10-Minute Audit Grace Window & Immutability (payment-recording)', () => {
    const fixedNow = new Date('2026-09-05T14:30:00.000Z');

    it('allows edit/correction within 5 minutes of creation', () => {
      const recorded5MinAgo = new Date('2026-09-05T14:25:00.000Z');
      const result = checkAuditGraceWindow(recorded5MinAgo, fixedNow);

      expect(result.canEdit).toBe(true);
      expect(result.canUndo).toBe(true);
      expect(result.remainingMinutes).toBeCloseTo(5, 0);
      expect(result.error).toBeUndefined();
    });

    it('allows undoing mistaken deletion recorded 8 minutes ago with remaining window', () => {
      const recorded8MinAgo = new Date('2026-09-05T14:22:00.000Z');
      const result = checkAuditGraceWindow(recorded8MinAgo, fixedNow);

      expect(result.canUndo).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.remainingMinutes).toBeCloseTo(2, 0);
    });

    it('locks transaction and disables edit functionality after 15 minutes', () => {
      const recorded15MinAgo = new Date('2026-09-05T14:15:00.000Z');
      const result = checkAuditGraceWindow(recorded15MinAgo, fixedNow);

      expect(result.canEdit).toBe(false);
      expect(result.canUndo).toBe(false);
      expect(result.remainingMinutes).toBe(0);
      expect(result.error).toMatch(/audit window has closed|immutable/i);
    });

    it('locks delayed offline transaction synced 20 minutes later based on original creation time', () => {
      const originalOfflineCreatedAt = '2026-09-05T14:10:00.000Z'; // 20 minutes ago
      const result = checkAuditGraceWindow(originalOfflineCreatedAt, fixedNow);

      expect(result.canEdit).toBe(false);
      expect(result.canUndo).toBe(false);
      expect(result.error).toMatch(/audit window has closed|immutable/i);
    });

    it('boundary test: exactly at 10-minute mark is locked', () => {
      const exactly10MinAgo = new Date('2026-09-05T14:20:00.000Z');
      const result = checkAuditGraceWindow(exactly10MinAgo, fixedNow);

      expect(result.canEdit).toBe(false);
      expect(result.canUndo).toBe(false);
    });

    it('boundary test: 9 minutes 59 seconds is editable', () => {
      const almost10MinAgo = new Date('2026-09-05T14:20:01.000Z');
      const result = checkAuditGraceWindow(almost10MinAgo, fixedNow);

      expect(result.canEdit).toBe(true);
      expect(result.canUndo).toBe(true);
    });
  });
});
