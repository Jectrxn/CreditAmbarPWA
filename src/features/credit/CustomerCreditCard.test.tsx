import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerCreditCard } from './CustomerCreditCard';
import type { Customer } from '../../types/database';

describe('CustomerCreditCard Component', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Juan Perez',
    phone: '+51987654321',
    credit_limit: 100,
    balance: 40,
    created_at: new Date().toISOString(),
  };

  it('renders customer name, phone, balance, and available credit', () => {
    render(<CustomerCreditCard customer={mockCustomer} />);

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('+51987654321')).toBeInTheDocument();
    expect(screen.getByText(/Deuda actual|Saldo pendiente/i)).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText(/Límite disponible/i)).toBeInTheDocument();
    expect(screen.getByText('$60.00')).toBeInTheDocument();
  });

  it('displays high utilization warning when balance exceeds 80% of limit', () => {
    const highDebtCustomer: Customer = {
      ...mockCustomer,
      balance: 90,
      credit_limit: 100,
    };

    render(<CustomerCreditCard customer={highDebtCustomer} />);

    expect(screen.getByText(/límite cercano|alerta de límite/i)).toBeInTheDocument();
  });

  it('displays exhausted limit warning when balance equals or exceeds 100%', () => {
    const exhaustedCustomer: Customer = {
      ...mockCustomer,
      balance: 100,
      credit_limit: 100,
    };

    render(<CustomerCreditCard customer={exhaustedCustomer} />);

    expect(screen.getByText(/límite agotado/i)).toBeInTheDocument();
  });

  it('triggers onRecordPayment callback when Abono button is clicked', () => {
    const onRecordPayment = vi.fn();
    render(<CustomerCreditCard customer={mockCustomer} onRecordPayment={onRecordPayment} />);

    const payBtn = screen.getByRole('button', { name: /abonar|registrar pago/i });
    fireEvent.click(payBtn);

    expect(onRecordPayment).toHaveBeenCalledWith(mockCustomer);
  });

  it('triggers onNewCreditPurchase callback when Nuevo Fiado button is clicked', () => {
    const onNewCreditPurchase = vi.fn();
    render(<CustomerCreditCard customer={mockCustomer} onNewCreditPurchase={onNewCreditPurchase} />);

    const purchaseBtn = screen.getByRole('button', { name: /nuevo fiado|fiar/i });
    fireEvent.click(purchaseBtn);

    expect(onNewCreditPurchase).toHaveBeenCalledWith(mockCustomer);
  });
});
