import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionHistory } from './TransactionHistory';
import { db } from '../../lib/dexie';
import { useSessionStore } from '../session/sessionStore';
import type { Customer, CreditTransaction } from '../../types/database';

describe('TransactionHistory Component - 10-minute Audit Window & WhatsApp', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Carlos Mendoza',
    phone: '+51 987-654-321',
    credit_limit: 100,
    balance: 50,
    created_at: new Date().toISOString(),
  };

  const fixedNow = new Date('2026-09-05T12:00:00.000Z');

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.put(mockCustomer);

    useSessionStore.getState().reset();
    useSessionStore.getState().openSession({
      cashierId: 'cajero-1',
      cashierName: 'Maria Cajera',
      storeId: 'store-1',
      startingFloat: 100,
    });
  });

  it('renders transactions and shows editable action buttons within 10-minute grace window', async () => {
    const recentTx: CreditTransaction = {
      id: 'tx-recent-1',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: '1234',
      total_amount: 20,
      status: 'completed',
      type: 'payment',
      payment_method: 'cash',
      cashier_session_id: useSessionStore.getState().activeSession?.id,
      created_at: new Date('2026-09-05T11:55:00.000Z').toISOString(), // 5 minutes ago
      synced: true,
    };

    await db.creditTransactions.put(recentTx);

    render(<TransactionHistory storeId="store-1" now={fixedNow} />);

    expect(await screen.findByText('$20.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /anular/i })).toBeEnabled();
  });

  it('allows correcting payment amount within grace window with mandatory reason', async () => {
    const recentTx: CreditTransaction = {
      id: 'tx-recent-2',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: '1234',
      total_amount: 20,
      status: 'completed',
      type: 'payment',
      payment_method: 'cash',
      created_at: new Date('2026-09-05T11:55:00.000Z').toISOString(), // 5 min ago
      synced: true,
    };

    await db.creditTransactions.put(recentTx);

    render(<TransactionHistory storeId="store-1" now={fixedNow} />);

    // Click Edit button
    const editBtn = await screen.findByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    // Edit modal/form appears
    const newAmountInput = screen.getByLabelText(/nuevo monto/i);
    fireEvent.change(newAmountInput, { target: { value: '25' } });

    const reasonInput = screen.getByLabelText(/motivo del cambio|motivo de corrección/i);
    fireEvent.change(reasonInput, { target: { value: 'Error en digitación de billete' } });

    const saveBtn = screen.getByRole('button', { name: /guardar corrección|confirmar corrección/i });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const updatedTx = await db.creditTransactions.get('tx-recent-2');
      expect(updatedTx?.total_amount).toBe(25);
      expect(updatedTx?.edit_reason).toBe('Error en digitación de billete');
    });
  });

  it('allows undoing mistaken cancellation within the remaining grace window', async () => {
    const txToCancel: CreditTransaction = {
      id: 'tx-recent-3',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: '1234',
      total_amount: 30,
      status: 'completed',
      type: 'payment',
      payment_method: 'cash',
      created_at: new Date('2026-09-05T11:52:00.000Z').toISOString(), // 8 min ago (2 min left)
      synced: true,
    };

    await db.creditTransactions.put(txToCancel);

    render(<TransactionHistory storeId="store-1" now={fixedNow} />);

    // Cancel the transaction
    const cancelBtn = await screen.findByRole('button', { name: /anular/i });
    fireEvent.click(cancelBtn);

    const reasonInput = screen.getByLabelText(/motivo de anulación/i);
    fireEvent.change(reasonInput, { target: { value: 'Cliente pagó por error' } });

    const confirmCancelBtn = screen.getByRole('button', { name: /confirmar anulación/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(async () => {
      const cancelledTx = await db.creditTransactions.get('tx-recent-3');
      expect(cancelledTx?.status).toBe('cancelled');
    });

    // Now an "Undo" / "Deshacer anulación" button must be available
    const undoBtn = await screen.findByRole('button', { name: /deshacer|restaurar/i });
    expect(undoBtn).toBeEnabled();

    // Click Undo
    fireEvent.click(undoBtn);

    await waitFor(async () => {
      const restoredTx = await db.creditTransactions.get('tx-recent-3');
      expect(restoredTx?.status).toBe('completed');
    });
  });

  it('disables edit and cancel buttons for transactions older than 10 minutes (immutable)', async () => {
    const expiredTx: CreditTransaction = {
      id: 'tx-old-1',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: '1234',
      total_amount: 40,
      status: 'completed',
      type: 'payment',
      payment_method: 'cash',
      created_at: new Date('2026-09-05T11:45:00.000Z').toISOString(), // 15 min ago (expired)
      synced: true,
    };

    await db.creditTransactions.put(expiredTx);

    render(<TransactionHistory storeId="store-1" now={fixedNow} />);

    expect(await screen.findByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText(/inmutable|ventana cerrada/i)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /editar/i });
    expect(editBtn).toBeDisabled();

    const cancelBtn = screen.getByRole('button', { name: /anular/i });
    expect(cancelBtn).toBeDisabled();
  });

  it('renders WhatsApp reminder link with encoded customer balance', async () => {
    const tx: CreditTransaction = {
      id: 'tx-recent-4',
      store_id: 'store-1',
      customer_id: 'cust-1',
      cashier_pin_hash: '1234',
      total_amount: 25,
      status: 'completed',
      type: 'credit_purchase',
      created_at: new Date('2026-09-05T11:58:00.000Z').toISOString(),
      synced: true,
    };

    await db.creditTransactions.put(tx);

    render(<TransactionHistory storeId="store-1" now={fixedNow} />);

    const whatsappLink = await screen.findByLabelText(/enviar recordatorio whatsapp|whatsapp/i);
    expect(whatsappLink).toHaveAttribute('href');
    const href = whatsappLink.getAttribute('href') || '';
    expect(href).toContain('https://wa.me/51987654321?text=');
    expect(decodeURIComponent(href)).toMatch(/50\.00/); // customer balance is 50
  });
});
