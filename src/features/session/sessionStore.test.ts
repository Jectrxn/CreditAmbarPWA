import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('useSessionStore - Cashier Session & FCC Isolation', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  describe('Session Opening & Float Declaration', () => {
    it('opens a session with a valid starting float of $50', () => {
      const { openSession } = useSessionStore.getState();

      const result = openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: 50,
      });

      expect(result.success).toBe(true);
      const session = useSessionStore.getState().activeSession;
      expect(session).not.toBeNull();
      expect(session?.status).toBe('open');
      expect(session?.startingFloat).toBe(50);
      expect(session?.currentCashTotal).toBe(50);
      expect(session?.cashPaymentsTotal).toBe(0);
      expect(session?.qrPaymentsTotal).toBe(0);
      expect(session?.cashierName).toBe('Maria Cajera');
    });

    it('rejects opening a session with a negative float of -$20', () => {
      const { openSession } = useSessionStore.getState();

      const result = openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: -20,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/positive or zero/i);
      expect(useSessionStore.getState().activeSession).toBeNull();
    });

    it('allows opening a session with $0 starting float', () => {
      const { openSession } = useSessionStore.getState();

      const result = openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: 0,
      });

      expect(result.success).toBe(true);
      expect(useSessionStore.getState().activeSession?.currentCashTotal).toBe(0);
    });

    it('prevents opening a new session when an active session is already open', () => {
      const { openSession } = useSessionStore.getState();

      openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: 50,
      });

      const secondResult = openSession({
        cashierId: 'cajero-2',
        cashierName: 'Carlos Cajero',
        storeId: 'store-100',
        startingFloat: 30,
      });

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toMatch(/already.*open/i);
      expect(useSessionStore.getState().activeSession?.cashierId).toBe('cajero-1');
    });
  });

  describe('FCC Cash Isolation vs QR Payments', () => {
    beforeEach(() => {
      useSessionStore.getState().openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: 100,
      });
    });

    it('increments physical cash drawer when a cash payment is recorded', () => {
      const { recordPaymentToSession } = useSessionStore.getState();

      const result = recordPaymentToSession({
        amount: 45.5,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(true);
      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(145.5); // 100 + 45.5
      expect(session?.cashPaymentsTotal).toBe(45.5);
      expect(session?.qrPaymentsTotal).toBe(0); // isolated from cash
    });

    it('isolates QR payments to treasury without modifying drawer cash total', () => {
      const { recordPaymentToSession } = useSessionStore.getState();

      const result = recordPaymentToSession({
        amount: 80,
        paymentMethod: 'qr',
      });

      expect(result.success).toBe(true);
      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(100); // Unchanged!
      expect(session?.cashPaymentsTotal).toBe(0);
      expect(session?.qrPaymentsTotal).toBe(80); // Digital treasury tracking
    });

    it('accumulates multiple cash and QR payments in strictly isolated balances', () => {
      const { recordPaymentToSession } = useSessionStore.getState();

      recordPaymentToSession({ amount: 50, paymentMethod: 'cash' });
      recordPaymentToSession({ amount: 120, paymentMethod: 'qr' });
      recordPaymentToSession({ amount: 25, paymentMethod: 'cash' });

      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(175); // 100 float + 50 + 25 cash
      expect(session?.cashPaymentsTotal).toBe(75);
      expect(session?.qrPaymentsTotal).toBe(120);
    });

    it('adjusts session cash on cash refund/void within grace window', () => {
      const { recordPaymentToSession, recordVoidOrCorrection } = useSessionStore.getState();

      recordPaymentToSession({ amount: 50, paymentMethod: 'cash' });
      const voidResult = recordVoidOrCorrection({
        amount: 20,
        paymentMethod: 'cash',
      });

      expect(voidResult.success).toBe(true);
      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(130); // 100 + 50 - 20
      expect(session?.cashPaymentsTotal).toBe(30);
    });

    it('blocks payment when no active session is open', () => {
      useSessionStore.getState().closeSession();
      const { recordPaymentToSession } = useSessionStore.getState();

      const result = recordPaymentToSession({
        amount: 20,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no active.*session/i);
    });
  });

  describe('Session Closing', () => {
    it('closes an active session and stores closing totals', () => {
      const { openSession, recordPaymentToSession, closeSession } = useSessionStore.getState();

      openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-100',
        startingFloat: 50,
      });

      recordPaymentToSession({ amount: 30, paymentMethod: 'cash' });
      recordPaymentToSession({ amount: 70, paymentMethod: 'qr' });

      const closeResult = closeSession();
      expect(closeResult.success).toBe(true);
      expect(closeResult.closedSession?.status).toBe('closed');
      expect(closeResult.closedSession?.currentCashTotal).toBe(80);
      expect(closeResult.closedSession?.qrPaymentsTotal).toBe(70);
      expect(closeResult.closedSession?.closedAt).toBeDefined();

      expect(useSessionStore.getState().activeSession).toBeNull();
      expect(useSessionStore.getState().lastClosedSession).toEqual(closeResult.closedSession);
    });
  });
});
