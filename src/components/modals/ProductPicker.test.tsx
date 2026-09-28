import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ProductPicker, suggestedTotal, type DraftItem } from './ProductPicker';
import { db } from '../../lib/dexie';

const STORE_ID = 'store-1';

function Harness({
  initialItems = [],
  initialNote = '',
  onError,
}: {
  initialItems?: DraftItem[];
  initialNote?: string;
  onError?: (msg: string) => void;
}) {
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [note, setNote] = useState(initialNote);
  return (
    <ProductPicker
      storeId={STORE_ID}
      items={items}
      onChange={setItems}
      note={note}
      onNoteChange={setNote}
      onError={onError}
    />
  );
}

describe('suggestedTotal', () => {
  it('sums qty * unitPrice and returns 0 for an empty list', () => {
    expect(suggestedTotal([])).toBe(0);
    expect(
      suggestedTotal([
        { productId: 'a', name: 'Leche Gloria', qty: 2, unitPrice: 4.5 },
        { productId: 'b', name: 'Arroz', qty: 1, unitPrice: 5.5 },
      ])
    ).toBeCloseTo(14.5, 2);
  });
});

describe('ProductPicker', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.syncQueue.clear();
    await db.products.put({
      id: 'prod-1',
      store_id: STORE_ID,
      name: 'Arroz costeño',
      price: 5.5,
      created_at: new Date().toISOString(),
      synced: false,
    });
    await db.products.put({
      id: 'prod-2',
      store_id: STORE_ID,
      name: 'Leche Gloria',
      price: 4.5,
      created_at: new Date().toISOString(),
      synced: false,
    });
  });

  it('searches with min 2 chars and adds the tapped match as a line row', async () => {
    render(<Harness />);

    const search = screen.getByLabelText(/buscar producto/i);
    // Single char triggers no lookup
    fireEvent.change(search, { target: { value: 'a' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'arr' } });
    const option = await screen.findByRole('option', { name: /Arroz costeño/i });
    expect(option).toHaveTextContent('S/ 5.50');

    fireEvent.click(option);
    expect(await screen.findByText('Arroz costeño')).toBeInTheDocument();
    expect(screen.getByText('S/ 5.50')).toBeInTheDocument();
    // qty stepper shows 1
    expect(
      screen.getByRole('status', { name: 'Cantidad de Arroz costeño' })
    ).toHaveTextContent('1');
  });

  it('re-tapping the same product increments its qty instead of duplicating', async () => {
    render(<Harness />);

    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'lech' } });
    fireEvent.click(await screen.findByRole('option', { name: /Leche Gloria/i }));

    fireEvent.change(search, { target: { value: 'lech' } });
    fireEvent.click(await screen.findByRole('option', { name: /Leche Gloria/i }));

    expect(
      screen.getByRole('status', { name: 'Cantidad de Leche Gloria' })
    ).toHaveTextContent('2');
    expect(screen.getByText('S/ 9.00')).toBeInTheDocument();
    // Only one line row for the product
    expect(screen.getAllByText('Leche Gloria')).toHaveLength(1);
  });

  it('steppers increment/decrement, minus stops at 1, X removes the row', async () => {
    render(
      <Harness
        initialItems={[{ productId: 'prod-1', name: 'Arroz costeño', qty: 1, unitPrice: 5.5 }]}
      />
    );

    const qty = screen.getByRole('status', { name: 'Cantidad de Arroz costeño' });
    expect(qty).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad de arroz costeño/i }));
    expect(qty).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: /disminuir cantidad de arroz costeño/i }));
    expect(qty).toHaveTextContent('1');

    // Minus at 1 does NOT remove the row
    fireEvent.click(screen.getByRole('button', { name: /disminuir cantidad de arroz costeño/i }));
    expect(qty).toHaveTextContent('1');
    expect(screen.getByText('Arroz costeño')).toBeInTheDocument();

    // X removes it
    fireEvent.click(screen.getByRole('button', { name: /quitar arroz costeño/i }));
    expect(screen.queryByText('Arroz costeño')).not.toBeInTheDocument();
  });

  it('crear-flow persists the new product and adds it as a line row', async () => {
    render(<Harness />);

    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'quinu' } });

    const createOption = await screen.findByRole('option', { name: /crear.*quinu/i });
    fireEvent.click(createOption);

    const priceInput = await screen.findByLabelText(/precio del nuevo producto/i);
    fireEvent.change(priceInput, { target: { value: '4.50' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('quinu')).toBeInTheDocument();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const stored = await db.products.where('store_id').equals(STORE_ID).toArray();
    expect(stored.some((p) => p.name === 'quinu' && p.price === 4.5)).toBe(true);

    const queued = await db.syncQueue.where('entity').equals('products').first();
    expect(queued).toBeDefined();
    expect(queued?.operation).toBe('INSERT');
  });

  it('routes create errors through onError without adding a row', async () => {
    const onError = vi.fn();
    render(<Harness onError={onError} />);

    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'quinu' } });

    fireEvent.click(await screen.findByRole('option', { name: /crear.*quinu/i }));

    // Invalid price surfaces via onError and adds nothing
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect(screen.queryByText('quinu')).not.toBeInTheDocument();
  });

  it('collapsible note reveals a textarea bound to note/onNoteChange', async () => {
    render(<Harness initialNote="para mañana" />);

    expect(screen.queryByLabelText(/nota del fiado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar nota/i }));
    const noteArea = await screen.findByLabelText(/nota del fiado/i);
    expect(noteArea).toHaveValue('para mañana');

    fireEvent.change(noteArea, { target: { value: 'paga el viernes' } });
    expect(noteArea).toHaveValue('paga el viernes');
  });

  it('search input renders a magnifier icon mirroring the S/ prefix pattern', () => {
    render(<Harness />);

    const search = screen.getByLabelText(/buscar producto/i);
    const icon = search.parentElement?.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-slate-600');
    expect(icon).toHaveClass('w-5', 'h-5');
    expect(icon).toHaveClass('pointer-events-none');
    expect(search).toHaveClass('pl-9');
  });

  it('closes the matches popover on Escape', async () => {
    render(<Harness />);

    const search = screen.getByLabelText(/buscar producto/i);
    fireEvent.change(search, { target: { value: 'arr' } });
    await screen.findByRole('option', { name: /Arroz costeño/i });

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
