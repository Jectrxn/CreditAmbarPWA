import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CashierLoginModal } from './CashierLoginModal';
import { useAuthStore } from '../../store/authStore';

describe('CashierLoginModal Component (Strict TDD)', () => {
  const mockCashiers = [
    { id: 'c-1', name: 'Laura Gómez', role: 'cajero' as const, pin: '1234' },
    { id: 'c-2', name: 'Marcos Rivas', role: 'supervisor' as const, pin: '4321' },
    { id: 'c-3', name: 'Don Roberto', role: 'jefe' as const, pin: '9999' },
  ];

  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setCashiers(mockCashiers);
  });

  it('renders modal with list of operators and PIN keypad when open', () => {
    render(<CashierLoginModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/acceso autorizado/i)).toBeInTheDocument();
    expect(screen.getByText('Don Roberto')).toBeInTheDocument();
    expect(screen.getByText('Marcos Rivas')).toBeInTheDocument();
    expect(screen.queryByText('Laura Gómez')).not.toBeInTheDocument();
  });

  it('unlocks profile with valid 4-digit PIN and calls onSuccess callback', async () => {
    const onSuccessMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <CashierLoginModal
        isOpen={true}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    // Select Don Roberto (Jefe / Admin, PIN: 9999)
    const donRobertoBtn = screen.getByRole('button', { name: /don roberto/i });
    fireEvent.click(donRobertoBtn);

    // Press '9' four times on keypad
    const key9 = screen.getByRole('button', { name: '9' });
    fireEvent.click(key9);
    fireEvent.click(key9);
    fireEvent.click(key9);
    fireEvent.click(key9);

    await waitFor(() => {
      expect(useAuthStore.getState().activeCashier?.name).toBe('Don Roberto');
      expect(useAuthStore.getState().hasRole('jefe')).toBe(true);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('shows error on invalid PIN', async () => {
    render(<CashierLoginModal isOpen={true} onClose={() => {}} />);

    // Select Marcos (PIN: 4321)
    const marcosBtn = screen.getByRole('button', { name: /marcos rivas/i });
    fireEvent.click(marcosBtn);

    // Enter wrong PIN: 0000
    const key0 = screen.getByRole('button', { name: '0' });
    fireEvent.click(key0);
    fireEvent.click(key0);
    fireEvent.click(key0);
    fireEvent.click(key0);

    await waitFor(() => {
      expect(screen.getByText(/pin incorrecto/i)).toBeInTheDocument();
      expect(useAuthStore.getState().activeCashier).toBeNull();
    });
  });

  it('allows logging out when an active cashier session is present', () => {
    useAuthStore.getState().unlockWithPin('c-3', '9999');

    render(<CashierLoginModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/sesión activa/i)).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /salir/i });
    fireEvent.click(logoutBtn);

    expect(useAuthStore.getState().activeCashier).toBeNull();
  });
});
