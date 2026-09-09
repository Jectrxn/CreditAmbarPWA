import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore, CashierProfile } from '../../store/authStore';

describe('ProtectedRoute Component (Strict TDD)', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  const setMockActiveCashier = (role: CashierProfile['role']) => {
    const profile: CashierProfile = {
      id: `user-${role}`,
      name: `User ${role}`,
      role,
      pin: '1234',
    };
    useAuthStore.setState({
      activeCashier: profile,
      isLocked: false,
    });
  };

  const renderWithRouter = (ui: React.ReactElement, initialPath = '/supervisor') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/supervisor" element={ui} />
          <Route path="/" element={<div>Caja Default View</div>} />
          <Route path="/login" element={<div>Login View</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders children when active cashier has exact required role', () => {
    setMockActiveCashier('supervisor');

    renderWithRouter(
      <ProtectedRoute requiredRole="supervisor">
        <div>Supervisor Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Supervisor Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Caja Default View')).not.toBeInTheDocument();
  });

  it('renders children when active cashier has higher ranked role than required', () => {
    setMockActiveCashier('jefe');

    renderWithRouter(
      <ProtectedRoute requiredRole="supervisor">
        <div>Supervisor Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Supervisor Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Caja Default View')).not.toBeInTheDocument();
  });

  it('redirects to default fallback "/" when cashier has lower ranked role', () => {
    setMockActiveCashier('cajero');

    renderWithRouter(
      <ProtectedRoute requiredRole="supervisor">
        <div>Supervisor Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Supervisor Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Caja Default View')).toBeInTheDocument();
  });

  it('redirects to default fallback "/" when no cashier is authenticated', () => {
    // No active cashier
    useAuthStore.setState({ activeCashier: null });

    renderWithRouter(
      <ProtectedRoute requiredRole="supervisor">
        <div>Supervisor Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Supervisor Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Caja Default View')).toBeInTheDocument();
  });

  it('redirects to custom fallbackPath when unauthorized', () => {
    setMockActiveCashier('cajero');

    renderWithRouter(
      <ProtectedRoute requiredRole="supervisor" fallbackPath="/login">
        <div>Supervisor Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Supervisor Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login View')).toBeInTheDocument();
  });
});
