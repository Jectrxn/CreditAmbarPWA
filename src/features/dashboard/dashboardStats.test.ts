import { describe, it, expect } from 'vitest';
import { computeDashboardStats, AGED_DEBT_DAYS } from './dashboardStats';
import type { Customer, CreditTransaction } from '../../types/database';

// Built with the local Date constructor (not a UTC ISO string) so this fixture
// represents the same local wall-clock instant regardless of the process TZ.
// A fixed UTC instant would shift across a local calendar-day boundary in
// some timezones (e.g. UTC+14), breaking "today" / "yesterday" assumptions.
const NOW = new Date(2026, 8, 28, 12, 0, 0);

function agoMs(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

function daysAgo(days: number): string {
  return agoMs(days * 86_400_000);
}

/** Builds an ISO timestamp `hours:minutes` on the local calendar day of NOW, offset by `dayOffset` days. */
function localTime(dayOffset: number, hours: number, minutes = 0): string {
  return new Date(
    NOW.getFullYear(),
    NOW.getMonth(),
    NOW.getDate() + dayOffset,
    hours,
    minutes,
    0,
    0
  ).toISOString();
}

function makeCustomer(overrides: Partial<Customer> & Pick<Customer, 'id'>): Customer {
  return {
    store_id: 'store-1',
    name: `Customer ${overrides.id}`,
    credit_limit: 500,
    balance: 0,
    created_at: daysAgo(100),
    ...overrides,
  };
}

function makeTx(overrides: Partial<CreditTransaction> & Pick<CreditTransaction, 'id' | 'customer_id'>): CreditTransaction {
  return {
    store_id: 'store-1',
    cashier_pin_hash: 'admin',
    total_amount: 0,
    status: 'completed',
    created_at: daysAgo(0),
    type: 'credit_purchase',
    ...overrides,
  };
}

describe('computeDashboardStats', () => {
  describe('debt age / "Antigua" classification', () => {
    it('marks a 5-day-old S/150 debt as not aged', () => {
      const customer = makeCustomer({ id: 'c1', balance: 150, credit_limit: 500 });
      const tx = makeTx({ id: 't1', customer_id: 'c1', total_amount: 150, created_at: daysAgo(5) });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors).toHaveLength(1);
      expect(stats.topDebtors[0].debtAgeDays).toBe(5);
      expect(stats.topDebtors[0].isAged).toBe(false);
    });

    it('marks a 45-day-old S/20 debt as aged', () => {
      const customer = makeCustomer({ id: 'c2', balance: 20, credit_limit: 500 });
      const tx = makeTx({ id: 't2', customer_id: 'c2', total_amount: 20, created_at: daysAgo(45) });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors).toHaveLength(1);
      expect(stats.topDebtors[0].debtAgeDays).toBe(45);
      expect(stats.topDebtors[0].isAged).toBe(true);
    });

    it('uses AGED_DEBT_DAYS (30) as the exact threshold', () => {
      expect(AGED_DEBT_DAYS).toBe(30);
    });

    it('treats exactly 29 days old as not aged (below AGED_DEBT_DAYS boundary)', () => {
      const customer = makeCustomer({ id: 'c-boundary-29', balance: 30, credit_limit: 500 });
      const tx = makeTx({
        id: 't-boundary-29',
        customer_id: 'c-boundary-29',
        total_amount: 30,
        created_at: daysAgo(29),
      });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].debtAgeDays).toBe(29);
      expect(stats.topDebtors[0].isAged).toBe(false);
    });

    it('treats exactly 30 days old as aged (AGED_DEBT_DAYS boundary)', () => {
      const customer = makeCustomer({ id: 'c-boundary-30', balance: 30, credit_limit: 500 });
      const tx = makeTx({
        id: 't-boundary-30',
        customer_id: 'c-boundary-30',
        total_amount: 30,
        created_at: daysAgo(30),
      });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].debtAgeDays).toBe(30);
      expect(stats.topDebtors[0].isAged).toBe(true);
    });

    it('documents that Math.ceil rounds 29 days + 1 minute up to 30, marking it aged (current rounding behavior, not changed by this test)', () => {
      const customer = makeCustomer({ id: 'c-boundary-29-1min', balance: 30, credit_limit: 500 });
      const tx = makeTx({
        id: 't-boundary-29-1min',
        customer_id: 'c-boundary-29-1min',
        total_amount: 30,
        created_at: agoMs(29 * 86_400_000 + 60_000),
      });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].debtAgeDays).toBe(30);
      expect(stats.topDebtors[0].isAged).toBe(true);
    });

    it('clamps a future-dated purchase (clock skew) to debtAgeDays 0 and isAged=false', () => {
      const customer = makeCustomer({ id: 'c-future', balance: 30, credit_limit: 500 });
      const tx = makeTx({
        id: 't-future',
        customer_id: 'c-future',
        total_amount: 30,
        // Purchase dated 45 days in the future relative to NOW (e.g. device clock skew).
        created_at: agoMs(-45 * 86_400_000),
      });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].debtAgeDays).toBe(0);
      expect(stats.topDebtors[0].isAged).toBe(false);
    });

    it('has null debtAgeDays and isAged=false when the customer has no unpaid purchases', () => {
      const customer = makeCustomer({ id: 'c3', balance: 30, credit_limit: 500 });
      // no transactions at all for this customer
      const stats = computeDashboardStats([customer], [], NOW);

      expect(stats.topDebtors[0].oldestUnpaidDate).toBeNull();
      expect(stats.topDebtors[0].debtAgeDays).toBeNull();
      expect(stats.topDebtors[0].isAged).toBe(false);
    });
  });

  describe('credit usage ratio', () => {
    it('is null when credit_limit is 0', () => {
      const customer = makeCustomer({ id: 'c4', balance: 50, credit_limit: 0 });
      const tx = makeTx({ id: 't4', customer_id: 'c4', total_amount: 50, created_at: daysAgo(1) });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].creditUsageRatio).toBeNull();
    });

    it('is the rounded percentage of balance over credit_limit, capped at 100', () => {
      const customer = makeCustomer({ id: 'c5', balance: 450, credit_limit: 500 });
      const tx = makeTx({ id: 't5', customer_id: 'c5', total_amount: 450, created_at: daysAgo(1) });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].creditUsageRatio).toBe(90);
    });

    it('caps the ratio at 100 when balance exceeds credit_limit', () => {
      const customer = makeCustomer({ id: 'c6', balance: 600, credit_limit: 500 });
      const tx = makeTx({ id: 't6', customer_id: 'c6', total_amount: 600, created_at: daysAgo(1) });

      const stats = computeDashboardStats([customer], [tx], NOW);

      expect(stats.topDebtors[0].creditUsageRatio).toBe(100);
    });
  });

  describe('today metrics', () => {
    it('includes only non-cancelled transactions from today, excluding yesterday and cancelled', () => {
      const customer = makeCustomer({ id: 'c7', balance: 0, credit_limit: 500 });
      const todayPurchase = makeTx({
        id: 'tx-today-purchase',
        customer_id: 'c7',
        type: 'credit_purchase',
        total_amount: 40,
        created_at: localTime(0, 8),
      });
      const todayPayment = makeTx({
        id: 'tx-today-payment',
        customer_id: 'c7',
        type: 'payment',
        total_amount: 25,
        created_at: localTime(0, 9),
      });
      const todayCancelled = makeTx({
        id: 'tx-today-cancelled',
        customer_id: 'c7',
        type: 'credit_purchase',
        total_amount: 999,
        status: 'cancelled',
        created_at: localTime(0, 10),
      });
      const yesterdayPurchase = makeTx({
        id: 'tx-yesterday-purchase',
        customer_id: 'c7',
        type: 'credit_purchase',
        total_amount: 77,
        created_at: localTime(-1, 23),
      });

      const stats = computeDashboardStats(
        [customer],
        [todayPurchase, todayPayment, todayCancelled, yesterdayPurchase],
        NOW
      );

      expect(stats.fiadoHoy).toBe(40);
      expect(stats.fiadoHoyCount).toBe(1);
      expect(stats.cobradoHoy).toBe(25);
      expect(stats.cobradoHoyCount).toBe(1);
    });
  });

  describe('historical totals', () => {
    it('excludes cancelled transactions from historical totals', () => {
      const customer = makeCustomer({ id: 'c8', balance: 0, credit_limit: 500 });
      const purchase = makeTx({
        id: 'tx-hist-purchase',
        customer_id: 'c8',
        type: 'credit_purchase',
        total_amount: 100,
        created_at: daysAgo(10),
      });
      const cancelledPurchase = makeTx({
        id: 'tx-hist-cancelled',
        customer_id: 'c8',
        type: 'credit_purchase',
        total_amount: 200,
        status: 'cancelled',
        created_at: daysAgo(10),
      });
      const payment = makeTx({
        id: 'tx-hist-payment',
        customer_id: 'c8',
        type: 'payment',
        total_amount: 30,
        created_at: daysAgo(5),
      });

      const stats = computeDashboardStats([customer], [purchase, cancelledPurchase, payment], NOW);

      expect(stats.totalFiadoHistorico).toBe(100);
      expect(stats.totalCobradoHistorico).toBe(30);
    });
  });

  describe('totals and counts', () => {
    it('sums receivable balance and counts pending accounts', () => {
      const customers = [
        makeCustomer({ id: 'c9', balance: 100 }),
        makeCustomer({ id: 'c10', balance: 0 }),
        makeCustomer({ id: 'c11', balance: 50 }),
      ];

      const stats = computeDashboardStats(customers, [], NOW);

      expect(stats.totalReceivable).toBe(150);
      expect(stats.pendingAccountsCount).toBe(2);
      expect(stats.totalCustomers).toBe(3);
    });
  });

  describe('top debtors', () => {
    it('returns at most 5, sorted by balance descending', () => {
      const customers = [
        makeCustomer({ id: 'd1', balance: 10 }),
        makeCustomer({ id: 'd2', balance: 90 }),
        makeCustomer({ id: 'd3', balance: 50 }),
        makeCustomer({ id: 'd4', balance: 70 }),
        makeCustomer({ id: 'd5', balance: 30 }),
        makeCustomer({ id: 'd6', balance: 60 }),
        makeCustomer({ id: 'd7', balance: 0 }),
      ];

      const stats = computeDashboardStats(customers, [], NOW);

      expect(stats.topDebtors).toHaveLength(5);
      expect(stats.topDebtors.map((d) => d.id)).toEqual(['d2', 'd4', 'd6', 'd3', 'd5']);
      expect(stats.topDebtors.map((d) => d.balance)).toEqual([90, 70, 60, 50, 30]);
    });

    it('excludes customers with balance <= 0', () => {
      const customers = [
        makeCustomer({ id: 'e1', balance: 0 }),
        makeCustomer({ id: 'e2', balance: -5 }),
        makeCustomer({ id: 'e3', balance: 10 }),
      ];

      const stats = computeDashboardStats(customers, [], NOW);

      expect(stats.topDebtors.map((d) => d.id)).toEqual(['e3']);
    });
  });
});
