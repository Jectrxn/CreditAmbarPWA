import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CustomerDetailModal } from './CustomerDetailModal';
import { db } from '../../lib/dexie';
import { useAuthStore } from '../../store/authStore';
import type { Customer } from '../../types/database';

describe('CustomerDetailModal store partitioning (T3)', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Diego | Los Angeles',
    phone: '927268714',
    credit_limit: 500,
    balance: 100,
    created_at: '2026-09-01T10:00:00Z',
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.put(mockCustomer);
    await db.creditTransactions.bulkPut([
      {
        id: 'tx-own',
        store_id: 'store-1',
        customer_id: 'cust-1',
        cashier_pin_hash: 'admin',
        total_amount: 100,
        status: 'completed',
        created_at: new Date().toISOString(),
        synced: false,
        type: 'credit_purchase',
        notes: 'Own store purchase',
      },
      {
        id: 'tx-foreign',
        store_id: 'store-test',
        customer_id: 'cust-1',
        cashier_pin_hash: 'admin',
        total_amount: 555,
        status: 'completed',
        created_at: new Date().toISOString(),
        synced: false,
        type: 'credit_purchase',
        notes: 'Foreign store purchase',
      },
    ]);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
  });

  it('shows only active-store transactions for the customer', async () => {
    render(
      <CustomerDetailModal
        isOpen={true}
        onClose={() => {}}
        customer={mockCustomer}
        onOpenCreditModal={() => {}}
        onOpenPaymentModal={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Own store purchase')).toBeInTheDocument();
    });
    expect(screen.queryByText('Foreign store purchase')).not.toBeInTheDocument();
    expect(screen.queryByText(/555\.00/)).not.toBeInTheDocument();
  });
});
