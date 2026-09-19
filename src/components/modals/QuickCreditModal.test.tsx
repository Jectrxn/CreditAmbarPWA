import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickCreditModal } from './QuickCreditModal';
import { db } from '../../lib/dexie';
import { useAuthStore, DEFAULT_CASHIERS } from '../../store/authStore';
import type { Customer } from '../../types/database';

describe('QuickCreditModal - Cashier Selection & Fiado Flow', () => {
  const mockCustomer: Customer = {
    id: 'cust-test-1',
    store_id: 'store-1',
    name: 'Carlos Mendoza',
    phone: '987654321',
    credit_limit: 200,
    balance: 50,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();
    await db.syncQueue.clear();

    await db.customers.put(mockCustomer);

    useAuthStore.getState().reset();
    useAuthStore.getState().setCashiers(DEFAULT_CASHIERS);
    useAuthStore.getState().setCurrentOperatorName('Martin');
  });

  it('renders with 4 cashiers in OperatorSelector and preselects current operator', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);

    expect(screen.getByText('Martin')).toBeInTheDocument();
    expect(screen.getByText('Emiliano')).toBeInTheDocument();
    expect(screen.getByText('Anthony')).toBeInTheDocument();
    expect(screen.getByText('Benjamin')).toBeInTheDocument();

    const martinBtn = screen.getByRole('button', { name: /Martin/i });
    expect(martinBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('allows switching cashier with 1 touch and records transaction with selected operator', async () => {
    const onSuccess = vi.fn();
    render(
      <QuickCreditModal
        isOpen={true}
        onClose={() => {}}
        customer={mockCustomer}
        onSuccess={onSuccess}
      />
    );

    // Wait for customer data to be loaded into state
    await screen.findByText(/Carlos Mendoza/i);

    // Switch to Anthony with 1 click
    const anthonyBtn = screen.getByRole('button', { name: /Anthony/i });
    fireEvent.click(anthonyBtn);
    expect(anthonyBtn).toHaveAttribute('aria-pressed', 'true');

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '25.50' } });

    // Confirm
    const submitBtn = screen.getByRole('button', { name: /confirmar fiado/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      const createdTx = onSuccess.mock.calls[0][0];
      expect(createdTx.cashier_pin_hash).toBe('Anthony');
      expect(createdTx.total_amount).toBe(25.5);
    });

    // Check confirmation screen
    expect(screen.getByText(/fiado guardado correctamente/i)).toBeInTheDocument();
    expect(screen.getByText('Anthony')).toBeInTheDocument();
  });

  it('keeps Confirmar Fiado disabled until amount is valid (never offers CTA in invalid state)', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);

    const submitBtn = screen.getByRole('button', { name: /confirmar fiado/i });
    // Empty amount -> disabled
    expect(submitBtn).toBeDisabled();

    const amountInput = screen.getByPlaceholderText('0.00');

    // Zero amount -> still disabled
    fireEvent.change(amountInput, { target: { value: '0' } });
    expect(submitBtn).toBeDisabled();

    // Exceeds available credit (limit 200 - balance 50 = 150) -> disabled
    fireEvent.change(amountInput, { target: { value: '999' } });
    expect(submitBtn).toBeDisabled();

    // Valid amount -> enabled
    fireEvent.change(amountInput, { target: { value: '25.50' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('shows live nuevo saldo preview and over-limit warning as amount changes', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);
    const amountInput = screen.getByPlaceholderText('0.00');

    // No preview before typing
    expect(screen.queryByText(/Nuevo saldo/i)).not.toBeInTheDocument();

    // Valid amount -> preview with new balance (50 + 25.50) and remaining (150 - 25.50)
    fireEvent.change(amountInput, { target: { value: '25.50' } });
    expect(await screen.findByText(/Nuevo saldo/i)).toBeInTheDocument();
    expect(screen.getByText(/S\/ 75\.50/)).toBeInTheDocument();
    expect(screen.getByText(/S\/ 124\.50/)).toBeInTheDocument();

    // Over limit -> warning with excess (999 - 150 = 849), CTA blocked
    fireEvent.change(amountInput, { target: { value: '999' } });
    expect(await screen.findByText(/Excede el disponible por/i)).toBeInTheDocument();
    expect(screen.getByText(/S\/ 849\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/Nuevo saldo/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar fiado/i })).toBeDisabled();
  });

  it('quick-add chips sum onto the amount and enable the CTA', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /confirmar fiado/i });

    fireEvent.click(screen.getByRole('button', { name: '+20' }));
    expect(amountInput.value).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: '+50' }));
    expect(amountInput.value).toBe('70');

    // 70 <= 150 available -> CTA enabled with preview
    expect(submitBtn).not.toBeDisabled();
    expect(await screen.findByText(/Nuevo saldo/i)).toBeInTheDocument();
  });
});
