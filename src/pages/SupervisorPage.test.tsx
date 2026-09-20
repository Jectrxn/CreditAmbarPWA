import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupervisorPage } from './SupervisorPage';
import { db } from '../lib/dexie';
import { useAuthStore } from '../store/authStore';
import type { Customer, CreditTransaction } from '../types/database';

describe('SupervisorPage / Reportes Component (Strict TDD)', () => {
  const mockCustomer1: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Diego | Los Angeles',
    phone: '927268714',
    credit_limit: 500,
    balance: 476.10,
    created_at: new Date().toISOString(),
  };

  const mockCustomer2: Customer = {
    id: 'cust-2',
    store_id: 'store-1',
    name: 'Zelmira',
    phone: '',
    credit_limit: 300,
    balance: 290.80,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    const currentIso = new Date().toISOString();

    const mockFiado1: CreditTransaction = {
      id: 'tx-f1',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: 'admin',
      total_amount: 150,
      status: 'completed',
      created_at: currentIso,
      synced: false,
      type: 'credit_purchase',
      notes: 'Arroz y aceite',
    };

    const mockAbono1: CreditTransaction = {
      id: 'tx-a1',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: 'admin',
      total_amount: 50,
      status: 'completed',
      created_at: currentIso,
      synced: false,
      type: 'payment',
      payment_method: 'cash',
    };

    await db.customers.bulkPut([mockCustomer1, mockCustomer2]);
    await db.creditTransactions.bulkPut([mockFiado1, mockAbono1]);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
  });

  const renderSupervisorPage = () => {
    return render(
      <MemoryRouter>
        <SupervisorPage />
      </MemoryRouter>
    );
  };

  describe('Hero Card & Key Aggregated Metrics', () => {
    it('renders Rendimiento del Período hero card with recovery rate, total fiado, and total cobrado', async () => {
      renderSupervisorPage();

      expect(screen.getByTestId('page-supervisor')).toBeInTheDocument();
      expect(screen.getByText(/rendimiento del período/i)).toBeInTheDocument();
      expect(screen.getByText(/tasa de recuperación/i)).toBeInTheDocument();

      // Total fiado = 150.00, total cobrado = 50.00 -> recovery rate = 33%
      await waitFor(() => {
        expect(screen.getByText(/total fiado/i)).toBeInTheDocument();
        expect(screen.getByText(/total cobrado/i)).toBeInTheDocument();
        expect(screen.getAllByText(/150\.00/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/50\.00/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/33%/i)).toBeInTheDocument();
      });
    });

    it('renders distinct active customers count and average payment amount', async () => {
      renderSupervisorPage();

      await waitFor(() => {
        expect(screen.getByText(/clientes con movimiento/i)).toBeInTheDocument();
        expect(screen.getByText(/promedio por abono/i)).toBeInTheDocument();
        // 1 distinct customer
        expect(screen.getByText('1')).toBeInTheDocument();
        // S/ 50.00 average
        expect(screen.getAllByText(/50\.00/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Transactions Sections (Mayores Fiados & Últimos Abonos)', () => {
    it('renders Mayores Fiados Registrados with customer name and transaction amount', async () => {
      renderSupervisorPage();

      await waitFor(() => {
        expect(screen.getByText(/mayores fiados registrados/i)).toBeInTheDocument();
        expect(screen.getAllByText('Diego | Los Angeles').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/\+ S\/ 150\.00/i)).toBeInTheDocument();
        expect(screen.getByText('Arroz y aceite')).toBeInTheDocument();
      });
    });

    it('renders Últimos Abonos Realizados with payment method and amount', async () => {
      renderSupervisorPage();

      await waitFor(() => {
        expect(screen.getByText(/últimos abonos realizados/i)).toBeInTheDocument();
        expect(screen.getByText(/- S\/ 50\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/efectivo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Period Filter and Export CSV', () => {
    it('allows toggling between period filters (Hoy, Esta Semana, Este Mes)', async () => {
      renderSupervisorPage();

      const hoyBtn = screen.getByRole('button', { name: /hoy/i });
      const semanaBtn = screen.getByRole('button', { name: /esta semana/i });
      const mesBtn = screen.getByRole('button', { name: /este mes/i });

      expect(hoyBtn).toBeInTheDocument();
      expect(semanaBtn).toBeInTheDocument();
      expect(mesBtn).toBeInTheDocument();

      fireEvent.click(hoyBtn);
      expect(screen.getAllByText('Hoy').length).toBeGreaterThanOrEqual(1);

      fireEvent.click(semanaBtn);
      expect(screen.getAllByText('Esta Semana').length).toBeGreaterThanOrEqual(1);
    });

    it('triggers CSV download when clicking the export button', async () => {
      renderSupervisorPage();

      const exportBtn = screen.getByRole('button', { name: /descargar reporte csv/i });
      expect(exportBtn).toBeInTheDocument();

      // Spy on link click
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      fireEvent.click(exportBtn);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('Store partitioning (T3)', () => {
    it('excludes customers and transactions from other stores', async () => {
      await db.customers.put({
        id: 'cust-other',
        store_id: 'store-test',
        name: 'Test Lab Intruder',
        phone: '000000000',
        credit_limit: 500,
        balance: 400,
        created_at: new Date().toISOString(),
      });
      await db.creditTransactions.put({
        id: 'tx-other',
        store_id: 'store-test',
        customer_id: 'cust-other',
        cashier_pin_hash: 'admin',
        total_amount: 999,
        status: 'completed',
        created_at: new Date().toISOString(),
        synced: false,
        type: 'credit_purchase',
        notes: 'Intruder fiado',
      });
      renderSupervisorPage();

      await waitFor(() => {
        expect(screen.getByText(/rendimiento del período/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ S\/ 150\.00/i)).toBeInTheDocument();
      });
      // Other-store data must not leak into metrics or lists
      expect(screen.queryByText('Test Lab Intruder')).not.toBeInTheDocument();
      expect(screen.queryByText('Intruder fiado')).not.toBeInTheDocument();
      expect(screen.queryByText(/999\.00/i)).not.toBeInTheDocument();
    });
  });

  describe('Test mode toggle (T2, admin-gated)', () => {
    it('hides the test mode toggle when admin mode is off', () => {
      renderSupervisorPage();
      expect(screen.queryByTestId('test-mode-toggle')).not.toBeInTheDocument();
    });

    it('shows the toggle in admin mode and flips test mode on click', async () => {
      useAuthStore.getState().setCashiers([
        { id: 'c-sup', name: 'Supervisor', role: 'supervisor', pin: '1234' },
      ]);
      useAuthStore.getState().unlockWithPin('c-sup', '1234');
      expect(useAuthStore.getState().isAdminMode()).toBe(true);

      renderSupervisorPage();
      const toggle = await screen.findByTestId('test-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(toggle);
      expect(useAuthStore.getState().isTestMode).toBe(true);
      expect(screen.getByTestId('test-mode-toggle')).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByTestId('test-mode-toggle'));
      expect(useAuthStore.getState().isTestMode).toBe(false);
      useAuthStore.getState().logoutCashier();
    });
  });
});
