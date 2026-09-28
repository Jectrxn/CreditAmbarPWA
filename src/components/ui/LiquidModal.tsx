import React, { useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export interface LiquidModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'center' | 'bottom-sheet';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
  'data-testid'?: string;
  /** Focused on open instead of the first focusable element in the panel. */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full m-4',
};

export const LiquidModal: React.FC<LiquidModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  variant = 'center',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className,
  'data-testid': testId = 'liquid-modal',
  initialFocusRef,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The element that had focus right before this modal opened, so it can
  // be restored on close. Captured during render (not an effect) so it
  // runs before this commit's DOM mutations — e.g. content with its own
  // autoFocus — can steal focus away from the real trigger element.
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (isOpen && !wasOpenRef.current) {
    previousActiveElementRef.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  }
  wasOpenRef.current = isOpen;

  // Handle ESC key press and the Tab focus trap.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = getFocusableElements(panel);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const target = e.target as HTMLElement;
        if (e.shiftKey) {
          if (target === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (target === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  // Move focus into the panel on open, and restore it to whatever had
  // focus before opening once the modal closes/unmounts.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? (panel ? getFocusableElements(panel)[0] : undefined);
    target?.focus();

    return () => {
      const toRestore = previousActiveElementRef.current;
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  const isBottomSheet = variant === 'bottom-sheet';

  // iOS keyboard awareness (bottom-sheet only): track visible viewport height.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !isBottomSheet) return;
    if (typeof window === 'undefined') return;

    const compute = () => {
      const vv =
        (window as Window & { visualViewport?: VisualViewport }).visualViewport ??
        undefined;
      if (!vv || typeof vv.height !== 'number') {
        keyboardHeightRef.current = 0;
        setKeyboardHeight(0);
        setVisibleHeight(null);
        return;
      }
      const offsetTop = typeof vv.offsetTop === 'number' ? vv.offsetTop : 0;
      const kh = Math.max(0, window.innerHeight - vv.height - offsetTop);
      keyboardHeightRef.current = kh;
      setKeyboardHeight(kh);
      setVisibleHeight(vv.height);
    };

    compute();

    const vv = (window as Window & { visualViewport?: VisualViewport })
      .visualViewport;
    if (!vv || typeof vv.addEventListener !== 'function') return;
    vv.addEventListener('resize', compute);
    window.addEventListener('resize', compute);
    return () => {
      vv.removeEventListener?.('resize', compute);
      window.removeEventListener('resize', compute);
    };
  }, [isOpen, isBottomSheet]);

  // Auto-scroll focused field above the iOS keyboard.
  useEffect(() => {
    if (!isOpen || !isBottomSheet) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const onFocusIn = (e: FocusEvent) => {
      if (keyboardHeightRef.current <= 0) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    sheet.addEventListener('focusin', onFocusIn);
    return () => {
      sheet.removeEventListener('focusin', onFocusIn);
    };
  }, [isOpen, isBottomSheet]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  const modalContent = (
    <div
      data-testid={`${testId}-backdrop`}
      onClick={handleBackdropClick}
      className={twMerge(
        'fixed inset-0 z-50 flex transition-all duration-300 animate-in fade-in',
        isBottomSheet
          ? 'items-end justify-center bg-black/25 backdrop-blur-xl'
          : 'items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/30 backdrop-blur-md'
      )}
      role="presentation"
    >
      <div
        data-testid={`${testId}-container`}
        ref={(el) => {
          panelRef.current = el;
          if (isBottomSheet) {
            sheetRef.current = el;
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'liquid-modal-title' : undefined}
        style={
          isBottomSheet
            ? {
                ...(keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : {}),
                ...(visibleHeight != null ? { maxHeight: visibleHeight } : {}),
              }
            : undefined
        }
        className={twMerge(
          'glass-panel relative overflow-hidden w-full',
          'border border-t-white/95 border-x-white/40 border-b-white/20',
          'bg-white/[0.82] backdrop-blur-[24px] backdrop-saturate-[190%]',
          'text-slate-900 flex flex-col',
          isBottomSheet
            ? [
                'rounded-t-[2rem] rounded-b-none max-w-lg',
                'max-h-[90vh]',
                'shadow-[0_-8px_40px_-4px_rgba(15,23,42,0.18),inset_0_1.5px_2px_rgba(255,255,255,0.95)]',
                'animate-in slide-in-from-bottom-12 duration-300 ease-out',
              ].join(' ')
            : [
                'rounded-[2.5rem]',
                'max-h-[92vh] sm:max-h-[88vh]',
                'landscape:max-h-[85vh] landscape:my-auto',
                'shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_25px_50px_-12px_rgba(15,23,42,0.25)]',
              ].join(' '),
          maxWidthMap[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Specular Rim Reflection */}
        <span
          aria-hidden="true"
          className={twMerge(
            'absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/10 to-transparent',
            isBottomSheet ? 'rounded-t-[2rem]' : 'rounded-t-[2.5rem]'
          )}
        />

        {/* Drag Handle (bottom-sheet only) */}
        {isBottomSheet && (
          <div className="relative z-10 flex justify-center pt-3 pb-1 shrink-0">
            <span
              aria-hidden="true"
              className="w-9 h-1 rounded-full bg-slate-400/40"
            />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className={twMerge(
            'relative z-10 flex items-center justify-between border-b border-white/30 shrink-0',
            isBottomSheet ? 'px-5 py-3' : 'px-6 py-4'
          )}>
            {title ? (
              <div id="liquid-modal-title" className="text-lg font-bold text-slate-900 tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                {title}
              </div>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="rounded-full p-2 text-slate-500 hover:text-slate-800 hover:bg-white/50 active:bg-white/70 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className={twMerge(
          'relative z-10 flex-1 overflow-y-auto text-slate-700',
          isBottomSheet ? 'px-5 py-3' : 'px-6 py-4'
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={twMerge(
            'relative z-10 border-t border-white/30 bg-white/[0.35] backdrop-blur-[18px] shrink-0 flex items-center justify-end gap-2.5',
            isBottomSheet
              ? 'px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
              : 'px-6 py-4 rounded-b-[2.5rem]'
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
