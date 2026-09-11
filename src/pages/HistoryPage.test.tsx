import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from './HistoryPage';
import { db } from '../lib/dexie';
import { useAuthStore } from '../store/authStore';
import type { Customer, CreditTransaction } from '../types/database';

describe('HistoryPage / Cobros Component (Strict TDD)', () => {
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
    name: 'Piero Zapata',
    phone: '911223344',
    credit_limit: 300,
    balance: 254.10,
    created_at: '2026-09-03T10:00:00Z',
  };

  const mockCustomer4: Customer = {
    id: 'cust-4',
    store_id: 'store-1',
    name: 'Marcos Rivas',
    phone: '',
    credit_limit: 200,
    balance: 88.60,
    created_at: '2026-09-04T10:00:00Z',
  };

  const mockCustomer5: Customer = {
    id: 'cust-5',
    store_id: 'store-1',
    name: 'Sr. Otoya',
    phone: '927268714',
    credit_limit: 100,
    balance: 0,
    created_at: '2026-09-05T10:00:00Z',
  };

  const mockTx1: CreditTransaction = {
    id: 'tx-1',
    store_id: 'store-1',
    customer_id: 'cust-1',
    cashier_pin_hash: 'admin',
    total_amount: 100,
    status: 'completed',
    created_at: new Date().toISOString(),
    synced: false,
    type: 'credit_purchase',
    notes: 'Compra víveres',
  };

  const mockTx2: CreditTransaction = {
    id: 'tx-2',
    store_id: 'store-1',
    customer_id: 'cust-1',
    cashier_pin_hash: 'admin',
    total_amount: 30,
    status: 'completed',
    created_at: new Date().toISOString(),
    synced: false,
    type: 'payment',
    payment_method: 'cash',
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.bulkPut([
      mockCustomer1,
      mockCustomer2,
      mockCustomer3,
      mockCustomer4,
      mockCustomer5,
    ]);
    await db.creditTransactions.bulkPut([mockTx1, mockTx2]);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
  });

  const renderHistoryPage = () => {
    return render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );
  };

  describe('Hero Card & Key Aggregated Metrics', () => {
    it('renders Módulo de Cobranzas hero card with total receivable and debt counts', async () => {
      renderHistoryPage();

      expect(screen.getByTestId('page-history')).toBeInTheDocument();
      expect(screen.getByText(/módulo de cobranzas/i)).toBeInTheDocument();
      expect(screen.getByText(/• por cobrar/i)).toBeInTheDocument();

      // Total receivable: 476.10 + 290.80 + 254.10 + 88.60 = 1109.60
      await waitFor(() => {
        expect(screen.getByText(/1,109\.60/i)).toBeInTheDocument();
        expect(screen.getByText(/4 clientes con cuentas activas/i)).toBeInTheDocument();
        expect(screen.getByText(/4 de 5/i)).toBeInTheDocument();
        expect(screen.getAllByText(/476\.10/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Filter Tabs (Solo Deuda, ≥ S/ 50, Todos)', () => {
    it('defaults to "Solo Deuda" tab and filters out clean accounts', async () => {
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
        expect(screen.getByText('Piero Zapata')).toBeInTheDocument();
        expect(screen.getByText('Marcos Rivas')).toBeInTheDocument();
        // Sr. Otoya has 0 balance, should not appear in Solo Deuda
        expect(screen.queryByText('Sr. Otoya')).not.toBeInTheDocument();
      });
    });

    it('filters debtors with balance >= S/ 50 when "≥ S/ 50" tab is selected', async () => {
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const highDebtTab = screen.getByRole('button', { name: /≥ s\/ 50/i });
      fireEvent.click(highDebtTab);

      expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      expect(screen.getByText('Zelmira')).toBeInTheDocument();
      expect(screen.getByText('Piero Zapata')).toBeInTheDocument();
      expect(screen.getByText('Marcos Rivas')).toBeInTheDocument();
      expect(screen.queryByText('Sr. Otoya')).not.toBeInTheDocument();
    });

    it('shows all customers when "Todos" tab is selected', async () => {
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const todosTab = screen.getByRole('button', { name: /todos/i });
      fireEvent.click(todosTab);

      expect(screen.getByText('Sr. Otoya')).toBeInTheDocument();
      expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
    });
  });

  describe('Search & Sorting', () => {
    it('filters debtors by search input and allows clearing', async () => {
      renderHistoryPage();

      const searchInput = screen.getByPlaceholderText(/buscar cliente para cobrar/i);
      fireEvent.change(searchInput, { target: { value: 'Zelmira' } });

      await waitFor(() => {
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
        expect(screen.queryByText('Diego | Los Angeles')).not.toBeInTheDocument();
      });

      const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
        expect(screen.getByText('Zelmira')).toBeInTheDocument();
      });
    });

    it('toggles sort options when clicking the sort button', async () => {
      renderHistoryPage();

      const sortBtn = screen.getByRole('button', { name: /mayor/i });
      expect(sortBtn).toBeInTheDocument();

      fireEvent.click(sortBtn);
      expect(screen.getByRole('button', { name: /a-z/i })).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('opens QuickPaymentModal directly when clicking Abonar on a debtor card', async () => {
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const abonarButtons = screen.getAllByRole('button', { name: /abonar/i });
      expect(abonarButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(abonarButtons[0]);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar abono \/ pago/i)).toBeInTheDocument();
    });

    it('opens CustomerDetailModal when clicking on a customer card', async () => {
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Diego | Los Angeles')).toBeInTheDocument();
      });

      const diegoCard = screen.getByText('Diego | Los Angeles').closest('div[class*="rounded-3xl"]');
      expect(diegoCard).toBeInTheDocument();
      fireEvent.click(diegoCard!);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/detalle de cuenta/i)).toBeInTheDocument();
    });
  });

  describe('Registro de Movimientos View (Dual Mode)', () => {
    it('switches to Registro de Movimientos and renders feed with WhatsApp link and audit controls', async () => {
      renderHistoryPage();

      const movementsTab = screen.getByRole('button', { name: /registro de movimientos/i });
      fireEvent.click(movementsTab);

      await waitFor(() => {
        expect(screen.getByText('Compra víveres')).toBeInTheDocument();
        expect(screen.getByText(/\+ S\/ 100\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/- S\/ 30\.00/i)).toBeInTheDocument();
        expect(screen.getAllByText(/comprobante/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('filters movements by sub-tabs (Solo Fiados vs Solo Abonos)', async () => {
      renderHistoryPage();

      const movementsTab = screen.getByRole('button', { name: /registro de movimientos/i });
      fireEvent.click(movementsTab);

      await waitFor(() => {
        expect(screen.getByText('Compra víveres')).toBeInTheDocument();
      });

      // Filter only abonos
      const soloAbonosBtn = screen.getByRole('button', { name: /solo abonos/i });
      fireEvent.click(soloAbonosBtn);

      expect(screen.getByText(/- S\/ 30\.00/i)).toBeInTheDocument();
      expect(screen.queryByText('Compra víveres')).not.toBeInTheDocument();
    });
  });
});
