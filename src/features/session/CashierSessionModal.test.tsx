import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CashierSessionModal } from './CashierSessionModal';
import { useSessionStore } from './sessionStore';
import { useAuthStore } from '../../store/authStore';

describe('CashierSessionModal Component', () => {
  beforeEach(() => {
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

  it('renders float declaration form when no active cashier session exists', () => {
    render(<CashierSessionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Apertura de Caja (Iniciar Turno)')).toBeInTheDocument();
    expect(screen.getByLabelText(/monto inicial/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar turno/i })).toBeInTheDocument();
  });

  it('shows error when user submits negative float declaration', () => {
    render(<CashierSessionModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/monto inicial/i);
    fireEvent.change(input, { target: { value: '-15' } });

    const submitBtn = screen.getByRole('button', { name: /iniciar turno/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/positive or zero|mayor o igual a cero/i)).toBeInTheDocument();
    expect(useSessionStore.getState().activeSession).toBeNull();
  });

  it('successfully opens session with valid float and displays FCC status', () => {
    render(<CashierSessionModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/monto inicial/i);
    fireEvent.change(input, { target: { value: '50' } });

    const submitBtn = screen.getByRole('button', { name: /iniciar turno/i });
    fireEvent.click(submitBtn);

    expect(useSessionStore.getState().activeSession).not.toBeNull();
    expect(useSessionStore.getState().activeSession?.startingFloat).toBe(50);

    // Now modal shows active session details
    expect(screen.getByText(/Turno activo — Maria Cajera/i)).toBeInTheDocument();
    expect(screen.getAllByText(/50\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays drawer cash (FCC) and QR treasury totals when session is open', () => {
    useSessionStore.getState().openSession({
      cashierId: 'cajero-1',
      cashierName: 'Maria Cajera',
      storeId: 'store-1',
      startingFloat: 100,
    });
    useSessionStore.getState().recordPaymentToSession({ amount: 35, paymentMethod: 'cash' });
    useSessionStore.getState().recordPaymentToSession({ amount: 65, paymentMethod: 'qr' });

    render(<CashierSessionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/135\.00/)).toBeInTheDocument(); // Drawer cash: 100 + 35
    expect(screen.getByText(/65\.00/)).toBeInTheDocument();  // QR digital: 65
    expect(screen.getByRole('button', { name: /cerrar caja/i })).toBeInTheDocument();
  });

  it('closes active session when user clicks close session button', () => {
    useSessionStore.getState().openSession({
      cashierId: 'cajero-1',
      cashierName: 'Maria Cajera',
      storeId: 'store-1',
      startingFloat: 100,
    });

    render(<CashierSessionModal isOpen={true} onClose={vi.fn()} />);

    const closeBtn = screen.getByRole('button', { name: /cerrar caja/i });
    fireEvent.click(closeBtn);

    expect(useSessionStore.getState().activeSession).toBeNull();
    expect(useSessionStore.getState().lastClosedSession?.status).toBe('closed');
  });
});
