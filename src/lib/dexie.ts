import Dexie, { Table } from 'dexie';
import type { Customer, Product, CreditTransaction, TransactionItem } from '../types/database';

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncEntity = 'credit_transactions' | 'customers' | 'products' | 'transaction_items';
export type SyncQueueStatus = 'pending' | 'syncing' | 'failed';

export interface SyncQueueItem {
  id?: number;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  status: SyncQueueStatus;
  lastError?: string;
}

export interface LocalCustomer extends Customer {
  synced?: boolean;
}

export interface LocalProduct extends Product {
  synced?: boolean;
}

export interface LocalCreditTransaction extends CreditTransaction {
  synced?: boolean;
}

export interface LocalTransactionItem extends TransactionItem {
  synced?: boolean;
}

export class CreditAmbarDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  customers!: Table<LocalCustomer, string>;
  products!: Table<LocalProduct, string>;
  creditTransactions!: Table<LocalCreditTransaction, string>;
  transactionItems!: Table<LocalTransactionItem, string>;

  constructor(databaseName = 'CreditAmbarDB') {
    super(databaseName);

    this.version(1).stores({
      syncQueue: '++id, entity, status, createdAt, retryCount',
      customers: 'id, store_id, name, balance, synced',
      products: 'id, store_id, name, sku, synced',
      creditTransactions: 'id, store_id, customer_id, status, created_at, synced',
      transactionItems: 'id, transaction_id, product_id, synced',
    });
  }
}

export const db = new CreditAmbarDB();
