import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Search, X } from 'lucide-react';
import { searchProducts, createProduct } from '../../features/products/productService';
import type { Product } from '../../types/database';

export interface DraftItem {
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ProductPickerProps {
  storeId: string;
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  note: string;
  onNoteChange: (v: string) => void;
  disabled?: boolean;
  onError?: (msg: string) => void;
}

/**
 * Sums qty * unitPrice across draft rows. Rounded to cents so the
 * "Usar total" button copies a clean plain-number string.
 */
export function suggestedTotal(items: DraftItem[]): number {
  const raw = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  return Math.round(raw * 100) / 100;
}

/**
 * ProductPicker — controlled search + line rows + flyweight creation + note.
 *
 * Replaces the free-text detalle: every tap produces structured data
 * ({productId, name, qty, unitPrice}) the modal persists to
 * transaction_items. Errors bubble through onError so the host modal
 * owns the single error alert.
 */
export const ProductPicker = React.forwardRef<HTMLInputElement, ProductPickerProps>(
  function ProductPicker(
    { storeId, items, onChange, note, onNoteChange, disabled = false, onError },
    forwardedRef
  ) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Product[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchSeq = useRef(0);

  // Pointer-down outside closes the matches popover (mirrors GlassSelect).
  useEffect(() => {
    if (!showPopover) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowPopover(false);
        setCreating(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showPopover]);

  // Local Dexie lookup is sub-ms, so no debounce: every keystroke (min 2
  // chars) queries directly. A sequence guard drops stale async results.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCreating(false);
    setNewPriceInput('');
    const word = value.trim();
    if (word.length < 2) {
      setMatches([]);
      setShowPopover(false);
      return;
    }
    const seq = ++searchSeq.current;
    searchProducts(storeId, word)
      .then((found) => {
        if (searchSeq.current !== seq) return;
        setMatches(found);
        setShowPopover(true);
      })
      .catch(() => {
        if (searchSeq.current !== seq) return;
        setMatches([]);
        setShowPopover(false);
      });
  };

  // Tap a match: new row, or qty+1 when the product is already listed.
  const addMatch = (product: Product) => {
    const existing = items.findIndex((i) => i.productId === product.id);
    if (existing >= 0) {
      onChange(
        items.map((item, idx) =>
          idx === existing ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      onChange([
        ...items,
        { productId: product.id, name: product.name, qty: 1, unitPrice: product.price },
      ]);
    }
    setQuery('');
    setMatches([]);
    setShowPopover(false);
    setCreating(false);
    setNewPriceInput('');
    searchRef.current?.focus();
  };

  const handleCreate = async () => {
    const name = query.trim();
    const price = parseFloat(newPriceInput);
    if (!name) {
      onError?.('Ingrese el nombre del producto.');
      return;
    }
    if (isNaN(price) || price < 0) {
      onError?.('Ingrese un precio válido mayor o igual a cero.');
      return;
    }
    try {
      const product = await createProduct({ storeId, name, price });
      addMatch(product);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Error al crear el producto.');
    }
  };

  const updateQty = (index: number, qty: number) => {
    onChange(
      items.map((item, idx) => (idx === index ? { ...item, qty: Math.max(1, qty) } : item))
    );
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  const closePopover = () => {
    setShowPopover(false);
    setCreating(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Search ── */}
      <div className="relative">
        <Search
          aria-hidden="true"
          strokeWidth={2.5}
          className="absolute inset-y-0 left-0 ml-3.5 my-auto w-5 h-5 text-slate-600 pointer-events-none"
        />
        <input
          ref={(el) => {
            searchRef.current = el;
            if (typeof forwardedRef === 'function') {
              forwardedRef(el);
            } else if (forwardedRef) {
              (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }
          }}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && showPopover) {
              e.stopPropagation();
              closePopover();
            }
          }}
          aria-label="Buscar producto"
          aria-expanded={showPopover}
          aria-autocomplete="list"
          aria-controls="product-picker-matches"
          placeholder="Buscar producto..."
          disabled={disabled}
          className="w-full pl-9 pr-4 py-3 text-sm font-semibold text-slate-900 bg-white/[0.50] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all disabled:opacity-50"
        />
      </div>

      {/* ── Matches popover (GlassSelect Liquid Glass tokens) ── */}
      {showPopover && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl overflow-hidden bg-white/[0.88] backdrop-blur-[24px] border border-t-2 border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_12px_32px_rgba(15,23,42,0.18)] animate-in fade-in-50 slide-in-from-top-2 duration-150 ease-out">
          {/* Top-half specular sheen (non-interactive) */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 z-10 bg-gradient-to-b from-white/50 via-white/10 to-transparent pointer-events-none rounded-t-2xl"
          />
          {!creating ? (
            <ul
              role="listbox"
              id="product-picker-matches"
              aria-label="Resultados de productos"
              className="relative max-h-48 overflow-y-auto p-1.5 space-y-0.5"
            >
              {matches.map((p) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected="false"
                  onClick={() => addMatch(p)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors text-slate-700 hover:bg-white/[0.60] hover:text-slate-950"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs font-bold text-amber-700">
                    S/ {p.price.toFixed(2)}
                  </span>
                </li>
              ))}
              {matches.length === 0 && (
                <li
                  role="option"
                  aria-selected="false"
                  onClick={() => setCreating(true)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors text-slate-700 hover:bg-white/[0.60] hover:text-slate-950"
                >
                  <span className="truncate">Crear &quot;{query.trim()}&quot;</span>
                </li>
              )}
            </ul>
          ) : (
            <div className="relative p-2 space-y-1.5">
              <p className="px-1 text-xs font-bold text-slate-700">
                Crear &quot;{query.trim()}&quot;
              </p>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                    S/
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    inputMode="decimal"
                    autoFocus
                    aria-label="Precio del nuevo producto"
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        closePopover();
                      }
                    }}
                    placeholder="0.00"
                    className="w-full pl-8 pr-2 py-2 text-sm font-bold text-slate-900 bg-white/[0.50] backdrop-blur-md border border-white/80 rounded-xl focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-3 py-2 text-xs font-black text-slate-950 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 rounded-xl border border-t-white/80 border-b-amber-600/40 shadow-[0_4px_14px_rgba(245,158,11,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.95)] active:scale-95 transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="mt-2 px-3 py-2.5 rounded-2xl bg-white/[0.28] border border-white/55 text-xs text-slate-500">
          Todavía no hay productos. Busca uno para calcular el total automáticamente.
        </div>
      )}

      {/* ── Line rows ── */}
      {items.length > 0 && (
        <ul aria-label="Productos del fiado" className="mt-2 space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={item.productId ?? `${item.name}-${idx}`}
              className="flex items-center gap-2 p-2 bg-white/[0.50] backdrop-blur-[16px] rounded-2xl border border-white/70 border-t-white/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
            >
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Disminuir cantidad de ${item.name}`}
                  onClick={() => updateQty(idx, item.qty - 1)}
                  disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-400/30 text-amber-800 transition cursor-pointer disabled:opacity-50"
                >
                  <Minus aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
                <span
                  role="status"
                  aria-label={`Cantidad de ${item.name}`}
                  className="w-6 text-center text-sm font-black text-slate-900"
                >
                  {item.qty}
                </span>
                <button
                  type="button"
                  aria-label={`Aumentar cantidad de ${item.name}`}
                  onClick={() => updateQty(idx, item.qty + 1)}
                  disabled={disabled}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-400/30 text-amber-800 transition cursor-pointer disabled:opacity-50"
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-900">
                {item.name}
              </span>
              <span className="shrink-0 text-xs font-bold text-amber-700">
                S/ {(item.qty * item.unitPrice).toFixed(2)}
              </span>
              <button
                type="button"
                aria-label={`Quitar ${item.name}`}
                onClick={() => removeRow(idx)}
                disabled={disabled}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Collapsible free note ── */}
      <div className="mt-2">
        {!noteOpen ? (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            disabled={disabled}
            className="text-[11px] font-bold text-amber-800/80 hover:text-amber-900 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-400/30 transition cursor-pointer disabled:opacity-50"
          >
            Agregar nota
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out">
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              aria-label="Nota del fiado"
              rows={2}
              placeholder="Nota adicional (opcional)..."
              disabled={disabled}
              className="w-full p-3 text-sm bg-white/[0.60] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.80] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all resize-none disabled:opacity-50"
            />
          </div>
        )}
      </div>
    </div>
  );
  }
);
