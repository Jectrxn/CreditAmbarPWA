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
    it('opens QuickCreditModal upon clicking "Nuevo Fiado"', async () => {
      renderHomePage();

      const newCreditBtn = screen.getByRole('button', { name: /nuevo fiado/i });
      fireEvent.click(newCreditBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar nuevo fiado/i)).toBeInTheDocument();
    });

    it('opens QuickPaymentModal upon clicking "Registrar Abono"', async () => {
      renderHomePage();

      const paymentBtn = screen.getByRole('button', { name: /registrar abono/i });
      fireEvent.click(paymentBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/registrar abono \/ pago/i)).toBeInTheDocument();
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
});
