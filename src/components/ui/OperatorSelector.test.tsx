import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OperatorSelector } from './OperatorSelector';
import { useAuthStore, DEFAULT_CASHIERS } from '../../store/authStore';

describe('OperatorSelector - 1-Touch Liquid Glass Cashier Selection', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setCashiers(DEFAULT_CASHIERS);
  });

  it('renders all 4 cashiers (Martin, Emiliano, Anthony, Benjamin)', () => {
    const onSelect = vi.fn();
    render(<OperatorSelector selectedName="Martin" onSelect={onSelect} />);

    expect(screen.getByText('Martin')).toBeInTheDocument();
    expect(screen.getByText('Emiliano')).toBeInTheDocument();
    expect(screen.getByText('Anthony')).toBeInTheDocument();
    expect(screen.getByText('Benjamin')).toBeInTheDocument();
  });

  it('indicates selected cashier with aria-pressed', () => {
    const onSelect = vi.fn();
    render(<OperatorSelector selectedName="Emiliano" onSelect={onSelect} />);

    const emilianoBtn = screen.getByRole('button', { name: /Emiliano/i });
    const martinBtn = screen.getByRole('button', { name: /Martin/i });

    expect(emilianoBtn).toHaveAttribute('aria-pressed', 'true');
    expect(martinBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect and updates currentOperatorName on click', () => {
    const onSelect = vi.fn();
    render(<OperatorSelector selectedName="Martin" onSelect={onSelect} />);

    const anthonyBtn = screen.getByRole('button', { name: /Anthony/i });
    fireEvent.click(anthonyBtn);

    expect(onSelect).toHaveBeenCalledWith('Anthony');
    expect(useAuthStore.getState().currentOperatorName).toBe('Anthony');
  });
});
