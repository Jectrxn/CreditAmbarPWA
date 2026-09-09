import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar';
import { useAuthStore } from '../../store/authStore';

describe('TabBar Navigation Component (Strict TDD)', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <TabBar />
      </MemoryRouter>
    );
  };

  describe('Core Tab Navigation Links', () => {
    it('renders navigation links for Inicio, Clientes, Cobros, and Reportes plus central action button', () => {
      renderWithRouter('/');

      const inicioLink = screen.getByRole('link', { name: /inicio/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });
      const cobrosLink = screen.getByRole('link', { name: /cobros/i });
      const reportesLink = screen.getByRole('link', { name: /reportes/i });
      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });

      expect(inicioLink).toBeInTheDocument();
      expect(inicioLink).toHaveAttribute('href', '/');

      expect(clientesLink).toBeInTheDocument();
      expect(clientesLink).toHaveAttribute('href', '/customers');

      expect(cobrosLink).toBeInTheDocument();
      expect(cobrosLink).toHaveAttribute('href', '/history');

      expect(reportesLink).toBeInTheDocument();
      expect(reportesLink).toHaveAttribute('href', '/supervisor');

      expect(centralPlusBtn).toBeInTheDocument();
    });
  });

  describe('Active Tab Styling', () => {
    it('applies active styling to Inicio tab when on "/"', () => {
      renderWithRouter('/');

      const inicioLink = screen.getByRole('link', { name: /inicio/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });

      expect(inicioLink).toHaveAttribute('aria-current', 'page');
      expect(clientesLink).not.toHaveAttribute('aria-current', 'page');
      expect(inicioLink.className).toContain('text-amber-800');
    });

    it('applies active styling to Clientes tab when on "/customers"', () => {
      renderWithRouter('/customers');

      const inicioLink = screen.getByRole('link', { name: /inicio/i });
      const clientesLink = screen.getByRole('link', { name: /clientes/i });

      expect(clientesLink).toHaveAttribute('aria-current', 'page');
      expect(inicioLink).not.toHaveAttribute('aria-current', 'page');
      expect(clientesLink.className).toContain('text-amber-800');
    });

    it('applies active styling to Cobros tab when on "/history"', () => {
      renderWithRouter('/history');

      const cobrosLink = screen.getByRole('link', { name: /cobros/i });
      expect(cobrosLink).toHaveAttribute('aria-current', 'page');
      expect(cobrosLink.className).toContain('text-amber-800');
    });
  });

  describe('Liquid Glass Styling & Bottom Positioning', () => {
    it('renders nav element with fixed bottom positioning and Liquid Glass blur classes', () => {
      const { container } = renderWithRouter('/');

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav?.className).toContain('fixed');
      expect(nav?.className).toContain('bottom-0');
      expect(nav?.className).toContain('backdrop-blur');
    });
  });
});
