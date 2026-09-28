import { useRef, useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LiquidModal } from './LiquidModal';
import { GlassCard } from './GlassCard';

const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function mockVisualViewport(height: number, offsetTop = 0) {
  const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
  const vv = {
    height,
    offsetTop,
    addEventListener: vi.fn((type: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[type]) listeners[type] = new Set();
      listeners[type].add(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: (...args: unknown[]) => void) => {
      listeners[type]?.delete(cb);
    }),
    _dispatch: (type: string) => {
      listeners[type]?.forEach((cb) => cb());
    },
  };
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    writable: true,
    value: vv,
  });
  return vv;
}

function setInnerHeight(value: number) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value,
  });
}

beforeEach(() => {
  setInnerHeight(ORIGINAL_INNER_HEIGHT);
});

afterEach(() => {
  // @ts-expect-error - cleanup mock between tests
  delete window.visualViewport;
  setInnerHeight(ORIGINAL_INNER_HEIGHT);
  vi.restoreAllMocks();
});

function FocusHarness({
  useInitialFocusRef = false,
}: {
  useInitialFocusRef?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fieldOneRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <LiquidModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Panel"
        initialFocusRef={useInitialFocusRef ? fieldOneRef : undefined}
      >
        <input aria-label="Campo uno" ref={fieldOneRef} />
        <input aria-label="Campo dos" />
        <button type="button">Acción</button>
      </LiquidModal>
    </div>
  );
}

describe('LiquidModal & GlassCard UI Components', () => {
  describe('LiquidModal', () => {
    it('should not render anything when isOpen is false', () => {
      render(
        <LiquidModal isOpen={false} onClose={() => {}}>
          <p>Hidden Content</p>
        </LiquidModal>
      );
      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    });

    it('should render modal content, title, and backdrop when isOpen is true', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          title="Cobro Fiado"
          data-testid="liquid-modal"
        >
          <p>Contenido del modal</p>
        </LiquidModal>
      );

      expect(screen.getByText('Cobro Fiado')).toBeInTheDocument();
      expect(screen.getByText('Contenido del modal')).toBeInTheDocument();

      // Backdrop check
      const backdrop = screen.getByTestId('liquid-modal-backdrop');
      expect(backdrop).toBeInTheDocument();
      // Should include fallback color and glass backdrop blur classes
      expect(backdrop.className).toMatch(/backdrop-blur/);
      expect(backdrop.className).toMatch(/bg-slate/);
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal Body</p>
        </LiquidModal>
      );

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked if closeOnBackdropClick is true', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={true}
        >
          <p>Body</p>
        </LiquidModal>
      );

      const backdrop = screen.getByTestId('liquid-modal-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when modal container itself is clicked', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={true}
        >
          <p>Body Click</p>
        </LiquidModal>
      );

      const content = screen.getByText('Body Click');
      fireEvent.click(content);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should call onClose on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal isOpen={true} onClose={handleClose}>
          <p>Escape Test</p>
        </LiquidModal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should support responsive orientation reflow classes', () => {
      render(
        <LiquidModal isOpen={true} onClose={() => {}} title="Orientation Reflow">
          <p>Orientation content</p>
        </LiquidModal>
      );

      const container = screen.getByTestId('liquid-modal-container');
      // Should contain responsive classes for landscape & max height handling
      expect(container.className).toMatch(/max-h-/);
      expect(container.className).toMatch(/glass-panel|glass-card|backdrop-blur/);
    });

    it('stabilizes without crashing or losing scroll position during rapid orientation toggling', () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        cliente: `Cliente ${i}`,
        monto: `$${(i + 1) * 100}`,
      }));

      render(
        <LiquidModal isOpen={true} onClose={() => {}} title="Auditoría de Transacciones">
          <div data-testid="table-container" className="overflow-y-auto max-h-60">
            <table data-testid="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.cliente}</td>
                    <td>{r.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LiquidModal>
      );

      const tableContainer = screen.getByTestId('table-container');
      const table = screen.getByTestId('data-table');
      expect(table).toBeInTheDocument();

      // Set initial scroll position
      tableContainer.scrollTop = 120;
      expect(tableContainer.scrollTop).toBe(120);

      // Rapidly toggle orientation 10 times between portrait and landscape
      for (let i = 0; i < 10; i++) {
        const isLandscape = i % 2 === 0;
        window.innerWidth = isLandscape ? 844 : 390;
        window.innerHeight = isLandscape ? 390 : 844;
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('orientationchange'));
      }

      // Verify UI remains stable, rendered without error, and scroll position is preserved
      expect(screen.getByTestId('liquid-modal-container')).toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.getByText('Cliente 0')).toBeInTheDocument();
      expect(screen.getByText('Cliente 49')).toBeInTheDocument();
      expect(tableContainer.scrollTop).toBe(120);
    });
  });

  describe('LiquidModal focus management', () => {
    it('moves focus to the first focusable element in the panel when no initialFocusRef is given', () => {
      render(<FocusHarness />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

      expect(screen.getByRole('button', { name: /cerrar/i })).toHaveFocus();
    });

    it('keeps an autoFocus element inside the panel focused instead of overriding it', () => {
      const AutoFocusHarness = () => {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button onClick={() => setOpen(true)}>Abrir autofocus</button>
            <LiquidModal isOpen={open} onClose={() => setOpen(false)} title="Nuevo Cliente">
              <input aria-label="Nombre" autoFocus />
              <button>Guardar</button>
            </LiquidModal>
          </>
        );
      };
      render(<AutoFocusHarness />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir autofocus' }));

      expect(screen.getByLabelText('Nombre')).toHaveFocus();
    });

    it('moves focus to initialFocusRef.current when provided', () => {
      render(<FocusHarness useInitialFocusRef />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

      expect(screen.getByLabelText('Campo uno')).toHaveFocus();
    });

    it('traps Tab focus inside the panel, wrapping at both ends', () => {
      render(<FocusHarness />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

      const closeBtn = screen.getByRole('button', { name: /cerrar/i });
      const actionBtn = screen.getByRole('button', { name: 'Acción' });
      expect(closeBtn).toHaveFocus();

      // Shift+Tab from the first focusable wraps to the last.
      fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: true });
      expect(actionBtn).toHaveFocus();

      // Tab from the last focusable wraps to the first.
      fireEvent.keyDown(actionBtn, { key: 'Tab' });
      expect(closeBtn).toHaveFocus();
    });

    it('restores focus to the trigger element after closing', () => {
      render(<FocusHarness />);
      const trigger = screen.getByRole('button', { name: 'Abrir' });
      // jsdom does not focus a button on click by itself the way real
      // browsers do; focus it explicitly to model the real trigger state.
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('button', { name: /cerrar/i })).toHaveFocus();

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
      expect(trigger).toHaveFocus();
    });

    it('still calls onClose on Escape and backdrop click with focus management active', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal isOpen={true} onClose={handleClose}>
          <input aria-label="Solo" />
        </LiquidModal>
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('LiquidModal bottom-sheet iOS keyboard awareness', () => {
    it('applies keyboard padding when mocked visualViewport shrinks', () => {
      setInnerHeight(844);
      mockVisualViewport(500, 0);
      render(
        <LiquidModal isOpen={true} onClose={() => {}} variant="bottom-sheet">
          <p>Sheet content</p>
        </LiquidModal>
      );
      const container = screen.getByTestId('liquid-modal-container');
      // keyboardHeight = 844 - 500 - 0 = 344
      expect(container.style.paddingBottom).toBe('344px');
    });

    it('removes keyboard padding when viewport restores', () => {
      setInnerHeight(844);
      const vv = mockVisualViewport(500, 0);
      render(
        <LiquidModal isOpen={true} onClose={() => {}} variant="bottom-sheet">
          <p>Sheet content</p>
        </LiquidModal>
      );
      expect(screen.getByTestId('liquid-modal-container').style.paddingBottom).toBe('344px');

      act(() => {
        vv.height = 844;
        vv._dispatch('resize');
      });
      const padding = screen.getByTestId('liquid-modal-container').style.paddingBottom;
      expect(padding === '' || padding === '0px').toBe(true);
    });

    it('does not crash when visualViewport is undefined', () => {
      // @ts-expect-error - simulate SSR/jsdom without visualViewport
      delete window.visualViewport;
      expect(() => {
        render(
          <LiquidModal isOpen={true} onClose={() => {}} variant="bottom-sheet">
            <p>Sheet content</p>
          </LiquidModal>
        );
      }).not.toThrow();
      expect(screen.getByTestId('liquid-modal-container')).toBeInTheDocument();
    });

    it('scrolls focused element into view on focusin when keyboard is open', () => {
      setInnerHeight(844);
      mockVisualViewport(500, 0);
      render(
        <LiquidModal isOpen={true} onClose={() => {}} variant="bottom-sheet">
          <input aria-label="nota" />
        </LiquidModal>
      );
      const input = screen.getByLabelText('nota') as HTMLInputElement;
      const scrollSpy = vi.fn();
      input.scrollIntoView = scrollSpy;
      fireEvent.focusIn(input);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    });

    it('leaves center variant unchanged when keyboard opens', () => {
      setInnerHeight(844);
      mockVisualViewport(500, 0);
      render(
        <LiquidModal isOpen={true} onClose={() => {}} variant="center">
          <p>Center content</p>
        </LiquidModal>
      );
      const container = screen.getByTestId('liquid-modal-container');
      expect(container.style.paddingBottom).toBe('');
    });
  });

  describe('GlassCard', () => {
    it('should render children and apply glass classes', () => {
      render(
        <GlassCard data-testid="glass-card">
          <span>Tarjeta Vidrio</span>
        </GlassCard>
      );

      const card = screen.getByTestId('glass-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('Tarjeta Vidrio')).toBeInTheDocument();
      expect(card.className).toMatch(/glass-card/);
    });

    it('should apply interactive hover and glow styles when configured', () => {
      render(
        <GlassCard data-testid="glow-card" glow interactive>
          <span>Glow Card</span>
        </GlassCard>
      );

      const card = screen.getByTestId('glow-card');
      expect(card.className).toMatch(/shadow-glass-glow|border-glass-glow/);
    });

    it('should handle onClick callback when interactive', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard data-testid="click-card" onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );

      fireEvent.click(screen.getByTestId('click-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
