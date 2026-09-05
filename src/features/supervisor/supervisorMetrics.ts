import type { CashierSession } from '../session/sessionStore';
import { calculateExpectedSessionCash } from '../transactions/transactionRules';

export interface SessionMetricDetail {
  id: string;
  cashierId: string;
  cashierName: string;
  storeId: string;
  status: 'open' | 'closed' | 'closing';
  startingFloat: number;
  expectedCash: number;
  cashPaymentsTotal: number;
  qrPaymentsTotal: number;
  totalCollected: number;
  openedAt: string;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
}

export interface SupervisorMetrics {
  activeSessionsCount: number;
  totalExpectedCash: number;
  totalCashPayments: number;
  totalQrPayments: number;
  totalCollected: number;
  sessions: SessionMetricDetail[];
  isOffline: boolean;
  offlineWarning: string | null;
  lastUpdated: string;
}

export const OFFLINE_WARNING_MESSAGE = 'Offline - Data may be outdated';

/**
 * Pure function to aggregate supervisor metrics across cashier sessions.
 * Enforces FCC cash isolation: expectedCash = startingFloat + cashPayments.
 * Separates cash payments from QR payments (direct treasury).
 * Displays offline warning when device is not connected.
 */
export function aggregateSupervisorMetrics(
  sessions: CashierSession[],
  isOnline: boolean = true,
  lastKnownMetrics?: SupervisorMetrics | null
): SupervisorMetrics {
  const isOffline = !isOnline;
  const offlineWarning = isOffline ? OFFLINE_WARNING_MESSAGE : null;
  const lastUpdated = new Date().toISOString();

  // If offline and no new sessions provided but previous metrics exist, preserve them
  if (isOffline && sessions.length === 0 && lastKnownMetrics) {
    return {
      ...lastKnownMetrics,
      isOffline: true,
      offlineWarning,
      lastUpdated,
    };
  }

  let activeSessionsCount = 0;
  let totalExpectedCash = 0;
  let totalCashPayments = 0;
  let totalQrPayments = 0;

  const sessionDetails: SessionMetricDetail[] = sessions.map((s) => {
    const expectedCash = calculateExpectedSessionCash(s.startingFloat, s.cashPaymentsTotal);
    const totalCollected = s.cashPaymentsTotal + s.qrPaymentsTotal;
    const isActive = s.status === 'open';

    if (isActive) {
      activeSessionsCount += 1;
      totalExpectedCash += expectedCash;
      totalCashPayments += s.cashPaymentsTotal;
      totalQrPayments += s.qrPaymentsTotal;
    }

    return {
      id: s.id,
      cashierId: s.cashierId,
      cashierName: s.cashierName,
      storeId: s.storeId,
      status: s.status,
      startingFloat: s.startingFloat,
      expectedCash,
      cashPaymentsTotal: s.cashPaymentsTotal,
      qrPaymentsTotal: s.qrPaymentsTotal,
      totalCollected,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      closedBy: s.closedBy,
      closeReason: s.closeReason,
    };
  });

  const totalCollected = totalCashPayments + totalQrPayments;

  return {
    activeSessionsCount,
    totalExpectedCash,
    totalCashPayments,
    totalQrPayments,
    totalCollected,
    sessions: sessionDetails,
    isOffline,
    offlineWarning,
    lastUpdated,
  };
}
