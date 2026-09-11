import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomersPage } from './CustomersPage';
import { db } from '../lib/dexie';
import { useAuthStore } from '../store/authStore';
import type { Customer, CreditTransaction } from '../types/database';

describe('CustomersPage Component (Strict TDD)', () => {
  const mockCustomer1: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Diego | Los Angeles',
    phone: '927268714',
    credit_limit: 500,
    balance: 476.10,
    created_at: '2026-09-01T10:00:00Z',
  };

  const mockCustomer2: Customer = {
    id: 'cust-2',
    store_id: 'store-1',
    name: 'Zelmira',
    phone: '',
    credit_limit: 300,
    balance: 290.80,
    created_at: '2026-09-02T10:00:00Z',
  };

  const mockCustomer3: Customer = {
    id: 'cust-3',
    store_id: 'store-1',
    name: 'Sr. Otoya',
    phone: '927268714',
    credit_limit: 200,
    balance: 0,
    created_at: '2026-09-03T10:00:00Z',
  };

  const mockTx1: CreditTransaction = {
    id: 'tx-1',
    store_id: 'store-1',
    customer_id: 'cust-1',
    cashier_pin_hash: 'admin',
    total_amount: 100,
    status: 'completed',
    created_at: '2026-09-04T12:00:00Z',
    synced: false,
    type: 'credit_purchase',
    notes: 'Compra víveres',
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.bulkPut([mockCustomer1, mockCustomer2, mockCustomer3]);
    await db.creditTransactions.put(mockTx1);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
  });

  const renderCustomersPage = () => {
    return render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    );
  };

  describe('UI & Aggregated Statistics Display', () => {
    it('renders page layout, header, search bar, and action buttons', async () => {
      renderCustomersPage();

      expect(screen.getByTestId('page-customers')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /clientes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ nuevo cliente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mayor deuda/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/buscar clientes por nombre o teléfono/i)).toBeInTheDocument();
    });

    it('calculates and displays aggregated stats accurately (Total Clientes, Con Deuda, Total Pendiente)', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Total Clientes')).toBeInTheDocument();
        expect(screen.getByText('Con Deuda')).toBeInTheDocument();
        expect(screen.getByText('Total Pendiente')).toBeInTheDocument();

        // Total Clientes: 3
        expect(screen.getByText('3')).toBeInTheDocument();
        // Con Deuda: 2 (Diego and Zelmira)
        expect(screen.getByText('2')).toBeInTheDocument();
        // Total Pendiente: 476.10 + 290.80 = 766.90
        expect(screen.getByText(/766\.90/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Filters (Todos, Con Deuda, Al día)', () => {
    it('shows all customers on "Todos" tab', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
        expect(screen.getByText('Sr. Otoya')).toBeInTheDocument();
      });
    });

    it('filters only debtors when "Con Deuda" tab is active', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const conDeudaTab = screen.getByRole('button', { name: /con deuda/i });
      fireEvent.click(conDeudaTab);

      expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      expect(screen.getByText('Zelmira')).toBeInTheDocument();
      expect(screen.queryByText('Sr. Otoya')).not.toBeInTheDocument();
    });

    it('filters only clean customers when "Al día" tab is active', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const alDiaTab = screen.getByRole('button', { name: /al día/i });
      fireEvent.click(alDiaTab);

      expect(screen.getByText('Sr. Otoya')).toBeInTheDocument();
      expect(screen.queryByText('Diego | Los Angeles')).not.toBeInTheDocument();
      expect(screen.queryByText('Zelmira')).not.toBeInTheDocument();
    });
  });

  describe('Search and Sorting', () => {
    it('filters customers by name or phone query and allows clearing', async () => {
      renderCustomersPage();

      const searchInput = screen.getByPlaceholderText(/buscar clientes por nombre o teléfono/i);
      fireEvent.change(searchInput, { target: { value: 'Zelmira' } });

      await waitFor(() => {
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
        expect(screen.queryByText('Diego | Los Angeles')).not.toBeInTheDocument();
        expect(screen.queryByText('Sr. Otoya')).not.toBeInTheDocument();
      });

      // Clear search button
      const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
      });
    });

    it('toggles sorting options when clicking the sort button', async () => {
      renderCustomersPage();

      const sortBtn = screen.getByRole('button', { name: /mayor deuda/i });
      expect(sortBtn).toBeInTheDocument();

      // Cycle to Nombre A-Z
      fireEvent.click(sortBtn);
      expect(screen.getByRole('button', { name: /nombre a-z/i })).toBeInTheDocument();

      // Cycle to Más Recientes
      fireEvent.click(screen.getByRole('button', { name: /nombre a-z/i }));
      expect(screen.getByRole('button', { name: /más recientes/i })).toBeInTheDocument();
    });
  });

  describe('Modal Integrations', () => {
    it('opens NewCustomerModal and registers a new customer', async () => {
      renderCustomersPage();

      const newCustomerBtn = screen.getByRole('button', { name: /\+ nuevo cliente/i });
      fireEvent.click(newCustomerBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText(/ej\. diego/i);
      const phoneInput = screen.getByPlaceholderText(/ej\. 927268714/i);
      const submitBtn = screen.getByRole('button', { name: /guardar cliente/i });

      fireEvent.change(nameInput, { target: { value: 'Piero Zapata' } });
      fireEvent.change(phoneInput, { target: { value: '911223344' } });
      fireEvent.click(submitBtn);

      // Successfully saved
      await waitFor(() => {
        expect(screen.getByText(/cliente creado con éxito/i)).toBeInTheDocument();
      });

      // Close modal
      const closeBtn = screen.getByRole('button', { name: /listo \/ cerrar/i });
      fireEvent.click(closeBtn);

      // Customer appears in list
      await waitFor(() => {
        expect(screen.getByText('Piero Zapata')).toBeInTheDocument();
      });
    });

    it('opens QuickPaymentModal directly when clicking Abonar on a debtor card', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const abonarButtons = screen.getAllByRole('button', { name: /abonar/i });
      expect(abonarButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(abonarButtons[0]);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar abono \/ pago/i)).toBeInTheDocument();
    });

    it('opens CustomerDetailModal when clicking on a customer card and shows transaction history', async () => {
      renderCustomersPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const diegoCard = screen.getByText('Diego | Los Angeles').closest('div[class*="rounded-3xl"]');
      expect(diegoCard).toBeInTheDocument();
      fireEvent.click(diegoCard!);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/detalle de cuenta/i)).toBeInTheDocument();
      expect(screen.getByText(/deuda actual/i)).toBeInTheDocument();

      // Shows transaction history
      await waitFor(() => {
        expect(screen.getByText('Compra víveres')).toBeInTheDocument();
        expect(screen.getByText(/\+ S\/ 100\.00/i)).toBeInTheDocument();
      });
    });
  });
});
