import type { Customer, CreditTransaction } from '../../types/database';
import { calculateOldestUnpaidDate } from '../transactions/debtAgeCalculator';

/** Number of days since the oldest unpaid credit purchase for a debt to be considered "aged". */
export const AGED_DEBT_DAYS = 30;

export type DashboardDebtor = Customer & {
  oldestUnpaidDate: Date | null;
  debtAgeDays: number | null;
  isAged: boolean;
  creditUsageRatio: number | null;
};

export interface DashboardStats {
  totalReceivable: number;
  pendingAccountsCount: number;
  fiadoHoy: number;
  fiadoHoyCount: number;
  cobradoHoy: number;
  cobradoHoyCount: number;
  totalFiadoHistorico: number;
  totalCobradoHistorico: number;
  totalCustomers: number;
  topDebtors: DashboardDebtor[];
}

function toDebtor(customer: Customer, transactions: CreditTransaction[], now: Date): DashboardDebtor {
  const customerTxs = transactions.filter(
    (t) => t.customer_id === customer.id && t.status !== 'cancelled'
  );
  const oldestUnpaidDate = calculateOldestUnpaidDate(customerTxs);
  const debtAgeDays = oldestUnpaidDate
    ? Math.ceil(Math.abs(now.getTime() - oldestUnpaidDate.getTime()) / 86_400_000)
    : null;
  const isAged = debtAgeDays !== null && debtAgeDays >= AGED_DEBT_DAYS;
  const creditUsageRatio =
    customer.credit_limit > 0
      ? Math.min(100, Math.round((customer.balance / customer.credit_limit) * 100))
      : null;

  return {
    ...customer,
    oldestUnpaidDate,
    debtAgeDays,
    isAged,
    creditUsageRatio,
  };
}

/**
 * Pure computation of the Home dashboard aggregate figures. Extracted from
 * HomePage so it can be unit-tested without rendering.
 */
export function computeDashboardStats(
  customers: Customer[],
  transactions: CreditTransaction[],
  now: Date = new Date()
): DashboardStats {
  const totalReceivable = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const pendingAccountsCount = customers.filter((c) => (c.balance || 0) > 0).length;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const todayTxs = transactions.filter(
    (t) => new Date(t.created_at) >= startOfToday && t.status !== 'cancelled'
  );

  const fiadoHoy = todayTxs
    .filter((t) => t.type === 'credit_purchase')
    .reduce((acc, t) => acc + t.total_amount, 0);
  const fiadoHoyCount = todayTxs.filter((t) => t.type === 'credit_purchase').length;

  const cobradoHoy = todayTxs
    .filter((t) => t.type === 'payment')
    .reduce((acc, t) => acc + t.total_amount, 0);
  const cobradoHoyCount = todayTxs.filter((t) => t.type === 'payment').length;

  const totalFiadoHistorico = transactions
    .filter((t) => t.type === 'credit_purchase' && t.status !== 'cancelled')
    .reduce((acc, t) => acc + t.total_amount, 0);

  const totalCobradoHistorico = transactions
    .filter((t) => t.type === 'payment' && t.status !== 'cancelled')
    .reduce((acc, t) => acc + t.total_amount, 0);

  // Top debtors (sorted by highest balance)
  const topDebtors = [...customers]
    .filter((c) => (c.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((c) => toDebtor(c, transactions, now));

  return {
    totalReceivable,
    pendingAccountsCount,
    fiadoHoy,
    fiadoHoyCount,
    cobradoHoy,
    cobradoHoyCount,
    totalFiadoHistorico,
    totalCobradoHistorico,
    totalCustomers: customers.length,
    topDebtors,
  };
}
