import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useAuthStore } from '../../store/authStore';
import { useSyncStatus } from '../../hooks/useSyncStatus';

vi.mock('../../hooks/useSyncStatus', () => ({
  useSyncStatus: vi.fn(),
}));

describe('TopBar Navigation Component (Strict TDD)', () => {
  const mockUseSyncStatus = vi.mocked(useSyncStatus);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    mockUseSyncStatus.mockReturnValue('online');
  });

  describe('Sync Status Indicator', () => {
    it('displays online sync status indicator', () => {
      mockUseSyncStatus.mockReturnValue('online');

      render(<TopBar />);

      const indicator = screen.getByTestId('sync-status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('data-status', 'online');
      expect(screen.getByText(/en línea/i)).toBeInTheDocument();
    });

    it('displays syncing status indicator', () => {
      mockUseSyncStatus.mockReturnValue('syncing');

      render(<TopBar />);

      const indicator = screen.getByTestId('sync-status');
      expect(indicator).toHaveAttribute('data-status', 'syncing');
      expect(screen.getByText(/sincronizando/i)).toBeInTheDocument();
    });

    it('displays offline status indicator', () => {
      mockUseSyncStatus.mockReturnValue('offline');

      render(<TopBar />);

      const indicator = screen.getByTestId('sync-status');
      expect(indicator).toHaveAttribute('data-status', 'offline');
      expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
    });

    it('displays error sync status indicator', () => {
      mockUseSyncStatus.mockReturnValue('error');

      render(<TopBar />);

      const indicator = screen.getByTestId('sync-status');
      expect(indicator).toHaveAttribute('data-status', 'error');
      expect(screen.getByText(/error de sincronización/i)).toBeInTheDocument();
    });
  });

  describe('Active Cashier Profile & Store Session', () => {
    it('renders active cashier profile name and role badge', () => {
      useAuthStore.setState({
        activeCashier: {
          id: 'c-1',
          name: 'Laura Gómez',
          role: 'cajero',
          pin: '1234',
        },
      });

      render(<TopBar />);

      expect(screen.getByText('Laura Gómez')).toBeInTheDocument();
      expect(screen.getByText('(cajero)')).toBeInTheDocument();
      expect(screen.queryByText(/esperando operador/i)).not.toBeInTheDocument();
    });

    it('renders supervisor role badge when supervisor is logged in', () => {
      useAuthStore.setState({
        activeCashier: {
          id: 'c-2',
          name: 'Marcos Rivas',
          role: 'supervisor',
          pin: '4321',
        },
      });

      render(<TopBar />);

      expect(screen.getByText('Marcos Rivas')).toBeInTheDocument();
      expect(screen.getByText('(supervisor)')).toBeInTheDocument();
    });

    it('renders "Activar Admin" button when no cashier is authenticated and opens login modal on click', async () => {
      useAuthStore.setState({
        activeCashier: null,
        cashiers: [
          { id: 'c-3', name: 'Don Roberto', role: 'jefe', pin: '9999' },
        ],
      });

      render(<TopBar />);

      const activateAdminBtn = screen.getByRole('button', { name: /activar admin/i });
      expect(activateAdminBtn).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bloquear/i })).not.toBeInTheDocument();

      fireEvent.click(activateAdminBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/acceso autorizado/i)).toBeInTheDocument();
    });

    it('renders minimal brand title Ámbar', () => {
      useAuthStore.setState({
        storeSession: {
          storeId: 'store-100',
          storeName: 'Fiambrería El Ámbar',
          authenticatedAt: new Date().toISOString(),
        },
      });

      render(<TopBar />);

      expect(screen.getByText('Ámbar')).toBeInTheDocument();
    });
  });

  describe('Session Lock Trigger', () => {
    it('invokes lockSession when lock session button is clicked', () => {
      const lockSessionMock = vi.fn();
      useAuthStore.setState({
        activeCashier: {
          id: 'c-1',
          name: 'Laura Gómez',
          role: 'cajero',
          pin: '1234',
        },
        lockSession: lockSessionMock,
      });

      render(<TopBar />);

      const lockButton = screen.getByRole('button', { name: /bloquear/i });
      expect(lockButton).toBeInTheDocument();

      fireEvent.click(lockButton);
      expect(lockSessionMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Liquid Glass Aesthetics & Structure', () => {
    it('renders header element with Liquid Glass container and sticky positioning', () => {
      const { container } = render(<TopBar />);

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header?.className).toContain('sticky');
      expect(header?.className).toContain('top-0');
      expect(header?.className).toContain('backdrop-blur');
    });
  });
});
