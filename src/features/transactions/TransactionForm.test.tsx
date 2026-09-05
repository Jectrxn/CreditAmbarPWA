import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';
import { db } from '../../lib/dexie';
import { useSessionStore } from '../session/sessionStore';
import { useAuthStore } from '../../store/authStore';
import type { Customer } from '../../types/database';

describe('TransactionForm Component - FCC Cash vs QR and Credit Limits', () => {
  const mockCustomer: Customer = {
    id: 'cust-100',
    store_id: 'store-1',
    name: 'Carlos Mendoza',
    phone: '+51912345678',
    credit_limit: 100,
    balance: 30, // owes 30, available credit 70
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.put(mockCustomer);

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

  describe('FCC Cash Payments with Active Session', () => {
    beforeEach(() => {
      useSessionStore.getState().openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-1',
        startingFloat: 50,
      });
    });

    it('records a cash payment and links to cashier session while incrementing drawer cash', async () => {
      const onSuccess = vi.fn();
      render(<TransactionForm customer={mockCustomer} defaultType="payment" onSuccess={onSuccess} />);

      // Select Cash payment method
      const cashRadio = screen.getByLabelText(/efectivo \(fcc\)|efectivo/i);
      fireEvent.click(cashRadio);

      // Enter payment amount
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '20' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /registrar pago|confirmar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Session drawer cash incremented: 50 + 20 = 70
      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(70);
      expect(session?.cashPaymentsTotal).toBe(20);
      expect(session?.qrPaymentsTotal).toBe(0);

      // Customer balance reduced from 30 to 10
      const updatedCust = await db.customers.get('cust-100');
      expect(updatedCust?.balance).toBe(10);

      // Transaction saved in Dexie with session ID
      const tx = await db.creditTransactions.where('customer_id').equals('cust-100').first();
      expect(tx).toBeDefined();
      expect(tx?.payment_method).toBe('cash');
      expect(tx?.cashier_session_id).toBe(session?.id);
    });
  });

  describe('FCC Cash Payment WITHOUT Active Session (Blocking & Prompting)', () => {
    it('blocks cash payment and displays prompt to open cashier session first', async () => {
      // Note: useSessionStore has NO active session!
      const onSuccess = vi.fn();
      render(<TransactionForm customer={mockCustomer} defaultType="payment" onSuccess={onSuccess} />);

      const cashRadio = screen.getByLabelText(/efectivo \(fcc\)|efectivo/i);
      fireEvent.click(cashRadio);

      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '20' } });

      const submitBtn = screen.getByRole('button', { name: /registrar pago|confirmar/i });
      fireEvent.click(submitBtn);

      // Error banner must be shown
      expect(await screen.findByText(/active.*session.*required|sesión de caja activa|abrir caja/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      // No transaction created in DB
      const txCount = await db.creditTransactions.count();
      expect(txCount).toBe(0);
    });
  });

  describe('QR Payments to Treasury Isolation', () => {
    beforeEach(() => {
      useSessionStore.getState().openSession({
        cashierId: 'cajero-1',
        cashierName: 'Maria Cajera',
        storeId: 'store-1',
        startingFloat: 50,
      });
    });

    it('records QR payment to treasury without altering physical cash drawer', async () => {
      const onSuccess = vi.fn();
      render(<TransactionForm customer={mockCustomer} defaultType="payment" onSuccess={onSuccess} />);

      // Select QR payment method
      const qrRadio = screen.getByLabelText(/pago qr|transferencia/i);
      fireEvent.click(qrRadio);

      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '30' } });

      const submitBtn = screen.getByRole('button', { name: /registrar pago|confirmar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Session drawer cash is UNCHANGED at 50
      const session = useSessionStore.getState().activeSession;
      expect(session?.currentCashTotal).toBe(50);
      expect(session?.cashPaymentsTotal).toBe(0);
      // QR payments total is 30
      expect(session?.qrPaymentsTotal).toBe(30);

      // Transaction saved as QR
      const tx = await db.creditTransactions.where('customer_id').equals('cust-100').first();
      expect(tx?.payment_method).toBe('qr');
    });
  });

  describe('Credit Purchase (Fiado) and Limit Enforcement', () => {
    it('approves credit purchase within available limit and updates customer balance', async () => {
      const onSuccess = vi.fn();
      render(<TransactionForm customer={mockCustomer} defaultType="credit_purchase" onSuccess={onSuccess} />);

      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '50' } }); // Available is 70 (100 - 30)

      const submitBtn = screen.getByRole('button', { name: /registrar fiado|confirmar fiado/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      const updatedCust = await db.customers.get('cust-100');
      expect(updatedCust?.balance).toBe(80); // 30 + 50
    });

    it('blocks credit purchase when amount exceeds available credit limit', async () => {
      const onSuccess = vi.fn();
      render(<TransactionForm customer={mockCustomer} defaultType="credit_purchase" onSuccess={onSuccess} />);

      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '75' } }); // Exceeds available limit of 70

      const submitBtn = screen.getByRole('button', { name: /registrar fiado|confirmar fiado/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/insufficient credit limit|excede el límite/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      // Customer balance unchanged
      const cust = await db.customers.get('cust-100');
      expect(cust?.balance).toBe(30);
    });
  });
});
