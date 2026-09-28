import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  describe('Debt Age & Credit Usage (T3)', () => {
    const agedDebtor: Customer = {
      id: 'cust-aged',
      store_id: 'store-1',
      name: 'Rosa Antigua',
      credit_limit: 500,
      balance: 20,
      created_at: new Date().toISOString(),
    };

    const agedTx: CreditTransaction = {
      id: 'tx-aged',
      store_id: 'store-1',
      customer_id: 'cust-aged',
      cashier_pin_hash: 'admin',
      total_amount: 20,
      status: 'completed',
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      synced: false,
      type: 'credit_purchase',
    };

    const recentDebtor: Customer = {
      id: 'cust-recent',
      store_id: 'store-1',
      name: 'Nueva Reciente',
      credit_limit: 500,
      balance: 150,
      created_at: new Date().toISOString(),
    };

    const recentTx: CreditTransaction = {
      id: 'tx-recent',
      store_id: 'store-1',
      customer_id: 'cust-recent',
      cashier_pin_hash: 'admin',
      total_amount: 150,
      status: 'completed',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      synced: false,
      type: 'credit_purchase',
    };

    const noLimitDebtor: Customer = {
      id: 'cust-nolimit',
      store_id: 'store-1',
      name: 'Sin Limite',
      credit_limit: 0,
      balance: 80,
      created_at: new Date().toISOString(),
    };

    const noLimitTx: CreditTransaction = {
      id: 'tx-nolimit',
      store_id: 'store-1',
      customer_id: 'cust-nolimit',
      cashier_pin_hash: 'admin',
      total_amount: 80,
      status: 'completed',
      created_at: new Date().toISOString(),
      synced: false,
      type: 'credit_purchase',
    };

    it('shows the "Antigua" badge only for debts 30+ days old, not merely high-balance ones', async () => {
      await db.customers.bulkPut([agedDebtor, recentDebtor]);
      await db.creditTransactions.bulkPut([agedTx, recentTx]);

      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Rosa Antigua')).toBeInTheDocument();
      });

      const agedRow = screen.getByText('Rosa Antigua').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      expect(within(agedRow).getByText('Antigua')).toBeInTheDocument();

      const recentRow = screen.getByText('Nueva Reciente').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      expect(within(recentRow).queryByText('Antigua')).not.toBeInTheDocument();
    });

    it('replaces the "Pendiente" label under the amount with the "Antigua" badge for aged debts', async () => {
      await db.customers.bulkPut([agedDebtor, recentDebtor]);
      await db.creditTransactions.bulkPut([agedTx, recentTx]);

      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Rosa Antigua')).toBeInTheDocument();
      });

      const agedRow = screen.getByText('Rosa Antigua').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      const agedAmount = within(agedRow).getByTestId('top-debtor-amount');
      expect(within(agedAmount).getByText('Antigua')).toBeInTheDocument();
      expect(within(agedAmount).queryByText('Pendiente')).not.toBeInTheDocument();

      const recentRow = screen.getByText('Nueva Reciente').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      const recentAmount = within(recentRow).getByTestId('top-debtor-amount');
      expect(within(recentAmount).getByText('Pendiente')).toBeInTheDocument();
      expect(within(recentAmount).queryByText('Antigua')).not.toBeInTheDocument();
    });

    it('hides the credit usage progress bar when the customer has no credit_limit', async () => {
      await db.customers.bulkPut([noLimitDebtor]);
      await db.creditTransactions.bulkPut([noLimitTx]);

      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Sin Limite')).toBeInTheDocument();
      });

      const row = screen.getByText('Sin Limite').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      expect(within(row).queryByTestId('debt-progress-bar')).not.toBeInTheDocument();
    });

    it('shows the credit usage progress bar when credit_limit is set', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Pinos')).toBeInTheDocument();
      });

      const row = screen.getByText('Diego | Los Pinos').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      expect(within(row).getByTestId('debt-progress-bar')).toBeInTheDocument();
    });

    it('still renders the "Antigua" badge under the amount when there is no progress bar (credit_limit 0)', async () => {
      const agedNoLimitDebtor: Customer = {
        id: 'cust-aged-nolimit',
        store_id: 'store-1',
        name: 'Antigua Sin Limite',
        credit_limit: 0,
        balance: 20,
        created_at: new Date().toISOString(),
      };
      const agedNoLimitTx: CreditTransaction = {
        id: 'tx-aged-nolimit',
        store_id: 'store-1',
        customer_id: 'cust-aged-nolimit',
        cashier_pin_hash: 'admin',
        total_amount: 20,
        status: 'completed',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        synced: false,
        type: 'credit_purchase',
      };
      await db.customers.bulkPut([agedNoLimitDebtor]);
      await db.creditTransactions.bulkPut([agedNoLimitTx]);

      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Antigua Sin Limite')).toBeInTheDocument();
      });

      const row = screen.getByText('Antigua Sin Limite').closest('[data-testid="top-debtor-row"]') as HTMLElement;
      expect(within(within(row).getByTestId('top-debtor-amount')).getByText('Antigua')).toBeInTheDocument();
      expect(within(row).queryByTestId('debt-progress-bar')).not.toBeInTheDocument();
    });
  });

  describe('Legibility without visual redesign (T6)', () => {
    it('renders no 8px or 9px text sizes on the home page', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Pinos')).toBeInTheDocument();
      });

      const container = screen.getByTestId('page-home');
      expect(container.innerHTML).not.toMatch(/text-\[8px\]/);
      expect(container.innerHTML).not.toMatch(/text-\[9px\]/);
    });

    it('expands the invisible hit-area of WhatsApp, Abonar and the numeric toggle without changing their visible size', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Pinos')).toBeInTheDocument();
      });

      const whatsappLink = screen.getByRole('link', { name: /whatsapp a diego/i });
      expect(whatsappLink.className).toContain("before:content-['']");

      const abonarButtons = screen.getAllByRole('button', { name: /abonar/i });
      expect(abonarButtons[0].className).toContain("before:content-['']");

      const numericToggle = screen.getByRole('button', { name: /teclado numérico/i });
      expect(numericToggle.className).toContain("before:content-['']");
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
