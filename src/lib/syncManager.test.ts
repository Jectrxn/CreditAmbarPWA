import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreditAmbarDB } from './dexie';
import { SyncManager, type SyncStatus } from './syncManager';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

describe('SyncManager - Offline Queue & Auto-Sync Engine', () => {
  let db: CreditAmbarDB;
  let mockSupabase: Partial<SupabaseClient<Database>>;
  let syncManager: SyncManager;

  beforeEach(async () => {
    // Unique in-memory test DB instance
    const dbName = `test-creditambar-${Date.now()}-${Math.random()}`;
    db = new CreditAmbarDB(dbName);
    await db.open();

    mockSupabase = {
      from: vi.fn(),
    } as any;

    syncManager = new SyncManager({
      db,
      supabase: mockSupabase as SupabaseClient<Database>,
      maxRetries: 3,
      retryDelayMs: 10,
    });
  });

  afterEach(async () => {
    syncManager.stopAutoSync();
    await db.delete();
  });

  describe('Offline Queue Persistence', () => {
    it('persists queued transactions in Dexie IndexedDB when offline', async () => {
      syncManager.setOnline(false);

      const queueId = await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: {
          id: 'tx-offline-1',
          store_id: 'store-1',
          customer_id: 'cust-1',
          total_amount: 1200,
          cashier_pin_hash: 'pin-hash',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      });

      expect(queueId).toBeGreaterThan(0);

      // Verify item exists in Dexie syncQueue
      const queuedItems = await db.syncQueue.toArray();
      expect(queuedItems).toHaveLength(1);
      expect(queuedItems[0].id).toBe(queueId);
      expect(queuedItems[0].entity).toBe('credit_transactions');
      expect(queuedItems[0].status).toBe('pending');
      expect(queuedItems[0].retryCount).toBe(0);
      expect(queuedItems[0].payload.total_amount).toBe(1200);
    });

    it('persists multiple operations in FIFO order in the queue', async () => {
      syncManager.setOnline(false);

      const id1 = await syncManager.enqueue({
        entity: 'customers',
        operation: 'INSERT',
        payload: { id: 'c-1', name: 'Alice' },
      });

      const id2 = await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-2', total_amount: 500 },
      });

      const pending = await syncManager.getPendingQueue();
      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe(id1);
      expect(pending[1].id).toBe(id2);
      expect(pending[0].entity).toBe('customers');
      expect(pending[1].entity).toBe('credit_transactions');
    });
  });

  describe('Online Sync Execution', () => {
    it('processes queued item successfully and removes it from Dexie queue', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 'tx-1' }], error: null });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      syncManager.setOnline(true);

      await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-1', total_amount: 3000 },
      });

      const result = await syncManager.processQueue();

      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('credit_transactions');
      expect(mockInsert).toHaveBeenCalledWith({ id: 'tx-1', total_amount: 3000 });

      // After successful sync, item is removed from queue
      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('handles UPDATE operation sync to Supabase table', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'tx-1' }], error: null }),
      });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      syncManager.setOnline(true);

      await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'UPDATE',
        payload: { id: 'tx-1', status: 'cancelled' },
      });

      const result = await syncManager.processQueue();

      expect(result.syncedCount).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('credit_transactions');
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'tx-1', status: 'cancelled' });

      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('handles DELETE operation sync to Supabase table', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      syncManager.setOnline(true);

      await syncManager.enqueue({
        entity: 'customers',
        operation: 'DELETE',
        payload: { id: 'c-delete-1' },
      });

      const result = await syncManager.processQueue();

      expect(result.syncedCount).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('customers');
      expect(mockDelete).toHaveBeenCalledWith();

      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('updates local mirror table synced flag upon successful sync', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 'cust-1' }], error: null });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      // Save customer record locally in Dexie first with synced: false
      await db.customers.put({
        id: 'cust-local-1',
        store_id: 'store-1',
        name: 'Ana Gomez',
        credit_limit: 20000,
        balance: 0,
        created_at: new Date().toISOString(),
        synced: false,
      });

      syncManager.setOnline(true);

      await syncManager.enqueue({
        entity: 'customers',
        operation: 'INSERT',
        payload: { id: 'cust-local-1', name: 'Ana Gomez' },
      });

      await syncManager.processQueue();

      const updatedLocal = await db.customers.get('cust-local-1');
      expect(updatedLocal?.synced).toBe(true);
    });

    it('does not attempt sync when offline and returns zero counts', async () => {
      syncManager.setOnline(false);

      await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-1', total_amount: 100 },
      });

      const result = await syncManager.processQueue();

      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();

      const pending = await syncManager.getPendingQueue();
      expect(pending).toHaveLength(1);
    });
  });

  describe('Sync Retries and Error Handling', () => {
    it('increments retryCount and retains item when sync fails with retryable error', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network connection timeout', code: '503' },
      });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      syncManager.setOnline(true);

      const queueId = await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-fail-1', total_amount: 900 },
      });

      const result = await syncManager.processQueue();

      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);

      // Verify item remains in queue with incremented retry count
      const item = await db.syncQueue.get(queueId);
      expect(item).toBeDefined();
      expect(item?.retryCount).toBe(1);
      expect(item?.status).toBe('pending');
      expect(item?.lastError).toContain('Network connection timeout');
    });

    it('marks item as failed when maxRetries threshold is reached', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Persistent Database Error', code: '500' },
      });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      syncManager.setOnline(true);

      const queueId = await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-deadletter', total_amount: 900 },
      });

      // 3 attempts (maxRetries = 3)
      await syncManager.processQueue(); // retryCount = 1
      await syncManager.processQueue(); // retryCount = 2
      const thirdRun = await syncManager.processQueue(); // retryCount = 3 -> status: 'failed'

      expect(thirdRun.failedCount).toBe(1);

      const item = await db.syncQueue.get(queueId);
      expect(item).toBeDefined();
      expect(item?.retryCount).toBe(3);
      expect(item?.status).toBe('failed');
      expect(item?.lastError).toContain('Persistent Database Error');

      // Subsequent processQueue should not retry dead-letter failed items
      const fourthRun = await syncManager.processQueue();
      expect(fourthRun.syncedCount).toBe(0);
      expect(fourthRun.failedCount).toBe(0);
    });
  });

  describe('Network Listeners and Status Orchestration', () => {
    it('notifies status listeners on connection state changes and sync activity', async () => {
      const statusHistory: SyncStatus[] = [];
      const unsubscribe = syncManager.onStatusChange((status) => {
        statusHistory.push(status);
      });

      syncManager.setOnline(false);
      expect(syncManager.isOnline()).toBe(false);

      syncManager.setOnline(true);
      expect(syncManager.isOnline()).toBe(true);

      unsubscribe();
      syncManager.setOnline(false);

      expect(statusHistory).toContain('offline');
      expect(statusHistory).toContain('online');
    });

    it('automatically triggers queue sync when transitioning from offline to online', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 'tx-auto-1' }], error: null });
      (mockSupabase.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      syncManager.startAutoSync();
      syncManager.setOnline(false);

      await syncManager.enqueue({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: { id: 'tx-auto-1', total_amount: 1500 },
      });

      // Simulate online window event
      syncManager.setOnline(true);
      window.dispatchEvent(new Event('online'));

      // Wait a tick for auto-sync promise
      await new Promise((resolve) => setTimeout(resolve, 50));

      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(0);
      expect(mockInsert).toHaveBeenCalledWith({ id: 'tx-auto-1', total_amount: 1500 });
    });
  });
});
