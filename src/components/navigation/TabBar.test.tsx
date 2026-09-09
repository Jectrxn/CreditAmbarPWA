import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar';
import { useAuthStore, type CashierProfile } from '../../store/authStore';

describe('TabBar Navigation Component (Strict TDD)', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  const setMockActiveCashier = (role: CashierProfile['role']) => {
    useAuthStore.setState({
      activeCashier: {
        id: `user-${role}`,
        name: `User ${role}`,
        role,
        pin: '1234',
      },
    });
  };

  const renderWithRouter = (initialPath = '/pos') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <TabBar />
      </MemoryRouter>
    );
  };

  describe('Core Tab Navigation Links', () => {
    it('renders navigation links for Caja, Clientes, and Historial', () => {
      setMockActiveCashier('cajero');
      renderWithRouter('/pos');

      const cajaLink = screen.getByRole('link', { name: /caja/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });
      const historialLink = screen.getByRole('link', { name: /historial/i });

      expect(cajaLink).toBeInTheDocument();
      expect(cajaLink).toHaveAttribute('href', '/pos');

      expect(clientesLink).toBeInTheDocument();
      expect(clientesLink).toHaveAttribute('href', '/customers');

      expect(historialLink).toBeInTheDocument();
      expect(historialLink).toHaveAttribute('href', '/history');
    });
  });

  describe('Active Tab Styling', () => {
    it('applies active styling to Caja tab when on "/pos"', () => {
      setMockActiveCashier('cajero');
      renderWithRouter('/pos');

      const cajaLink = screen.getByRole('link', { name: /caja/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });

      expect(cajaLink).toHaveAttribute('aria-current', 'page');
      expect(clientesLink).not.toHaveAttribute('aria-current', 'page');
      expect(cajaLink.className).toContain('text-amber-700');
    });

    it('applies active styling to Clientes tab when on "/customers"', () => {
      setMockActiveCashier('cajero');
      renderWithRouter('/customers');

      const cajaLink = screen.getByRole('link', { name: /caja/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });

      expect(clientesLink).toHaveAttribute('aria-current', 'page');
      expect(cajaLink).not.toHaveAttribute('aria-current', 'page');
      expect(clientesLink.className).toContain('text-amber-700');
    });

    it('applies active styling to Historial tab when on "/history"', () => {
      setMockActiveCashier('cajero');
      renderWithRouter('/history');

      const historialLink = screen.getByRole('link', { name: /historial/i });
      expect(historialLink).toHaveAttribute('aria-current', 'page');
      expect(historialLink.className).toContain('text-amber-700');
    });
  });

  describe('Role-based Conditional Supervisor Tab', () => {
    it('does NOT render Supervisor tab for cashier role ("cajero")', () => {
      setMockActiveCashier('cajero');
      renderWithRouter('/pos');

      expect(screen.queryByRole('link', { name: /supervisor/i })).not.toBeInTheDocument();
    });

    it('does NOT render Supervisor tab when no cashier is authenticated', () => {
      useAuthStore.setState({ activeCashier: null });
      renderWithRouter('/pos');

      expect(screen.queryByRole('link', { name: /supervisor/i })).not.toBeInTheDocument();
    });

    it('renders Supervisor tab with link to "/supervisor" for "supervisor" role', () => {
      setMockActiveCashier('supervisor');
      renderWithRouter('/pos');

      const supervisorLink = screen.getByRole('link', { name: /supervisor/i });
      expect(supervisorLink).toBeInTheDocument();
      expect(supervisorLink).toHaveAttribute('href', '/supervisor');
    });

    it('renders Supervisor tab for higher ranked role "jefe"', () => {
      setMockActiveCashier('jefe');
      renderWithRouter('/pos');

      const supervisorLink = screen.getByRole('link', { name: /supervisor/i });
      expect(supervisorLink).toBeInTheDocument();
      expect(supervisorLink).toHaveAttribute('href', '/supervisor');
    });

    it('applies active styling to Supervisor tab when on "/supervisor"', () => {
      setMockActiveCashier('supervisor');
      renderWithRouter('/supervisor');

      const supervisorLink = screen.getByRole('link', { name: /supervisor/i });
      expect(supervisorLink).toHaveAttribute('aria-current', 'page');
      expect(supervisorLink.className).toContain('text-amber-700');
    });
  });

  describe('Liquid Glass Styling & Bottom Positioning', () => {
    it('renders nav element with fixed bottom positioning and Liquid Glass blur classes', () => {
      setMockActiveCashier('cajero');
      const { container } = renderWithRouter('/pos');

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav?.className).toContain('fixed');
      expect(nav?.className).toContain('bottom-0');
      expect(nav?.className).toContain('backdrop-blur');
    });
  });
});
