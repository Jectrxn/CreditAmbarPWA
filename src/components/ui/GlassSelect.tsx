import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface GlassSelectOption {
  value: string;
  label: string;
}

export interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  /** Shown in the closed button, in a muted tone, when `value` matches no option. */
  placeholder?: string;
}

/**
 * GlassSelect — custom Liquid Glass dropdown replacing the native `<select>`.
 *
 * A native select renders an OS-owned popup (green highlight) that violates
 * the Liquid Glass design system, so this component renders its own popover:
 * - Closed `<button>` keeps the exact padding/typography/border/shadow of the
 *   native select it replaces.
 * - Open popover uses the modal-range Liquid Glass surface (bg-white/[0.82] +
 *   backdrop-blur-[24px]) with a top specular rim, specular gradient overlay,
 *   amber-gradient selected option and hover-tinted unselected options.
 * - Focus stays on the button; ArrowUp/ArrowDown move a roving active
 *   highlight (exposed via aria-activedescendant), Enter selects, Escape
 *   closes, Tab closes, pointer-down outside closes.
 */
export const GlassSelect: React.FC<GlassSelectProps> = ({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const openMenu = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const closeMenu = () => setOpen(false);

  const choose = (optionValue: string) => {
    onChange(optionValue);
    closeMenu();
    buttonRef.current?.focus();
  };

  // Pointer-down outside closes the popover.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Keep the active option scrolled into view while open.
  // Guarded: scrollIntoView is unavailable in non-browser runtimes (jsdom).
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = containerRef.current?.querySelector('[data-active="true"]');
    if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (options.length > 0) {
          setActiveIndex((prev) => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (options.length > 0) {
          setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          choose(options[activeIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined
        }
        // Keep the purpose ("Cliente") and the current value ("Carlos Mendoza")
        // in the accessible name so SR users hear both.
        aria-label={selected?.label ? `${ariaLabel}: ${selected.label}` : ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={handleButtonKeyDown}
        className="w-full p-3 text-sm font-semibold text-slate-900 bg-white/[0.50] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all cursor-pointer flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'truncate' : 'truncate text-slate-400'}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl overflow-hidden bg-white/[0.82] backdrop-blur-[24px] border border-t-2 border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_12px_32px_rgba(15,23,42,0.18)]">
          {/* Top-half specular sheen (non-interactive) */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 z-10 bg-gradient-to-b from-white/50 via-white/10 to-transparent pointer-events-none rounded-t-2xl"
          />
          <ul
            role="listbox"
            id={listboxId}
            aria-label={ariaLabel}
            className="relative max-h-48 overflow-y-auto p-1.5 space-y-0.5"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${baseId}-option-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => choose(opt.value)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_4px_14px_rgba(245,158,11,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.95)]'
                      : `text-slate-700 hover:bg-white/[0.60] hover:text-slate-950 ${
                          isActive ? 'bg-white/[0.60] text-slate-950' : ''
                        }`
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check aria-hidden="true" className="w-4 h-4 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
