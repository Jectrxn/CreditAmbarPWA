import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosPage } from './PosPage';
import { db } from '../lib/dexie';
import { useSessionStore } from '../features/session/sessionStore';
import { useAuthStore } from '../store/authStore';
import type { Customer } from '../types/database';

describe('PosPage Component (Strict TDD)', () => {
  const mockCustomer1: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Juan Perez',
    phone: '+51987654321',
    credit_limit: 200,
    balance: 50,
    created_at: new Date().toISOString(),
  };

  const mockCustomer2: Customer = {
    id: 'cust-2',
    store_id: 'store-1',
    name: 'Ana Gomez',
    phone: '+51999888777',
    credit_limit: 150,
    balance: 0,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.bulkPut([mockCustomer1, mockCustomer2]);

    useSessionStore.getState().reset();
    useAuthStore.getState().reset();

    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Bodega Ambar',
      authenticatedAt: new Date().toISOString(),
    });

    useAuthStore.getState().addCashier({
      id: 'cajero-1',
      name: 'Maria Cajera',
      role: 'cajero',
      pin: '1234',
    });
    useAuthStore.getState().selectCashier('cajero-1');
    useAuthStore.getState().unlockWithPin('cajero-1', '1234');
  });

  describe('Cashier Session Banner & Controls', () => {
    it('prompts to open cashier session when no session is active and opens modal on click', async () => {
      render(<PosPage />);

      expect(screen.getByTestId('page-pos')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /caja/i })).toBeInTheDocument();

      const openPromptBtns = screen.getAllByRole('button', { name: /abrir turno|iniciar turno|abrir caja/i });
      expect(openPromptBtns.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(openPromptBtns[0]);

      // Modal should open
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText(/apertura de caja|fondo inicial/i).length).toBeGreaterThanOrEqual(1);
    });

    it('displays active session summary metrics when session is open', async () => {
      useSessionStore.getState().openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-1',
        startingFloat: 100,
      });

      render(<PosPage />);

      expect(screen.getByText(/turno activo/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Maria Cajera/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\$100\.00/i)).toBeInTheDocument();
    });
  });

  describe('Customer Search and Selection', () => {
    it('loads and displays customer list for quick selection', async () => {
      render(<PosPage />);

      await waitFor(() => {
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        expect(screen.getByText('Ana Gomez')).toBeInTheDocument();
      });
    });

    it('filters customer list based on search query', async () => {
      render(<PosPage />);

      await waitFor(() => {
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar cliente/i);
      fireEvent.change(searchInput, { target: { value: 'Ana' } });

      expect(screen.getByText('Ana Gomez')).toBeInTheDocument();
      expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument();
    });

    it('selects a customer and opens transaction form', async () => {
      render(<PosPage />);

      await waitFor(() => {
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      });

      const customerCard = screen.getByText('Juan Perez');
      fireEvent.click(customerCard);

      // Transaction form should appear with customer name and amount input
      expect(screen.getByRole('button', { name: /cambiar cliente|otro cliente/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    });

    it('excludes customers from other stores (T3)', async () => {
      await db.customers.put({
        id: 'cust-other',
        store_id: 'store-test',
        name: 'Test Lab Intruder',
        phone: '000000000',
        credit_limit: 500,
        balance: 10,
        created_at: new Date().toISOString(),
      });
      render(<PosPage />);

      await waitFor(() => {
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      });
      expect(screen.queryByText('Test Lab Intruder')).not.toBeInTheDocument();
    });
  });

  describe('Transaction Completion and WhatsApp Receipt', () => {
    beforeEach(() => {
      useSessionStore.getState().openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-1',
        startingFloat: 100,
      });
    });

    it('processes payment transaction, displays success card and WhatsApp receipt link', async () => {
      render(<PosPage />);

      await waitFor(() => {
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Juan Perez'));

      // Enter payment amount
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '25' } });

      // Click submit
      const submitBtn = screen.getByRole('button', { name: /registrar pago|confirmar/i });
      fireEvent.click(submitBtn);

      // Wait for success confirmation
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /operación exitosa/i })).toBeInTheDocument();
      });

      // Check WhatsApp link
      const whatsappBtn = screen.getByRole('link', { name: /whatsapp/i });
      expect(whatsappBtn).toBeInTheDocument();
      expect(whatsappBtn.getAttribute('href')).toContain('wa.me/51987654321');

      // Check "Nueva Operación" button resets view
      const newOpBtn = screen.getByRole('button', { name: /nueva operación|nuevo cobro/i });
      fireEvent.click(newOpBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument();
      });
    });
  });
});
