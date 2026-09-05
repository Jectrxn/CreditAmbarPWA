import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CreditAmbarDB, type SyncQueueItem } from './dexie';

describe('CreditAmbarDB - Dexie IndexedDB Schema', () => {
  let testDb: CreditAmbarDB;

  beforeEach(async () => {
    testDb = new CreditAmbarDB(`test-schema-${Date.now()}-${Math.random()}`);
    await testDb.open();
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('initializes required object stores and indexes', () => {
    expect(testDb.tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['syncQueue', 'customers', 'products', 'creditTransactions', 'transactionItems'])
    );
  });

  it('stores and queries items in the syncQueue table', async () => {
    const queueItem: SyncQueueItem = {
      entity: 'credit_transactions',
      operation: 'INSERT',
      payload: { id: 'tx-1', total_amount: 1500 },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    const id = await testDb.syncQueue.add(queueItem);
    expect(id).toBeDefined();

    const retrieved = await testDb.syncQueue.get(id);
    expect(retrieved?.entity).toBe('credit_transactions');
    expect(retrieved?.status).toBe('pending');
    expect(retrieved?.payload.total_amount).toBe(1500);
  });

  it('indexes status and entity in syncQueue for filtering', async () => {
    await testDb.syncQueue.bulkAdd([
      {
        entity: 'customers',
        operation: 'INSERT',
        payload: { name: 'A' },
        createdAt: 1000,
        retryCount: 0,
        status: 'pending',
      },
      {
        entity: 'products',
        operation: 'INSERT',
        payload: { name: 'B' },
        createdAt: 2000,
        retryCount: 3,
        status: 'failed',
      },
    ]);

    const pending = await testDb.syncQueue.where('status').equals('pending').toArray();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('customers');

    const failed = await testDb.syncQueue.where('status').equals('failed').toArray();
    expect(failed).toHaveLength(1);
    expect(failed[0].entity).toBe('products');
  });

  it('allows storing local customer and transaction records', async () => {
    await testDb.customers.put({
      id: 'cust-1',
      store_id: 'store-1',
      name: 'Carlos Ruiz',
      phone: '+5491133334444',
      credit_limit: 10000,
      balance: 2000,
      created_at: new Date().toISOString(),
      synced: false,
    });

    const customer = await testDb.customers.get('cust-1');
    expect(customer?.name).toBe('Carlos Ruiz');
    expect(customer?.synced).toBe(false);
  });
});
