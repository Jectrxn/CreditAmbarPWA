import React, { useEffect, ReactNode, useCallback } from 'react';
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
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
  'data-testid'?: string;
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
  showCloseButton = true,
  closeOnBackdropClick = true,
  className,
  'data-testid': testId = 'liquid-modal',
}) => {
  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/30 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      role="presentation"
    >
      <div
        data-testid={`${testId}-container`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'liquid-modal-title' : undefined}
        className={twMerge(
          'glass-panel relative overflow-hidden w-full rounded-[2.5rem]',
          'border border-t-white/85 border-x-white/30 border-b-white/18',
          'bg-white/[0.08] backdrop-blur-[17px] backdrop-saturate-[180%]',
          'shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_25px_50px_-12px_rgba(15,23,42,0.30)]',
          'text-slate-900 flex flex-col max-h-[92vh] sm:max-h-[88vh]',
          'landscape:max-h-[85vh] landscape:my-auto',
          maxWidthMap[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="relative z-10 flex items-center justify-between border-b border-white/20 px-6 py-4 shrink-0">
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
                className="rounded-full p-2 text-slate-400 hover:text-slate-800 hover:bg-white/40 active:bg-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body with landscape/portrait adaptation */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 text-slate-700">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="relative z-10 border-t border-white/20 px-6 py-4 bg-white/[0.05] backdrop-blur-[17px] rounded-b-[2.5rem] shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
