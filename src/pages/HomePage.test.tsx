import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { db } from '../lib/dexie';
import { useAuthStore } from '../store/authStore';
import type { Customer, CreditTransaction } from '../types/database';

describe('HomePage Dashboard Component (Strict TDD)', () => {
  const mockCustomer1: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Diego | Los Pinos',
    phone: '+51987654321',
    credit_limit: 500,
    balance: 476.10,
    created_at: new Date().toISOString(),
  };

  const mockCustomer2: Customer = {
    id: 'cust-2',
    store_id: 'store-1',
    name: 'Zelmira',
    phone: '+51999888777',
    credit_limit: 300,
    balance: 290.80,
    created_at: new Date().toISOString(),
  };

  const mockCustomer3: Customer = {
    id: 'cust-3',
    store_id: 'store-1',
    name: 'Piero Zapata',
    phone: '+51911223344',
    credit_limit: 300,
    balance: 254.10,
    created_at: new Date().toISOString(),
  };

  const mockTxToday: CreditTransaction = {
    id: 'tx-1',
    store_id: 'store-1',
    customer_id: 'cust-1',
    cashier_pin_hash: 'admin',
    total_amount: 50,
    status: 'completed',
    created_at: new Date().toISOString(),
    synced: false,
    type: 'credit_purchase',
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.bulkPut([mockCustomer1, mockCustomer2, mockCustomer3]);
    await db.creditTransactions.put(mockTxToday);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
  });

  const renderHomePage = () => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  };

  describe('Hero Card & Key Aggregated Metrics', () => {
    it('renders Total por Cobrar calculated in Soles (S/) and pending accounts count', async () => {
      renderHomePage();

      expect(screen.getByTestId('page-home')).toBeInTheDocument();
      expect(screen.getByText(/total por cobrar/i)).toBeInTheDocument();

      // Total receivable: 476.10 + 290.80 + 254.10 = 1021.00
      await waitFor(() => {
        expect(screen.getByText(/1,021\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/3 cuentas pendientes/i)).toBeInTheDocument();
      });
    });

    it('renders daily metrics for Fiado Hoy and Cobrado Hoy', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/fiado hoy/i)).toBeInTheDocument();
        expect(screen.getByText(/cobrado hoy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Primary Action Buttons & Modals', () => {
    it('delegates global actions to TabBar and keeps home dashboard focused on metrics', async () => {
      renderHomePage();

      // Standalone redundant action buttons are deprecated from home view
      expect(screen.queryByRole('button', { name: /nuevo fiado/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /registrar abono/i })).not.toBeInTheDocument();
    });
  });

  describe('Mayores Deudas Ranking', () => {
    it('lists top debtors ordered by highest pending balance with direct Abonar button', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Pinos')).toBeInTheDocument();
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
        expect(screen.getByText('Piero Zapata')).toBeInTheDocument();
      });

      // Diego owes 476.10
      expect(screen.getByText(/476\.10/i)).toBeInTheDocument();

      // Click Abonar on top debtor
      const abonarButtons = screen.getAllByRole('button', { name: /abonar/i });
      expect(abonarButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(abonarButtons[0]);

      // Opens payment modal preloaded with debtor's balance
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar abono \/ pago/i)).toBeInTheDocument();
    });
  });

  describe('Global Search', () => {
    it('filters customer dropdown on search and provides quick action buttons', async () => {
      renderHomePage();

      const searchInput = screen.getByPlaceholderText(/buscar cliente/i);
      fireEvent.change(searchInput, { target: { value: 'Zelmira' } });

      await waitFor(() => {
        expect(screen.getAllByText('Zelmira').length).toBeGreaterThanOrEqual(1);
      });

      const fiarQuickBtn = screen.getByRole('button', { name: /\+ fiar/i });
      expect(fiarQuickBtn).toBeInTheDocument();

      fireEvent.click(fiarQuickBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar nuevo fiado/i)).toBeInTheDocument();
    });
  });

  describe('Store partitioning (T3)', () => {
    const otherStoreCustomer: Customer = {
      id: 'cust-other',
      store_id: 'store-test',
      name: 'Test Lab Customer',
      phone: '+51000000000',
      credit_limit: 500,
      balance: 999.99,
      created_at: new Date().toISOString(),
    };

    const otherStoreTx: CreditTransaction = {
      id: 'tx-other',
      store_id: 'store-test',
      customer_id: 'cust-other',
      cashier_pin_hash: 'admin',
      total_amount: 777,
      status: 'completed',
      created_at: new Date().toISOString(),
      synced: false,
      type: 'credit_purchase',
    };

    it('excludes customers and transactions from other stores', async () => {
      await db.customers.put(otherStoreCustomer);
      await db.creditTransactions.put(otherStoreTx);
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Pinos')).toBeInTheDocument();
      });
      expect(screen.queryByText('Test Lab Customer')).not.toBeInTheDocument();
      // Total receivable must not include the 999.99 from the other store
      expect(screen.queryByText(/2,020\.99/i)).not.toBeInTheDocument();
      expect(screen.getByText(/1,021\.00/i)).toBeInTheDocument();
    });

    it('shows only the test store rows while test mode is active', async () => {
      await db.customers.put(otherStoreCustomer);
      await db.creditTransactions.put(otherStoreTx);
      useAuthStore.getState().enableTestMode();
      try {
        renderHomePage();

        await waitFor(() => {
          expect(screen.getByText('Test Lab Customer')).toBeInTheDocument();
        });
        expect(screen.queryByText('Diego | Los Pinos')).not.toBeInTheDocument();
      } finally {
        useAuthStore.getState().disableTestMode();
      }
    });
  });
});
