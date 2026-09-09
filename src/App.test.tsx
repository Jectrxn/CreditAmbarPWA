import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useAuthStore } from './store/authStore';

describe('App - Application Shell Integration & Routing (Strict TDD)', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-test-1',
      storeName: 'Bodega Ámbar',
      authenticatedAt: new Date().toISOString(),
    });
    useAuthStore.getState().setCashiers([
      { id: 'c-1', name: 'Laura Gómez', role: 'cajero', pin: '1234' },
      { id: 'c-2', name: 'Marcos Rivas', role: 'supervisor', pin: '4321' },
      { id: 'c-3', name: 'Don Roberto', role: 'jefe', pin: '9999' },
    ]);
  });

  describe('Unauthenticated / Locked State (Terminal Login)', () => {
    it('renders Terminal de Tienda PIN unlock screen when locked', () => {
      // By default isLocked is true and activeCashier is null
      render(<App initialEntries={['/pos']} />);

      expect(screen.getByText('Terminal de Tienda')).toBeInTheDocument();
      expect(screen.getByText(/Seleccione su nombre e introduzca su PIN/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /desbloquear terminal/i })).toBeInTheDocument();
      expect(screen.queryByTestId('page-pos')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: /navegación principal/i })).not.toBeInTheDocument();
    });

    it('unlocks terminal upon entering valid cashier PIN and transitions to routes', async () => {
      render(<App initialEntries={['/pos']} />);

      // Select cashier Laura Gómez
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'c-1' } });

      // Enter PIN
      const pinInput = screen.getByPlaceholderText('••••');
      fireEvent.change(pinInput, { target: { value: '1234' } });

      // Submit unlock form
      const unlockButton = screen.getByRole('button', { name: /desbloquear terminal/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByTestId('page-pos')).toBeInTheDocument();
      });

      expect(screen.getByText('Laura Gómez')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
    });

    it('shows error message on incorrect PIN', () => {
      render(<App initialEntries={['/pos']} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'c-1' } });

      const pinInput = screen.getByPlaceholderText('••••');
      fireEvent.change(pinInput, { target: { value: '0000' } });

      const unlockButton = screen.getByRole('button', { name: /desbloquear terminal/i });
      fireEvent.click(unlockButton);

      expect(screen.getByText(/PIN incorrecto/i)).toBeInTheDocument();
      expect(screen.queryByTestId('page-pos')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Navigation Shell & Routes', () => {
    beforeEach(() => {
      // Unlock session as cashier
      useAuthStore.getState().unlockWithPin('c-1', '1234');
    });

    it('redirects root route / to /pos and renders PosPage inside AppLayout shell', async () => {
      render(<App initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-pos')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 1, name: /caja/i })).toBeInTheDocument();

      // TopBar rendered
      expect(screen.getByText('CreditAmbar')).toBeInTheDocument();
      expect(screen.getByTestId('sync-status')).toBeInTheDocument();

      // TabBar rendered
      const nav = screen.getByRole('navigation', { name: /navegación principal/i });
      expect(nav).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /caja/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /historial/i })).toBeInTheDocument();
    });

    it('renders CustomersPage when navigating to /customers', () => {
      render(<App initialEntries={['/customers']} />);

      expect(screen.getByTestId('page-customers')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /clientes/i })).toBeInTheDocument();
      expect(screen.queryByTestId('page-pos')).not.toBeInTheDocument();
    });

    it('renders HistoryPage when navigating to /history', () => {
      render(<App initialEntries={['/history']} />);

      expect(screen.getByTestId('page-history')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /historial/i })).toBeInTheDocument();
    });

    it('allows navigating between tabs by clicking TabBar links', async () => {
      render(<App initialEntries={['/pos']} />);

      expect(screen.getByTestId('page-pos')).toBeInTheDocument();

      // Click Clientes tab
      const customersLink = screen.getByRole('link', { name: /clientes/i });
      fireEvent.click(customersLink);

      await waitFor(() => {
        expect(screen.getByTestId('page-customers')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('page-pos')).not.toBeInTheDocument();

      // Click Historial tab
      const historyLink = screen.getByRole('link', { name: /historial/i });
      fireEvent.click(historyLink);

      await waitFor(() => {
        expect(screen.getByTestId('page-history')).toBeInTheDocument();
      });
    });

    it('locks the session and returns to login screen when clicking Bloquear in TopBar', async () => {
      render(<App initialEntries={['/pos']} />);

      expect(screen.getByTestId('page-pos')).toBeInTheDocument();

      const lockButton = screen.getByRole('button', { name: /bloquear/i });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(screen.getByText('Terminal de Tienda')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('page-pos')).not.toBeInTheDocument();
    });

    it('redirects unknown paths to /pos', async () => {
      render(<App initialEntries={['/non-existent-route']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-pos')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Route Protection (/supervisor)', () => {
    it('redirects unauthorized cashier to /pos when accessing /supervisor', async () => {
      // Unlock as regular cashier (c-1, role: 'cajero')
      useAuthStore.getState().unlockWithPin('c-1', '1234');

      render(<App initialEntries={['/supervisor']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-pos')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('page-supervisor')).not.toBeInTheDocument();
      // TabBar does NOT show supervisor tab for cashier
      expect(screen.queryByRole('link', { name: /supervisor/i })).not.toBeInTheDocument();
    });

    it('allows supervisor to access /supervisor and renders SupervisorPage', async () => {
      // Unlock as supervisor (c-2, role: 'supervisor')
      useAuthStore.getState().unlockWithPin('c-2', '4321');

      render(<App initialEntries={['/supervisor']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-supervisor')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 1, name: /supervisor/i })).toBeInTheDocument();
      // TabBar DOES show supervisor tab for supervisor
      expect(screen.getByRole('link', { name: /supervisor/i })).toBeInTheDocument();
    });
  });
});
