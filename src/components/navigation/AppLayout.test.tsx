import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useAuthStore } from '../../store/authStore';

describe('AppLayout Component (Strict TDD)', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setStoreSession({
      storeId: 'store-1',
      storeName: 'Bodega Ámbar',
      authenticatedAt: new Date().toISOString(),
    });
    useAuthStore.getState().setCashiers([
      { id: 'c-1', name: 'Laura Gómez', role: 'cajero', pin: '1234' },
      { id: 'c-2', name: 'Marcos Supervisor', role: 'supervisor', pin: '4321' },
    ]);
    useAuthStore.getState().unlockWithPin('c-1', '1234');
  });

  it('renders TopBar, TabBar, and route content via Outlet in main container', () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/pos" element={<div data-testid="test-pos-content">Vista de Caja</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Verify TopBar elements rendered
    expect(screen.getByText('CreditAmbar')).toBeInTheDocument();
    expect(screen.getByText('Bodega Ámbar • Bodega & Fiambrería')).toBeInTheDocument();
    expect(screen.getByTestId('sync-status')).toBeInTheDocument();

    // Verify TabBar elements rendered
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /caja/i })).toBeInTheDocument();

    // Verify Outlet rendered within main landmark
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByTestId('test-pos-content')).toBeInTheDocument();
    expect(screen.getByText('Vista de Caja')).toBeInTheDocument();
    expect(main).toContainElement(screen.getByTestId('test-pos-content'));
  });

  it('renders different route content via Outlet when location changes', () => {
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/pos" element={<div data-testid="pos-page">Caja</div>} />
            <Route path="/customers" element={<div data-testid="customers-page">Clientes Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('pos-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('customers-page')).toBeInTheDocument();
    expect(screen.getByText('Clientes Content')).toBeInTheDocument();

    // Both TopBar and TabBar remain present
    expect(screen.getByText('CreditAmbar')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
  });

  it('applies custom className to layout wrapper if provided', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout className="custom-test-layout" />}>
            <Route path="/" element={<div>Root</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const layoutRoot = container.firstElementChild as HTMLElement;
    expect(layoutRoot).toBeInTheDocument();
    expect(layoutRoot.className).toContain('custom-test-layout');
  });

  it('renders ambient lighting orbs and persistent layout structure', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div data-testid="child-node">Child View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByTestId('child-node')).toBeInTheDocument();

    // Check header and nav exist alongside main
    const header = container.querySelector('header');
    const nav = container.querySelector('nav');
    expect(header).toBeInTheDocument();
    expect(nav).toBeInTheDocument();
  });
});
