import { useState, useEffect, useCallback, useRef } from 'react';
import type { CashierSession } from '../session/sessionStore';
import { useSessionStore } from '../session/sessionStore';
import { syncManager } from '../../lib/syncManager';
import {
  aggregateSupervisorMetrics,
  SupervisorMetrics,
} from './supervisorMetrics';

export interface UseSupervisorMetricsOptions {
  sessions?: CashierSession[];
  isOnline?: boolean;
}

export function useSupervisorMetrics(options?: UseSupervisorMetricsOptions) {
  const storeActiveSession = useSessionStore((state) => state.activeSession);
  const storeLastClosedSession = useSessionStore((state) => state.lastClosedSession);

  const getEffectiveSessions = useCallback((): CashierSession[] => {
    if (options?.sessions !== undefined) {
      return options.sessions;
    }
    const defaultSessions: CashierSession[] = [];
    if (storeActiveSession) defaultSessions.push(storeActiveSession);
    if (storeLastClosedSession) defaultSessions.push(storeLastClosedSession);
    return defaultSessions;
  }, [options?.sessions, storeActiveSession, storeLastClosedSession]);

  const [onlineState, setOnlineState] = useState<boolean>(() => {
    if (options?.isOnline !== undefined) return options.isOnline;
    return syncManager.isOnline();
  });

  const lastKnownMetricsRef = useRef<SupervisorMetrics | null>(null);

  useEffect(() => {
    if (options?.isOnline !== undefined) {
      setOnlineState(options.isOnline);
      return;
    }

    const unsubscribe = syncManager.onStatusChange((status) => {
      const isOnline = status !== 'offline';
      setOnlineState((prev) => (prev !== isOnline ? isOnline : prev));
    });

    const handleWindowOnline = () => setOnlineState((prev) => (!prev ? true : prev));
    const handleWindowOffline = () => setOnlineState((prev) => (prev ? false : prev));

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleWindowOnline);
      window.addEventListener('offline', handleWindowOffline);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleWindowOnline);
        window.removeEventListener('offline', handleWindowOffline);
      }
    };
  }, [options?.isOnline]);

  const effectiveSessions = getEffectiveSessions();

  const metrics = aggregateSupervisorMetrics(
    effectiveSessions,
    onlineState,
    lastKnownMetricsRef.current
  );

  if (onlineState) {
    lastKnownMetricsRef.current = metrics;
  }

  return {
    ...metrics,
    refresh: () => {
      // Re-triggers render with updated metrics
      setOnlineState(options?.isOnline !== undefined ? options.isOnline : syncManager.isOnline());
    },
  };
}
