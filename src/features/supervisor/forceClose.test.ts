import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore } from '../session/sessionStore';
import { db } from '../../lib/dexie';
import { syncManager } from '../../lib/syncManager';
import { supabase } from '../../lib/supabase';
import { forceCloseSessionAction } from './forceCloseAction';

describe('Supervisor Force-Close Session (Strict TDD)', () => {
  beforeEach(async () => {
    useSessionStore.getState().reset();
    await db.syncQueue.clear();
    await db.creditTransactions.clear();
    syncManager.setOnline(true);
    vi.clearAllMocks();
  });

  it('Happy path: force-closes an active session and marks it as Closed by Supervisor', async () => {
    // 1. Open an active cashier session
    const openRes = useSessionStore.getState().openSession({
      cashierId: 'cashier-10',
      cashierName: 'Pedro Gómez',
      storeId: 'store-1',
      startingFloat: 100,
    });
    expect(openRes.success).toBe(true);
    const activeSession = useSessionStore.getState().activeSession!;
    expect(activeSession).toBeDefined();
    expect(activeSession.status).toBe('open');

    // 2. Supervisor force-closes the session
    const result = await forceCloseSessionAction(activeSession.id, {
      supervisorId: 'sup-42',
    });

    expect(result.success).toBe(true);
    expect(result.closedSession).toBeDefined();
    expect(result.closedSession?.status).toBe('closed');
    expect(result.closedSession?.closedBy).toBe('sup-42');
    expect(result.closedSession?.closeReason).toBe('Closed by Supervisor');

    // 3. Confirm session store state is terminated
    expect(useSessionStore.getState().activeSession).toBeNull();
    expect(useSessionStore.getState().lastClosedSession?.id).toBe(activeSession.id);
    expect(useSessionStore.getState().lastClosedSession?.closeReason).toBe('Closed by Supervisor');
  });

  it('Edge case: allows pending sync queue transactions to finish syncing before fully closing, and prevents new transactions', async () => {
    // 1. Open an active cashier session
    useSessionStore.getState().openSession({
      cashierId: 'cashier-11',
      cashierName: 'Ana Ruiz',
      storeId: 'store-1',
      startingFloat: 50,
    });
    const activeSession = useSessionStore.getState().activeSession!;

    // 2. Queue offline transactions for this session
    await db.syncQueue.add({
      entity: 'credit_transactions',
      operation: 'INSERT',
      payload: {
        id: 'tx-pending-1',
        store_id: 'store-1',
        customer_id: 'cust-1',
        total_amount: 150,
        status: 'completed',
        cashier_session_id: activeSession.id,
      },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    });

    await db.syncQueue.add({
      entity: 'credit_transactions',
      operation: 'INSERT',
      payload: {
        id: 'tx-pending-2',
        store_id: 'store-1',
        customer_id: 'cust-2',
        total_amount: 75,
        status: 'completed',
        cashier_session_id: activeSession.id,
      },
      createdAt: Date.now() + 10,
      retryCount: 0,
      status: 'pending',
    });

    // Mock Supabase to succeed on insert
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: insertMock,
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    } as any);

    // 3. Initiate force close
    const forceClosePromise = forceCloseSessionAction(activeSession.id, {
      supervisorId: 'sup-99',
    });

    // Verify: while closing is in flight, new transactions MUST be rejected
    const paymentAttempt = useSessionStore.getState().recordPaymentToSession({
      amount: 40,
      paymentMethod: 'cash',
    });
    expect(paymentAttempt.success).toBe(false);
    expect(paymentAttempt.error).toMatch(/closing|not open|cannot accept/i);

    const closeResult = await forceClosePromise;

    expect(closeResult.success).toBe(true);
    expect(closeResult.closedSession?.status).toBe('closed');
    expect(closeResult.closedSession?.closeReason).toBe('Closed by Supervisor');

    // Verify pending queue was flushed: 0 pending items left in queue
    const remainingPending = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
    expect(remainingPending).toHaveLength(0);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('Edge case: fails gracefully if attempting to force close an already closed session or non-existent session', async () => {
    const result = await forceCloseSessionAction('non-existent-session-id', {
      supervisorId: 'sup-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found|not active/i);
  });

  it('Edge case: closes session as Closed by Supervisor even when offline, keeping pending items safely in Dexie queue', async () => {
    // 1. Open active cashier session
    useSessionStore.getState().openSession({
      cashierId: 'cashier-offline',
      cashierName: 'Elena Vaca',
      storeId: 'store-1',
      startingFloat: 80,
    });
    const session = useSessionStore.getState().activeSession!;

    // 2. Queue offline items
    await db.syncQueue.add({
      entity: 'credit_transactions',
      operation: 'INSERT',
      payload: {
        id: 'tx-offline-1',
        store_id: 'store-1',
        customer_id: 'cust-1',
        total_amount: 50,
        status: 'completed',
        cashier_session_id: session.id,
      },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    });

    // 3. Set offline
    syncManager.setOnline(false);

    // 4. Force close
    const result = await forceCloseSessionAction(session.id, {
      supervisorId: 'sup-off',
    });

    expect(result.success).toBe(true);
    expect(result.closedSession?.status).toBe('closed');
    expect(result.closedSession?.closeReason).toBe('Closed by Supervisor');

    // Dexie pending queue item remains safe for future sync
    const pendingItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
    expect(pendingItems).toHaveLength(1);
    expect(pendingItems[0].payload.id).toBe('tx-offline-1');
  });
});
