import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useAuthStore } from './store/authStore';
import { db } from './lib/dexie';

describe('App - Application Shell Integration & Routing (Strict TDD)', () => {
  beforeEach(async () => {
    await db.customers.clear();
    await db.creditTransactions.clear();

    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-test-1',
      storeName: 'Ámbar Bodega',
      authenticatedAt: new Date().toISOString(),
    });
    useAuthStore.getState().setCashiers([
      { id: 'c-1', name: 'Laura Gómez', role: 'cajero', pin: '1234' },
      { id: 'c-2', name: 'Marcos Rivas', role: 'supervisor', pin: '4321' },
      { id: 'c-3', name: 'Don Roberto', role: 'jefe', pin: '9999' },
    ]);
  });

  describe('Frictionless Direct Launch to HomePage', () => {
    it('renders HomePage dashboard directly upon entering root route /', async () => {
      render(<App initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-home')).toBeInTheDocument();
      });

      // TopBar rendered
      expect(screen.getByText('CreditAmbar')).toBeInTheDocument();
      expect(screen.getByTestId('sync-status')).toBeInTheDocument();

      // TabBar rendered
      const nav = screen.getByRole('navigation', { name: /navegación principal/i });
      expect(nav).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /cobros/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reportes/i })).toBeInTheDocument();
    });

    it('renders CustomersPage when navigating to /customers', async () => {
      render(<App initialEntries={['/customers']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-customers')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { level: 1, name: /clientes/i })).toBeInTheDocument();
      expect(screen.queryByTestId('page-home')).not.toBeInTheDocument();
    });

    it('renders HistoryPage when navigating to /history', async () => {
      render(<App initialEntries={['/history']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-history')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { level: 1, name: /historial/i })).toBeInTheDocument();
    });

    it('renders SupervisorPage when navigating to /supervisor', async () => {
      render(<App initialEntries={['/supervisor']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-supervisor')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { level: 1, name: /supervisor/i })).toBeInTheDocument();
    });

    it('allows navigating between tabs seamlessly by clicking TabBar links', async () => {
      render(<App initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-home')).toBeInTheDocument();
      });

      // Click Clientes tab
      const customersLink = screen.getByRole('link', { name: /clientes/i });
      fireEvent.click(customersLink);

      await waitFor(() => {
        expect(screen.getByTestId('page-customers')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('page-home')).not.toBeInTheDocument();

      // Click Cobros tab
      const historyLink = screen.getByRole('link', { name: /cobros/i });
      fireEvent.click(historyLink);

      await waitFor(() => {
        expect(screen.getByTestId('page-history')).toBeInTheDocument();
      });
    });

    it('redirects unknown paths to root /', async () => {
      render(<App initialEntries={['/non-existent-route']} />);

      await waitFor(() => {
        expect(screen.getByTestId('page-home')).toBeInTheDocument();
      });
    });
  });
});
