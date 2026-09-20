import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
      expect(nav?.className).toContain('bottom-4');
      expect(nav?.className).toContain('rounded-full');
      expect(nav?.className).toContain('backdrop-blur');
    });
  });

  describe('Floating Speed Dial Action Menu (Option A Refinements)', () => {
    it('opens menu with compacted 310px arc container when central button is clicked', () => {
      renderWithRouter('/');

      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });
      expect(screen.queryByRole('menu', { name: /acciones rápidas/i })).not.toBeInTheDocument();

      fireEvent.click(centralPlusBtn);

      const menu = screen.getByRole('menu', { name: /acciones rápidas/i });
      expect(menu).toBeInTheDocument();
      expect(menu.className).toContain('max-w-[310px]');
      expect(menu.className).toContain('grid-cols-3');
    });

    it('renders 3 action orbs with authentic translucent Liquid Glass micro-capsules and caustic ambient halos', () => {
      renderWithRouter('/');

      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });
      fireEvent.click(centralPlusBtn);

      const fiadoBtn = screen.getByRole('menuitem', { name: /registrar nuevo fiado/i });
      const abonarBtn = screen.getByRole('menuitem', { name: /registrar abono/i });
      const clienteBtn = screen.getByRole('menuitem', { name: /registrar nuevo cliente/i });

      expect(fiadoBtn).toBeInTheDocument();
      expect(abonarBtn).toBeInTheDocument();
      expect(clienteBtn).toBeInTheDocument();

      // Verify Option A Micro-Capsule badges
      const fiadoBadge = screen.getByText('Nuevo Fiado');
      const abonarBadge = screen.getByText('Abonar');
      const clienteBadge = screen.getByText('Cliente');

      for (const badge of [fiadoBadge, abonarBadge, clienteBadge]) {
        expect(badge.className).toContain('bg-white/[0.35]');
        expect(badge.className).toContain('backdrop-blur-[16px]');
        expect(badge.className).toContain('border-white/80');
        expect(badge.className).toContain('text-slate-900');
        expect(badge.className).toContain('font-extrabold');
        expect(badge.className).toContain('shadow-sm');
      }

      // Verify caustic colored ambient glow outer collar halos
      const fiadoHalo = fiadoBtn.querySelector('div');
      const abonarHalo = abonarBtn.querySelector('div');
      const clienteHalo = clienteBtn.querySelector('div');

      expect(fiadoHalo?.className).toContain('shadow-[0_8px_24px_rgba(245,158,11,0.28)]');
      expect(abonarHalo?.className).toContain('shadow-[0_8px_24px_rgba(16,185,129,0.28)]');
      expect(clienteHalo?.className).toContain('shadow-[0_8px_24px_rgba(14,165,233,0.28)]');
    });

    it('closes the Speed Dial menu when clicking the backdrop', () => {
      const { container } = renderWithRouter('/');

      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });
      fireEvent.click(centralPlusBtn);

      expect(screen.getByRole('menu', { name: /acciones rápidas/i })).toBeInTheDocument();

      // Find and click the glass backdrop
      const backdrop = container.querySelector('.bg-slate-950\\/35');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(screen.queryByRole('menu', { name: /acciones rápidas/i })).not.toBeInTheDocument();
    });

    it('closes the Speed Dial menu when pressing Escape key', () => {
      renderWithRouter('/');

      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });
      fireEvent.click(centralPlusBtn);

      expect(screen.getByRole('menu', { name: /acciones rápidas/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByRole('menu', { name: /acciones rápidas/i })).not.toBeInTheDocument();
    });

    it('closes the Speed Dial menu when selecting an action', () => {
      renderWithRouter('/');

      const centralPlusBtn = screen.getByRole('button', { name: /registrar nuevo fiado/i });
      fireEvent.click(centralPlusBtn);

      const fiadoBtn = screen.getByRole('menuitem', { name: /registrar nuevo fiado/i });
      fireEvent.click(fiadoBtn);

      expect(screen.queryByRole('menu', { name: /acciones rápidas/i })).not.toBeInTheDocument();
    });
  });

  describe('Pending badge store partitioning (T3)', () => {
    it('counts only active-store debtors in the Cobros badge', async () => {
      const { db } = await import('../../lib/dexie');
      await db.customers.clear();
      await db.customers.bulkPut([
        {
          id: 'c-active',
          store_id: 'store-1',
          name: 'Active Debtor',
          credit_limit: 200,
          balance: 50,
          created_at: new Date().toISOString(),
        },
        {
          id: 'c-other',
          store_id: 'store-test',
          name: 'Other Store Debtor',
          credit_limit: 200,
          balance: 60,
          created_at: new Date().toISOString(),
        },
      ]);
      useAuthStore.getState().setStoreSession({
        storeId: 'store-1',
        storeName: 'Ámbar Bodega',
        authenticatedAt: new Date().toISOString(),
      });

      renderWithRouter('/history');

      const badge = await screen.findByText('1', { selector: 'span' });
      expect(badge).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      await db.customers.clear();
    });
  });
});
