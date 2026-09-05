import type { CashierSession } from '../session/sessionStore';
import { useSessionStore } from '../session/sessionStore';
import { db, CreditAmbarDB } from '../../lib/dexie';
import { syncManager, SyncManager } from '../../lib/syncManager';

export interface ForceCloseOptions {
  supervisorId?: string;
  reason?: string;
  syncManager?: SyncManager;
  db?: CreditAmbarDB;
}

export interface ForceCloseResult {
  success: boolean;
  closedSession?: CashierSession;
  error?: string;
}

/**
 * Executes supervisor force-close on a cashier session.
 * 1. Sets session status to 'closing' to reject new incoming transactions immediately.
 * 2. Checks for pending sync transactions for this session.
 * 3. Flushes the sync queue if online so pending transactions are committed.
 * 4. Terminates the session with status 'closed' and reason 'Closed by Supervisor'.
 */
export async function forceCloseSessionAction(
  sessionId: string,
  options?: ForceCloseOptions
): Promise<ForceCloseResult> {
  const store = useSessionStore.getState();
  const session = store.activeSession;

  if (!session || session.id !== sessionId || (session.status !== 'open' && session.status !== 'closing')) {
    return {
      success: false,
      error: 'Session not found or not active.',
    };
  }

  // 1. Mark session as closing to prevent any new transactions immediately
  if (session.status === 'open') {
    const markRes = store.markSessionClosing(sessionId);
    if (!markRes.success) {
      return {
        success: false,
        error: markRes.error || 'Failed to lock session for closing.',
      };
    }
  }

  const effectiveSyncManager = options?.syncManager || syncManager;
  const effectiveDb = options?.db || db;
  const supervisorId = options?.supervisorId || 'supervisor';
  const reason = options?.reason || 'Closed by Supervisor';

  // 2. Check if there are pending transactions in the queue for this session
  try {
    const pendingItems = await effectiveDb.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    const sessionPendingItems = pendingItems.filter(
      (item) => item.payload?.cashier_session_id === sessionId
    );

    // 3. If online and pending items exist, flush/process the sync queue
    if (sessionPendingItems.length > 0 && effectiveSyncManager.isOnline()) {
      await effectiveSyncManager.processQueue();
    }
  } catch {
    // If db/syncQueue query fails or offline, continue with session termination
  }

  // 4. Terminate the session as closed by supervisor
  const closeRes = useSessionStore.getState().forceCloseSession(sessionId, supervisorId, reason);

  return {
    success: closeRes.success,
    closedSession: closeRes.closedSession,
    error: closeRes.error,
  };
}
