import React, { useState, useEffect } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Home, Users, Plus, Receipt, BarChart3, CheckCircle2, UserPlus, FilePlus2 } from 'lucide-react';
import { db } from '../../lib/dexie';
import { QuickCreditModal } from '../modals/QuickCreditModal';
import { QuickPaymentModal } from '../modals/QuickPaymentModal';
import { NewCustomerModal } from '../modals/NewCustomerModal';

import { useUIStore } from '../../store/uiStore';
import { useActiveStoreId } from '../../store/authStore';

export interface TabBarProps {
  className?: string;
  onNewCreditClick?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ className = '', onNewCreditClick }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isQuickCreditOpen, setIsQuickCreditOpen] = useState<boolean>(false);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState<boolean>(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const isTabBarHidden = useUIStore((s) => s.isTabBarHidden);
  const activeStoreId = useActiveStoreId();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('menu') === 'open') {
      setIsMenuOpen(true);
    }
    if (searchParams.get('modal') === 'credit') {
      setIsQuickCreditOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    // Count active-store customers with pending debts for the badge
    const updateCount = async () => {
      try {
        const customers = await db.customers.where('store_id').equals(activeStoreId).toArray();
        const count = customers.filter((c) => c.balance > 0).length;
        setPendingCount(count);
      } catch (err) {
        console.error('Error counting pending debts:', err);
      }
    };
    updateCount();
  }, [activeStoreId]);

  useEffect(() => {
    // Detect mobile virtual keyboard via visualViewport resize
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const diff = window.innerHeight - window.visualViewport.height;
        if (diff > 120) {
          setIsKeyboardOpen(true);
        } else if (diff <= 50) {
          const active = document.activeElement;
          const isStillInput =
            active &&
            (active.tagName === 'INPUT' ||
              active.tagName === 'TEXTAREA' ||
              active.getAttribute('contenteditable') === 'true');
          if (!isStillInput) {
            setIsKeyboardOpen(false);
          }
        }
      }
    };

    // Detect focus events across all inputs using capturing phase for 100% mobile compatibility
    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        const isStillInput =
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.getAttribute('contenteditable') === 'true');
        if (!isStillInput) {
          setIsKeyboardOpen(false);
        }
      }, 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const handlePlusClick = () => {
    if (onNewCreditClick) {
      onNewCreditClick();
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  const shouldHide = isTabBarHidden || isKeyboardOpen;

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className={`fixed bottom-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-28px)] max-w-[356px] sm:max-w-[420px] ${
          isMenuOpen ? 'z-50' : 'z-40'
        } rounded-full bg-white/[0.20] hover:bg-white/[0.28] backdrop-blur-[18px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[0_20px_45px_-8px_rgba(15,23,42,0.16),0_4px_16px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] px-4 py-2 transition-all duration-300 ${
          shouldHide
            ? 'translate-y-48 opacity-0 invisible pointer-events-none'
            : 'translate-y-0 opacity-100 visible'
        } ${className}`}
      >
        {/* Top specular reflection rim */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full bg-gradient-to-b from-white/50 via-white/10 to-transparent"
        />

        <div className="relative z-10 grid grid-cols-5 items-center justify-items-center w-full">
          {/* 1. Inicio */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isMenuOpen ? 'opacity-35 pointer-events-none' : ''
              } ${
                isActive
                  ? 'text-amber-800'
                  : 'text-slate-900 hover:text-amber-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-105 stroke-[2.4]' : 'text-slate-900 stroke-[2]'}`} />
                <span>Inicio</span>
              </>
            )}
          </NavLink>

          {/* 2. Clientes */}
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isMenuOpen ? 'opacity-35 pointer-events-none' : ''
              } ${
                isActive
                  ? 'text-amber-800'
                  : 'text-slate-900 hover:text-amber-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Users className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-105 stroke-[2.4]' : 'text-slate-900 stroke-[2]'}`} />
                <span>Clientes</span>
              </>
            )}
          </NavLink>

          {/* 3. Central Luminous Orb Button */}
          <div className="relative -top-4 sm:-top-5 flex items-center justify-center shrink-0">
            {/* Outer Translucent Liquid Glass Halo Collar */}
            <div className="p-1.5 rounded-full bg-white/[0.40] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/80 shadow-[0_6px_16px_rgba(180,83,9,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.95)]">
              <button
                type="button"
                onClick={handlePlusClick}
                aria-label={isMenuOpen ? "Cerrar menú de acciones" : "Registrar nuevo fiado o acción rápida"}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                className="relative overflow-hidden w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fde68a_0%,#f59e0b_45%,#d97706_75%,#b45309_100%)] hover:brightness-105 active:scale-90 text-amber-950 flex items-center justify-center shadow-[0_8px_20px_rgba(180,83,9,0.40),inset_0_2px_3px_rgba(255,255,255,0.95),inset_0_-2.5px_5px_rgba(146,64,14,0.50)] transition-all duration-200 cursor-pointer group"
              >
                {/* 3D Specular Radial Sphere Highlight (Zero Linear Cuts) */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none rounded-full bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.25)_35%,transparent_60%)]"
                />
                <Plus
                  className={`relative z-10 w-6 h-6 stroke-[3.2] text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] transition-transform duration-300 ${
                    isMenuOpen ? 'rotate-45 text-rose-950' : 'group-hover:scale-110'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4. Cobros / Historial */}
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isMenuOpen ? 'opacity-35 pointer-events-none' : ''
              } ${
                isActive
                  ? 'text-amber-800'
                  : 'text-slate-900 hover:text-amber-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Receipt className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-105 stroke-[2.4]' : 'text-slate-900 stroke-[2]'}`} />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 w-4 h-4 text-[10px] font-bold bg-slate-600/85 text-white rounded-full border border-white shadow-xs flex items-center justify-center animate-in zoom-in-50">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                <span>Cobros</span>
              </>
            )}
          </NavLink>

          {/* 5. Reportes */}
          <NavLink
            to="/supervisor"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isMenuOpen ? 'opacity-35 pointer-events-none' : ''
              } ${
                isActive
                  ? 'text-amber-800'
                  : 'text-slate-900 hover:text-amber-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <BarChart3 className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-105 stroke-[2.4]' : 'text-slate-900 stroke-[2]'}`} />
                <span>Reportes</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Backdrop for Quick Actions Menu with Deep Cinematic Glass Blur */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[12px] backdrop-saturate-[160%] animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Speed Dial Action Hub — Free Floating Liquid Orb Trio (Zero Enclosing Box, Elevated Arc) */}
      {isMenuOpen && (
        <div
          role="menu"
          aria-label="Acciones rápidas"
          className="fixed bottom-[calc(122px+env(safe-area-inset-bottom,0px))] sm:bottom-[132px] left-1/2 -translate-x-1/2 w-full max-w-[310px] z-50 px-2 grid grid-cols-3 items-end justify-items-center pointer-events-none"
        >
          {/* 1. Nuevo Fiado (Liquid Amber Orb with FilePlus2) */}
          <button
            type="button"
            role="menuitem"
            aria-label="Registrar nuevo fiado"
            onClick={() => {
              setIsMenuOpen(false);
              setIsQuickCreditOpen(true);
            }}
            className="pointer-events-auto flex flex-col items-center group cursor-pointer animate-in zoom-in-50 slide-in-from-bottom-8 duration-300 ease-out fill-mode-both"
          >
            {/* Liquid Glass Halo Collar with Ámbar Caustic Ambient Glow */}
            <div className="p-2 rounded-full bg-white/[0.30] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/90 shadow-[0_8px_24px_rgba(245,158,11,0.28)] group-hover:bg-white/[0.45] group-hover:scale-105 transition-all duration-200">
              <div className="relative overflow-hidden w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fde68a_0%,#f59e0b_55%,#d97706_100%)] flex items-center justify-center shadow-[0_8px_22px_rgba(245,158,11,0.40),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(180,83,9,0.35)] border border-white/80 active:scale-90 transition-transform duration-200">
                {/* 3D Specular Radial Sphere Highlight */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none rounded-full bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.25)_35%,transparent_60%)]"
                />
                <FilePlus2 className="relative z-10 w-6 h-6 stroke-[2.6] text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]" />
              </div>
            </div>
            {/* Translucent Liquid Glass Micro-Capsule */}
            <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.35] backdrop-blur-[16px] border border-white/80 text-slate-900 font-extrabold text-[10.5px] shadow-sm tracking-tight whitespace-nowrap select-none group-hover:scale-105 transition-all duration-200">
              Nuevo Fiado
            </span>
          </button>

          {/* 2. Registrar Abono (Liquid Emerald Orb — Crowned Arc) */}
          <button
            type="button"
            role="menuitem"
            aria-label="Registrar abono"
            onClick={() => {
              setIsMenuOpen(false);
              setIsQuickPaymentOpen(true);
            }}
            className="pointer-events-auto flex flex-col items-center group cursor-pointer -translate-y-3 animate-in zoom-in-50 slide-in-from-bottom-10 duration-300 delay-75 ease-out fill-mode-both"
          >
            {/* Liquid Glass Halo Collar with Esmeralda Caustic Ambient Glow */}
            <div className="p-2 rounded-full bg-white/[0.30] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/90 shadow-[0_8px_24px_rgba(16,185,129,0.28)] group-hover:bg-white/[0.45] group-hover:scale-105 transition-all duration-200">
              <div className="relative overflow-hidden w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[radial-gradient(circle_at_35%_30%,#a7f3d0_0%,#10b981_55%,#047857_100%)] flex items-center justify-center shadow-[0_8px_22px_rgba(16,185,129,0.40),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(4,120,87,0.35)] border border-white/80 active:scale-90 transition-transform duration-200">
                {/* 3D Specular Radial Sphere Highlight */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none rounded-full bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.25)_35%,transparent_60%)]"
                />
                <CheckCircle2 className="relative z-10 w-6 h-6 stroke-[2.8] text-emerald-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]" />
              </div>
            </div>
            {/* Translucent Liquid Glass Micro-Capsule */}
            <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.35] backdrop-blur-[16px] border border-white/80 text-slate-900 font-extrabold text-[10.5px] shadow-sm tracking-tight whitespace-nowrap select-none group-hover:scale-105 transition-all duration-200">
              Abonar
            </span>
          </button>

          {/* 3. Nuevo Cliente (Liquid Sky Orb) */}
          <button
            type="button"
            role="menuitem"
            aria-label="Registrar nuevo cliente"
            onClick={() => {
              setIsMenuOpen(false);
              setIsNewCustomerOpen(true);
            }}
            className="pointer-events-auto flex flex-col items-center group cursor-pointer animate-in zoom-in-50 slide-in-from-bottom-8 duration-300 delay-150 ease-out fill-mode-both"
          >
            {/* Liquid Glass Halo Collar with Cielo Caustic Ambient Glow */}
            <div className="p-2 rounded-full bg-white/[0.30] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/90 shadow-[0_8px_24px_rgba(14,165,233,0.28)] group-hover:bg-white/[0.45] group-hover:scale-105 transition-all duration-200">
              <div className="relative overflow-hidden w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[radial-gradient(circle_at_35%_30%,#bae6fd_0%,#0ea5e9_55%,#0284c7_100%)] flex items-center justify-center shadow-[0_8px_22px_rgba(14,165,233,0.40),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(3,105,161,0.35)] border border-white/80 active:scale-90 transition-transform duration-200">
                {/* 3D Specular Radial Sphere Highlight */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none rounded-full bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.25)_35%,transparent_60%)]"
                />
                <UserPlus className="relative z-10 w-6 h-6 stroke-[2.8] text-sky-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]" />
              </div>
            </div>
            {/* Translucent Liquid Glass Micro-Capsule */}
            <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.35] backdrop-blur-[16px] border border-white/80 text-slate-900 font-extrabold text-[10.5px] shadow-sm tracking-tight whitespace-nowrap select-none group-hover:scale-105 transition-all duration-200">
              Cliente
            </span>
          </button>
        </div>
      )}

      {/* Modals for Quick Actions */}
      <QuickCreditModal
        isOpen={isQuickCreditOpen}
        onClose={() => setIsQuickCreditOpen(false)}
      />
      <QuickPaymentModal
        isOpen={isQuickPaymentOpen}
        onClose={() => setIsQuickPaymentOpen(false)}
      />
      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
      />
    </>
  );
};
