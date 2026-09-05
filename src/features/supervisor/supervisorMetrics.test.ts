import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CashierSession } from '../session/sessionStore';
import {
  aggregateSupervisorMetrics,
  OFFLINE_WARNING_MESSAGE,
} from './supervisorMetrics';
import { useSupervisorMetrics } from './useSupervisorMetrics';
import { syncManager } from '../../lib/syncManager';

describe('Supervisor Metrics Aggregation (Strict TDD)', () => {
  const mockSession1: CashierSession = {
    id: 'session-1',
    cashierId: 'c-1',
    cashierName: 'Laura Gómez',
    storeId: 'store-1',
    status: 'open',
    startingFloat: 100,
    currentCashTotal: 350,
    cashPaymentsTotal: 250,
    qrPaymentsTotal: 50,
    openedAt: '2026-09-05T08:00:00.000Z',
  };

  const mockSession2: CashierSession = {
    id: 'session-2',
    cashierId: 'c-2',
    cashierName: 'Carlos Ruiz',
    storeId: 'store-1',
    status: 'open',
    startingFloat: 50,
    currentCashTotal: 170,
    cashPaymentsTotal: 120,
    qrPaymentsTotal: 80,
    openedAt: '2026-09-05T09:00:00.000Z',
  };

  const mockClosedSession: CashierSession = {
    id: 'session-closed',
    cashierId: 'c-3',
    cashierName: 'Marcos Rivas',
    storeId: 'store-1',
    status: 'closed',
    startingFloat: 100,
    currentCashTotal: 200,
    cashPaymentsTotal: 100,
    qrPaymentsTotal: 30,
    openedAt: '2026-09-05T06:00:00.000Z',
    closedAt: '2026-09-05T07:30:00.000Z',
  };

  describe('aggregateSupervisorMetrics pure function', () => {
    it('aggregates multiple active cashier sessions expected cash and payment totals', () => {
      const metrics = aggregateSupervisorMetrics([mockSession1, mockSession2], true);

      expect(metrics.activeSessionsCount).toBe(2);
      // Expected cash session 1 (100 + 250 = 350) + session 2 (50 + 120 = 170) = 520
      expect(metrics.totalExpectedCash).toBe(520);
      expect(metrics.totalCashPayments).toBe(370);
      expect(metrics.totalQrPayments).toBe(130);
      expect(metrics.totalCollected).toBe(500); // 370 cash + 130 qr
      expect(metrics.isOffline).toBe(false);
      expect(metrics.offlineWarning).toBeNull();
      expect(metrics.sessions).toHaveLength(2);

      const s1 = metrics.sessions.find((s) => s.id === 'session-1');
      expect(s1).toBeDefined();
      expect(s1?.cashierName).toBe('Laura Gómez');
      expect(s1?.expectedCash).toBe(350);
      expect(s1?.totalCollected).toBe(300); // 250 cash + 50 qr
    });

    it('filters out closed sessions from active aggregates while keeping them in session list', () => {
      const metrics = aggregateSupervisorMetrics(
        [mockSession1, mockClosedSession],
        true
      );

      // Only mockSession1 is active
      expect(metrics.activeSessionsCount).toBe(1);
      expect(metrics.totalExpectedCash).toBe(350);
      expect(metrics.totalCashPayments).toBe(250);
      expect(metrics.totalQrPayments).toBe(50);
      expect(metrics.totalCollected).toBe(300);
      expect(metrics.sessions).toHaveLength(2);
    });

    it('handles empty session list gracefully with zero totals', () => {
      const metrics = aggregateSupervisorMetrics([], true);

      expect(metrics.activeSessionsCount).toBe(0);
      expect(metrics.totalExpectedCash).toBe(0);
      expect(metrics.totalCashPayments).toBe(0);
      expect(metrics.totalQrPayments).toBe(0);
      expect(metrics.totalCollected).toBe(0);
      expect(metrics.sessions).toEqual([]);
      expect(metrics.isOffline).toBe(false);
      expect(metrics.offlineWarning).toBeNull();
    });

    it('shows offline warning indicator when supervisor device loses connection', () => {
      const metrics = aggregateSupervisorMetrics([mockSession1], false);

      expect(metrics.isOffline).toBe(true);
      expect(metrics.offlineWarning).toBe(OFFLINE_WARNING_MESSAGE);
      expect(metrics.totalExpectedCash).toBe(350);
    });

    it('preserves last known metrics when offline', () => {
      const previousMetrics = aggregateSupervisorMetrics([mockSession1, mockSession2], true);
      // Simulate going offline with lastKnownMetrics passed
      const offlineMetrics = aggregateSupervisorMetrics(
        [],
        false,
        previousMetrics
      );

      expect(offlineMetrics.isOffline).toBe(true);
      expect(offlineMetrics.offlineWarning).toBe('Offline - Data may be outdated');
      expect(offlineMetrics.activeSessionsCount).toBe(2);
      expect(offlineMetrics.totalExpectedCash).toBe(520);
      expect(offlineMetrics.totalCollected).toBe(500);
    });
  });

  describe('useSupervisorMetrics hook', () => {
    beforeEach(() => {
      act(() => {
        syncManager.setOnline(true);
      });
    });

    afterEach(() => {
      act(() => {
        syncManager.setOnline(true);
      });
    });

    it('returns real-time aggregated metrics from provided sessions', () => {
      const { result } = renderHook(() =>
        useSupervisorMetrics({ sessions: [mockSession1, mockSession2] })
      );

      expect(result.current.activeSessionsCount).toBe(2);
      expect(result.current.totalExpectedCash).toBe(520);
      expect(result.current.totalCollected).toBe(500);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.offlineWarning).toBeNull();
    });

    it('reacts to offline network events and exposes the offline warning indicator', () => {
      const { result } = renderHook(() =>
        useSupervisorMetrics({ sessions: [mockSession1] })
      );

      expect(result.current.isOffline).toBe(false);
      expect(result.current.offlineWarning).toBeNull();

      // Trigger offline event via syncManager
      act(() => {
        syncManager.setOnline(false);
      });

      expect(result.current.isOffline).toBe(true);
      expect(result.current.offlineWarning).toBe(OFFLINE_WARNING_MESSAGE);
      expect(result.current.totalExpectedCash).toBe(350);
    });

    it('updates metrics dynamically when sessions change or payments sync', () => {
      let currentSessions = [mockSession1];
      const { result, rerender } = renderHook(() =>
        useSupervisorMetrics({ sessions: currentSessions })
      );

      expect(result.current.activeSessionsCount).toBe(1);
      expect(result.current.totalExpectedCash).toBe(350);

      // Payment sync occurs: session 1 receives +100 cash payment
      const updatedSession1: CashierSession = {
        ...mockSession1,
        currentCashTotal: 450,
        cashPaymentsTotal: 350,
      };
      currentSessions = [updatedSession1, mockSession2];

      rerender();

      expect(result.current.activeSessionsCount).toBe(2);
      expect(result.current.totalExpectedCash).toBe(620); // 450 + 170
      expect(result.current.totalCashPayments).toBe(470); // 350 + 120
    });
  });
});
