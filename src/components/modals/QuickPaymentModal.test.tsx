import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPaymentModal } from './QuickPaymentModal';
import { db } from '../../lib/dexie';
import { useAuthStore, DEFAULT_CASHIERS } from '../../store/authStore';
import type { Customer } from '../../types/database';

describe('QuickPaymentModal - Cashier Selection & Abono Flow', () => {
  const mockCustomer: Customer = {
    id: 'cust-test-pay-1',
    store_id: 'store-1',
    name: 'Lucía Flores',
    phone: '912345678',
    credit_limit: 300,
    balance: 80,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.put(mockCustomer);

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
    useAuthStore.getState().setCashiers(DEFAULT_CASHIERS);
    useAuthStore.getState().setCurrentOperatorName('Martin');
  });

  it('renders with 4 cashiers in OperatorSelector for payments', async () => {
    render(<QuickPaymentModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Lucía Flores/i);

    expect(screen.getByText('Martin')).toBeInTheDocument();
    expect(screen.getByText('Emiliano')).toBeInTheDocument();
    expect(screen.getByText('Anthony')).toBeInTheDocument();
    expect(screen.getByText('Benjamin')).toBeInTheDocument();
  });

  it('records payment with the selected cashier name and payment method', async () => {
    const onSuccess = vi.fn();
    render(
      <QuickPaymentModal
        isOpen={true}
        onClose={() => {}}
        customer={mockCustomer}
        onSuccess={onSuccess}
      />
    );

    // Wait for customer data to load
    await screen.findByText(/Lucía Flores/i);

    // Switch to Benjamin
    const benjaminBtn = screen.getByRole('button', { name: /Benjamin/i });
    fireEvent.click(benjaminBtn);
    expect(benjaminBtn).toHaveAttribute('aria-pressed', 'true');

    // Select QR method
    const qrBtn = screen.getByRole('button', { name: /Yape \/ Plin \/ QR/i });
    fireEvent.click(qrBtn);

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '40.00' } });

    // Confirm payment with "Confirmar Cobro"
    const submitBtn = screen.getByRole('button', { name: /confirmar cobro/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      const createdTx = onSuccess.mock.calls[0][0];
      expect(createdTx.cashier_pin_hash).toBe('Benjamin');
      expect(createdTx.payment_method).toBe('qr');
      expect(createdTx.total_amount).toBe(40);
    });

    // Check confirmation screen
    expect(screen.getByText(/abono registrado con éxito/i)).toBeInTheDocument();
    expect(screen.getByText('Benjamin')).toBeInTheDocument();
  });

  it('lists only active-store customers in the picker (T3)', async () => {
    await db.customers.put({
      id: 'cust-other-store',
      store_id: 'store-test',
      name: 'Other Store Person',
      credit_limit: 200,
      balance: 10,
      created_at: new Date().toISOString(),
    });
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
    render(<QuickPaymentModal isOpen={true} onClose={() => {}} />);

    await screen.findByText(/Lucía Flores/i);
    // Native select picker lists only active-store customers
    expect(
      screen.getByRole('option', { name: /Lucía Flores/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Other Store Person/i })
    ).not.toBeInTheDocument();
  });
});
