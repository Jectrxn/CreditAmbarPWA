import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupervisorDashboard } from './SupervisorDashboard';
import type { CashierSession } from '../session/sessionStore';

describe('SupervisorDashboard Component (Strict TDD)', () => {
  const mockSessions: CashierSession[] = [
    {
      id: 'sess-1',
      cashierId: 'c-1',
      cashierName: 'Laura Gómez',
      storeId: 'store-1',
      status: 'open',
      startingFloat: 100,
      currentCashTotal: 350,
      cashPaymentsTotal: 250,
      qrPaymentsTotal: 50,
      openedAt: '2026-09-05T08:00:00.000Z',
    },
    {
      id: 'sess-2',
      cashierId: 'c-2',
      cashierName: 'Carlos Ruiz',
      storeId: 'store-1',
      status: 'open',
      startingFloat: 50,
      currentCashTotal: 170,
      cashPaymentsTotal: 120,
      qrPaymentsTotal: 80,
      openedAt: '2026-09-05T09:00:00.000Z',
    },
  ];

  const mockClosedSession: CashierSession = {
    id: 'sess-closed',
    cashierId: 'c-3',
    cashierName: 'Don Roberto',
    storeId: 'store-1',
    status: 'closed',
    startingFloat: 100,
    currentCashTotal: 100,
    cashPaymentsTotal: 0,
    qrPaymentsTotal: 0,
    openedAt: '2026-09-05T06:00:00.000Z',
    closedAt: '2026-09-05T07:00:00.000Z',
    closeReason: 'Closed by Supervisor',
  };

  it('renders aggregated metrics and active sessions with expected cash', () => {
    render(<SupervisorDashboard sessions={mockSessions} isOnline={true} />);

    // Total expected cash: 350 + 170 = 520
    expect(screen.getByText('Panel de Supervisión')).toBeInTheDocument();
    expect(screen.getByText('$520.00')).toBeInTheDocument();

    // Cashier names
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();

    // Individual expected cash
    expect(screen.getByText('$350.00')).toBeInTheDocument();
    expect(screen.getByText('$170.00')).toBeInTheDocument();

    // Active sessions count badge
    expect(screen.getByText(/2 cajas activas/i)).toBeInTheDocument();
  });

  it('renders offline warning banner when device loses internet connection', () => {
    render(<SupervisorDashboard sessions={mockSessions} isOnline={false} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/offline - data may be outdated/i);
  });

  it('does NOT render offline warning banner when online', () => {
    render(<SupervisorDashboard sessions={mockSessions} isOnline={true} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('triggers onForceClose callback when clicking force close button on active session', () => {
    const handleForceClose = vi.fn();
    render(
      <SupervisorDashboard
        sessions={mockSessions}
        isOnline={true}
        onForceClose={handleForceClose}
      />
    );

    const forceCloseButtons = screen.getAllByRole('button', { name: /forzar cierre/i });
    expect(forceCloseButtons).toHaveLength(2);

    fireEvent.click(forceCloseButtons[0]);
    expect(handleForceClose).toHaveBeenCalledWith('sess-1');
  });

  it('displays closed session indicator and disables or hides force close on closed session', () => {
    const handleForceClose = vi.fn();
    render(
      <SupervisorDashboard
        sessions={[...mockSessions, mockClosedSession]}
        isOnline={true}
        onForceClose={handleForceClose}
      />
    );

    expect(screen.getByText('Don Roberto')).toBeInTheDocument();
    expect(screen.getByText(/cerrada/i)).toBeInTheDocument();
    expect(screen.getByText(/closed by supervisor/i)).toBeInTheDocument();

    // Only 2 force close buttons for the 2 open sessions
    const forceCloseButtons = screen.getAllByRole('button', { name: /forzar cierre/i });
    expect(forceCloseButtons).toHaveLength(2);
  });
});
