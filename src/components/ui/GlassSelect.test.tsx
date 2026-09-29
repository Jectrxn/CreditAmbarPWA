import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlassSelect } from './GlassSelect';

const options = [
  { value: '1', label: 'Carlos Mendoza' },
  { value: '2', label: 'Maria Lopez' },
  { value: '3', label: 'Juan Perez' },
];

describe('GlassSelect', () => {
  it('renders the selected option label in the closed button', () => {
    render(<GlassSelect options={options} value="1" onChange={() => {}} ariaLabel="Cliente" />);
    expect(screen.getByRole('button', { name: /Carlos Mendoza/i })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on click showing all options', () => {
    render(<GlassSelect options={options} value="1" onChange={() => {}} ariaLabel="Cliente" />);
    const button = screen.getByRole('button', { name: /Carlos Mendoza/i });

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: /Maria Lopez/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Juan Perez/i })).toBeInTheDocument();
    // Selected option is marked
    expect(screen.getByRole('option', { name: /Carlos Mendoza/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('selects an option on click: calls onChange and closes', () => {
    const onChange = vi.fn();
    render(<GlassSelect options={options} value="1" onChange={onChange} ariaLabel="Cliente" />);

    fireEvent.click(screen.getByRole('button', { name: /Carlos Mendoza/i }));
    fireEvent.click(screen.getByRole('option', { name: /Maria Lopez/i }));

    expect(onChange).toHaveBeenCalledWith('2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keyboard: ArrowDown opens, arrows move highlight, Enter selects, Escape closes', () => {
    const onChange = vi.fn();
    render(<GlassSelect options={options} value="1" onChange={onChange} ariaLabel="Cliente" />);
    const button = screen.getByRole('button', { name: /Carlos Mendoza/i });

    // ArrowDown opens with the selected option highlighted
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(button.getAttribute('aria-activedescendant')).toContain('-option-0');

    // ArrowDown moves the highlight to the next option
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button.getAttribute('aria-activedescendant')).toContain('-option-1');

    // ArrowUp moves it back
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    expect(button.getAttribute('aria-activedescendant')).toContain('-option-0');

    // ArrowDown + Enter selects Maria Lopez
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Reopen and close with Escape
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the placeholder in a muted tone when value matches no option', () => {
    render(
      <GlassSelect
        options={options}
        value=""
        onChange={() => {}}
        ariaLabel="Cliente"
        placeholder="Selecciona un cliente"
      />
    );
    const button = screen.getByRole('button', { name: 'Cliente' });

    expect(button).toHaveTextContent('Selecciona un cliente');
    const placeholderSpan = screen.getByText('Selecciona un cliente');
    expect(placeholderSpan.className).toMatch(/text-slate-400/);

    // Accessible name stays the bare ariaLabel (no placeholder appended).
    expect(button).toHaveAccessibleName('Cliente');
  });

  it('marks no option as selected when value matches nothing', () => {
    render(
      <GlassSelect
        options={options}
        value="does-not-exist"
        onChange={() => {}}
        ariaLabel="Cliente"
        placeholder="Selecciona un cliente"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cliente' }));

    for (const option of screen.getAllByRole('option')) {
      expect(option).toHaveAttribute('aria-selected', 'false');
    }
  });
});
