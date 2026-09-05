import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { db, CreditAmbarDB, type SyncQueueItem, type SyncEntity, type SyncOperation } from './dexie';
import { supabase } from './supabase';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'idle' | 'error';

export interface SyncManagerOptions {
  db?: CreditAmbarDB;
  supabase?: SupabaseClient<Database>;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
}

export class SyncManager {
  private db: CreditAmbarDB;
  private supabase: SupabaseClient<Database>;
  private maxRetries: number;
  private _isOnline: boolean;
  private _status: SyncStatus;
  private _isSyncing: boolean = false;
  private _autoSyncActive: boolean = false;
  private _listeners: Set<(status: SyncStatus) => void> = new Set();

  private handleOnline = () => {
    this.setOnline(true);
    if (this._autoSyncActive) {
      void this.processQueue();
    }
  };

  private handleOffline = () => {
    this.setOnline(false);
  };

  constructor(options: SyncManagerOptions = {}) {
    this.db = options.db || db;
    this.supabase = options.supabase || supabase;
    this.maxRetries = options.maxRetries ?? 3;

    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this._isOnline = initialOnline;
    this._status = initialOnline ? 'idle' : 'offline';
  }

  public isOnline(): boolean {
    return this._isOnline;
  }

  public setOnline(online: boolean): void {
    if (this._isOnline !== online) {
      this._isOnline = online;
      this.setStatus(online ? 'online' : 'offline');
    }
  }

  public getStatus(): SyncStatus {
    return this._status;
  }

  public onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this._listeners.add(listener);
    listener(this._status);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private setStatus(newStatus: SyncStatus): void {
    this._status = newStatus;
    this._listeners.forEach((listener) => listener(newStatus));
  }

  public async enqueue(item: {
    entity: SyncEntity;
    operation: SyncOperation;
    payload: Record<string, any>;
  }): Promise<number> {
    const queueItem: SyncQueueItem = {
      entity: item.entity,
      operation: item.operation,
      payload: item.payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    const id = await this.db.syncQueue.add(queueItem);

    if (this._isOnline && !this._isSyncing && this._autoSyncActive) {
      void this.processQueue();
    }

    return id as number;
  }

  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt');
  }

  public async processQueue(): Promise<SyncResult> {
    if (!this._isOnline || this._isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this._isSyncing = true;
    this.setStatus('syncing');

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingItems = await this.getPendingQueue();

      for (const item of pendingItems) {
        if (!item.id) continue;

        try {
          await this.syncItem(item);

          // On success, delete from syncQueue
          await this.db.syncQueue.delete(item.id);

          // Update local mirror table synced flag if applicable
          await this.markLocalSynced(item.entity, item.payload.id);

          syncedCount++;
        } catch (err: any) {
          failedCount++;
          const nextRetry = (item.retryCount || 0) + 1;
          const isDeadLetter = nextRetry >= this.maxRetries;

          await this.db.syncQueue.update(item.id, {
            retryCount: nextRetry,
            status: isDeadLetter ? 'failed' : 'pending',
            lastError: err?.message || String(err),
          });
        }
      }
    } finally {
      this._isSyncing = false;
      const finalStatus: SyncStatus =
        failedCount > 0 ? 'error' : this._isOnline ? 'idle' : 'offline';
      this.setStatus(finalStatus);
    }

    return { syncedCount, failedCount };
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const table = this.supabase.from(item.entity as any) as any;

    if (item.operation === 'INSERT') {
      const { error } = await table.insert(item.payload);
      if (error) throw error;
    } else if (item.operation === 'UPDATE') {
      const { error } = await table.update(item.payload).eq('id', item.payload.id);
      if (error) throw error;
    } else if (item.operation === 'DELETE') {
      const { error } = await table.delete().eq('id', item.payload.id);
      if (error) throw error;
    }
  }

  private async markLocalSynced(entity: SyncEntity, recordId: string | undefined): Promise<void> {
    if (!recordId) return;

    try {
      if (entity === 'credit_transactions') {
        await this.db.creditTransactions.update(recordId, { synced: true });
      } else if (entity === 'customers') {
        await this.db.customers.update(recordId, { synced: true });
      } else if (entity === 'products') {
        await this.db.products.update(recordId, { synced: true });
      }
    } catch {
      // Ignored if not stored locally
    }
  }

  public startAutoSync(): void {
    if (this._autoSyncActive) return;
    this._autoSyncActive = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    if (this._isOnline) {
      void this.processQueue();
    }
  }

  public stopAutoSync(): void {
    this._autoSyncActive = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  public async clearQueue(): Promise<void> {
    await this.db.syncQueue.clear();
  }
}

export const syncManager = new SyncManager();
