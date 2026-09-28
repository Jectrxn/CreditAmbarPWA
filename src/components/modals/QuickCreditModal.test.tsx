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
    await db.transactionItems.clear();
    await db.products.clear();
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

  const openManualAmount = () => {
    fireEvent.click(screen.getByRole('button', { name: /ajustar manualmente/i }));
    return screen.getByLabelText('Monto manual del fiado') as HTMLInputElement;
  };

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

    // Manual entry is an explicit adjustment path.
    const amountInput = openManualAmount();
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

    const amountInput = openManualAmount();

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
    const amountInput = openManualAmount();

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
    const amountInput = openManualAmount();
    const submitBtn = screen.getByRole('button', { name: /confirmar fiado/i });

    fireEvent.click(screen.getByRole('button', { name: '+20' }));
    expect(amountInput.value).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: '+50' }));
    expect(amountInput.value).toBe('70');

    // 70 <= 150 available -> CTA enabled with preview
    expect(submitBtn).not.toBeDisabled();
    expect(await screen.findByText(/Nuevo saldo/i)).toBeInTheDocument();
  });

  it('searches the catalog and adds tapped products as line rows', async () => {
    await db.products.put({
      id: 'prod-1',
      store_id: 'store-1',
      name: 'Arroz costeño',
      price: 5.5,
      created_at: new Date().toISOString(),
      synced: false,
    });

    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);
    const search = screen.getByLabelText(/buscar producto/i);

    fireEvent.change(search, { target: { value: 'arr' } });
    const option = await screen.findByRole('option', { name: /Arroz costeño/i });
    expect(option).toHaveTextContent('S/ 5.50');

    fireEvent.click(option);
    expect(await screen.findByText('Arroz costeño')).toBeInTheDocument();
    expect(screen.getAllByText('S/ 5.50')).toHaveLength(2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the suggestion popover on Escape', async () => {
    await db.products.put({
      id: 'prod-1',
      store_id: 'store-1',
      name: 'Arroz costeño',
      price: 5.5,
      created_at: new Date().toISOString(),
      synced: false,
    });

    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);
    const search = screen.getByLabelText(/buscar producto/i);

    fireEvent.change(search, { target: { value: 'arr' } });
    await screen.findByRole('option', { name: /Arroz costeño/i });

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('offers Crear-flow when there is no match and creates the product inline', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    await screen.findByText(/Carlos Mendoza/i);
    const search = screen.getByLabelText(/buscar producto/i);

    fireEvent.change(search, { target: { value: 'quinu' } });

    const createOption = await screen.findByRole('option', { name: /Crear.*quinu/i });
    fireEvent.click(createOption);

    const priceInput = await screen.findByLabelText(/Precio del nuevo producto/i);
    fireEvent.change(priceInput, { target: { value: '4.50' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('quinu')).toBeInTheDocument();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const stored = await db.products.where('store_id').equals('store-1').toArray();
    expect(stored.some((p) => p.name === 'quinu' && p.price === 4.5)).toBe(true);

    const queued = await db.syncQueue.where('entity').equals('products').first();
    expect(queued).toBeDefined();
    expect(queued?.operation).toBe('INSERT');
  });

  it('lists only active-store customers in the picker (T3)', async () => {
    await db.customers.put({
      id: 'cust-other-store',
      store_id: 'store-test',
      name: 'Other Store Person',
      credit_limit: 200,
      balance: 0,
      created_at: new Date().toISOString(),
    });
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
    render(<QuickCreditModal isOpen={true} onClose={() => {}} />);

    // No preselection: open the picker explicitly and select Carlos Mendoza.
    const picker = screen.getByRole('button', { name: 'Cliente' });
    fireEvent.click(picker);

    const option = await screen.findByRole('option', { name: /Carlos Mendoza/i });
    expect(option).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Other Store Person/i })).not.toBeInTheDocument();

    fireEvent.click(option);
    expect(await screen.findByRole('button', { name: /cliente: carlos mendoza/i })).toBeInTheDocument();
  });

  it('does not preselect a customer when opened without one (never fiado to the wrong person)', async () => {
    await db.customers.put({
      id: 'cust-test-2',
      store_id: 'store-1',
      name: 'Maria Lopez',
      credit_limit: 300,
      balance: 0,
      created_at: new Date().toISOString(),
    });

    render(<QuickCreditModal isOpen={true} onClose={() => {}} />);

    // Placeholder visible, nobody auto-selected.
    expect(await screen.findByText('Selecciona un cliente')).toBeInTheDocument();
    expect(screen.queryByText(/Deuda:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Disponible:/i)).not.toBeInTheDocument();

    // CTA stays disabled even with a plausible manual amount typed.
    const amountInput = openManualAmount();
    fireEvent.change(amountInput, { target: { value: '25.50' } });
    expect(screen.getByRole('button', { name: /confirmar fiado/i })).toBeDisabled();

    // Selecting a customer enables the flow.
    fireEvent.click(screen.getByRole('button', { name: 'Cliente' }));
    fireEvent.click(await screen.findByRole('option', { name: /Carlos Mendoza/i }));

    expect(await screen.findByText(/Deuda:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar fiado/i })).not.toBeDisabled();
  });

  it('calculates and displays the product-line total automatically', async () => {
    await db.products.bulkPut([
      { id: 'prod-arroz', store_id: 'store-1', name: 'Arroz costeño', price: 5.5, created_at: new Date().toISOString(), synced: false },
      { id: 'prod-leche', store_id: 'store-1', name: 'Leche Gloria', price: 4.5, created_at: new Date().toISOString(), synced: false },
    ]);
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);
    await screen.findByText(/Carlos Mendoza/i);

    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'arro' } });
    fireEvent.click(await screen.findByRole('option', { name: /Arroz costeño/i }));
    fireEvent.change(search, { target: { value: 'lech' } });
    fireEvent.click(await screen.findByRole('option', { name: /Leche Gloria/i }));
    fireEvent.change(search, { target: { value: 'lech' } });
    fireEvent.click(await screen.findByRole('option', { name: /Leche Gloria/i }));

    expect(screen.getByText('S/ 14.50')).toBeInTheDocument();
    expect(screen.queryByLabelText('Monto manual del fiado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar fiado/i })).not.toBeDisabled();
  });

  it('persists the automatic total and product price snapshots', async () => {
    await db.products.put({
      id: 'prod-1', store_id: 'store-1', name: 'Arroz costeño', price: 5.5,
      created_at: new Date().toISOString(), synced: false,
    });
    const onSuccess = vi.fn();
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} onSuccess={onSuccess} />);
    await screen.findByText(/Carlos Mendoza/i);
    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'arr' } });
    fireEvent.click(await screen.findByRole('option', { name: /Arroz costeño/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar fiado/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const tx = onSuccess.mock.calls[0][0];
    expect(tx.total_amount).toBe(5.5);
    const stored = await db.transactionItems.where('transaction_id').equals(tx.id).toArray();
    expect(stored).toEqual(expect.arrayContaining([
      expect.objectContaining({ product_id: 'prod-1', quantity: 1, unit_price: 5.5 }),
    ]));
    expect(await db.syncQueue.where('entity').equals('transaction_items').count()).toBe(1);
  });

  it('manual adjustment is explicit, visible, and can restore the automatic total', async () => {
    await db.products.put({
      id: 'prod-1', store_id: 'store-1', name: 'Arroz costeño', price: 5.5,
      created_at: new Date().toISOString(), synced: false,
    });
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);
    await screen.findByText(/Carlos Mendoza/i);
    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'arr' } });
    fireEvent.click(await screen.findByRole('option', { name: /Arroz costeño/i }));

    const toggle = screen.getByRole('button', { name: /ajustar manualmente/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    const input = screen.getByLabelText('Monto manual del fiado') as HTMLInputElement;
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(input).toHaveValue(5.5);
    fireEvent.change(input, { target: { value: '5' } });
    expect(screen.getByText(/difiere S\/ 0\.50 del detalle/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /usar total automático/i }));
    expect(screen.getAllByText('S/ 5.50')).toHaveLength(2);
    expect(screen.queryByLabelText('Monto manual del fiado')).not.toBeInTheDocument();
  });

  it('two rapid clicks on Confirmar Fiado create exactly one credit transaction and increment the balance once', async () => {
    const onSuccess = vi.fn();
    render(
      <QuickCreditModal
        isOpen={true}
        onClose={() => {}}
        customer={mockCustomer}
        onSuccess={onSuccess}
      />
    );
    await screen.findByText(/Carlos Mendoza/i);

    const amountInput = openManualAmount();
    fireEvent.change(amountInput, { target: { value: '25.50' } });

    const submitBtn = screen.getByRole('button', { name: /confirmar fiado/i });
    // Two rapid clicks fired synchronously, no await in between.
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    const txs = await db.creditTransactions.where('customer_id').equals(mockCustomer.id).toArray();
    expect(txs).toHaveLength(1);

    const updatedCustomer = await db.customers.get(mockCustomer.id);
    expect(updatedCustomer?.balance).toBe(75.5); // 50 + 25.50, incremented once
  });

  it('two synchronous form submits (bypassing the disabled button) register exactly one fiado', async () => {
    const onSuccess = vi.fn();
    render(
      <QuickCreditModal
        isOpen={true}
        onClose={() => {}}
        customer={mockCustomer}
        onSuccess={onSuccess}
      />
    );
    await screen.findByText(/Carlos Mendoza/i);

    const amountInput = openManualAmount();
    fireEvent.change(amountInput, { target: { value: '25.50' } });

    const form = screen.getByRole('button', { name: /confirmar fiado/i }).closest('form') as HTMLFormElement;
    // e.g. a double Enter: submit events do not go through the button's disabled state.
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onSuccess).toHaveBeenCalledTimes(1);

    const txs = await db.creditTransactions.where('customer_id').equals(mockCustomer.id).toArray();
    expect(txs).toHaveLength(1);
    expect((await db.customers.get(mockCustomer.id))?.balance).toBe(75.5);
  });

  it('focuses the customer select when opened without a customer (T3)', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} />);

    expect(await screen.findByRole('button', { name: 'Cliente' })).toHaveFocus();
  });

  it('focuses the product search when opened with a customer already given (T3)', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);

    expect(await screen.findByLabelText(/buscar producto/i)).toHaveFocus();
  });

  it('blocks empty and over-limit totals with actionable validation', async () => {
    render(<QuickCreditModal isOpen={true} onClose={() => {}} customer={mockCustomer} />);
    await screen.findByText(/Carlos Mendoza/i);
    const submit = screen.getByRole('button', { name: /confirmar fiado/i });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/agrega productos para calcular el total automáticamente/i)).toBeInTheDocument();

    const input = openManualAmount();
    fireEvent.change(input, { target: { value: '999' } });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/excede el disponible por S\/ 849\.00/i)).toBeInTheDocument();
  });
});
