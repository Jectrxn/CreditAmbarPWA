import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PosPage } from './PosPage';
import { CustomersPage } from './CustomersPage';
import { HistoryPage } from './HistoryPage';
import { SupervisorPage } from './SupervisorPage';

describe('Placeholder Pages (Strict TDD)', () => {
  it('renders PosPage with title and container', () => {
    render(<PosPage />);
    expect(screen.getByRole('heading', { level: 1, name: /caja/i })).toBeInTheDocument();
    expect(screen.getByTestId('page-pos')).toBeInTheDocument();
  });

  it('renders CustomersPage with title and container', () => {
    render(<CustomersPage />);
    expect(screen.getByRole('heading', { level: 1, name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByTestId('page-customers')).toBeInTheDocument();
  });

  it('renders HistoryPage with title and container', () => {
    render(<HistoryPage />);
    expect(screen.getByRole('heading', { level: 1, name: /historial/i })).toBeInTheDocument();
    expect(screen.getByTestId('page-history')).toBeInTheDocument();
  });

  it('renders SupervisorPage with title and container', () => {
    render(<SupervisorPage />);
    expect(screen.getByRole('heading', { level: 1, name: /supervisor/i })).toBeInTheDocument();
    expect(screen.getByTestId('page-supervisor')).toBeInTheDocument();
  });
});
