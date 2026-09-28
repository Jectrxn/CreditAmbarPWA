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
    expect(qrBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Efectivo/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

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
    // GlassSelect picker lists only active-store customers
    const picker = screen.getByRole('button', { name: /Cliente que Abona/i });
    fireEvent.click(picker);

    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: /Lucía Flores/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Other Store Person/i })
    ).not.toBeInTheDocument();
  });

  it('shows debt context, decimal input, and clear action', async () => {
    render(<QuickPaymentModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Lucía Flores/i);

    const amountInput = screen.getByLabelText(/Monto a Cobrar/i);
    expect(amountInput).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByText('Deuda actual')).toBeInTheDocument();
    expect(screen.getByText('S/ 80.00')).toBeInTheDocument();

    fireEvent.change(amountInput, { target: { value: '40.255' } });
    expect(amountInput).toHaveValue('40.25');
    expect(screen.getByText('S/ 39.75')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(amountInput).toHaveValue('');
    expect(screen.getAllByText('S/ 80.00')).toHaveLength(2);
  });

  it('refreshes the amount when switching customers and clears it for debt-free customers', async () => {
    const secondDebtor: Customer = {
      ...mockCustomer,
      id: 'cust-test-pay-2',
      name: 'Carlos Ramírez',
      balance: 35,
    };
    const debtFreeCustomer: Customer = {
      ...mockCustomer,
      id: 'cust-test-pay-3',
      name: 'Ana Sin Deuda',
      balance: 0,
    };
    await db.customers.bulkPut([secondDebtor, debtFreeCustomer]);

    render(<QuickPaymentModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);
    await screen.findByText(/Lucía Flores/i);

    const picker = screen.getByRole('button', { name: /Cliente que Abona/i });
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: /Carlos Ramírez/i }));

    const amountInput = screen.getByLabelText(/Monto a Cobrar/i);
    expect(amountInput).toHaveValue('35');
    expect(screen.getByText('S/ 0.00')).toBeInTheDocument();

    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: /Ana Sin Deuda/i }));

    expect(amountInput).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Este cliente no tiene deuda' })).toBeDisabled();
  });

  it('keeps Confirmar Cobro disabled with the current blocking reason', async () => {
    render(<QuickPaymentModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Lucía Flores/i);

    const submitBtn = screen.getByRole('button', { name: /confirmar cobro/i });
    const amountInput = screen.getByPlaceholderText('0.00');

    // Empty amount -> disabled with an actionable reason
    fireEvent.change(amountInput, { target: { value: '' } });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Ingrese un monto');

    // Zero amount -> still disabled
    fireEvent.change(amountInput, { target: { value: '0' } });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Monto mayor a cero');

    // Over balance (80) -> disabled
    fireEvent.change(amountInput, { target: { value: '999' } });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('El monto supera la deuda');

    // Valid amount -> enabled
    fireEvent.change(amountInput, { target: { value: '40' } });
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveTextContent('Confirmar Cobro');
  });

  it('blocks over-payment with an error and writes no transaction', async () => {
    render(<QuickPaymentModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Lucía Flores/i);

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '999' } });

    // CTA is guarded (disabled) and explains the over-balance block
    expect(screen.getByRole('button', { name: 'El monto supera la deuda' })).toBeDisabled();

    // Exercise the defensive over-payment guard directly through the form submit
    const form = amountInput.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await screen.findByText(/El monto supera la deuda del cliente/i);

    expect(await db.creditTransactions.count()).toBe(0);
  });
});
