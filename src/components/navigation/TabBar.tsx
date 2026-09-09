import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Plus, Receipt, BarChart3 } from 'lucide-react';
import { db } from '../../lib/dexie';
import { QuickCreditModal } from '../modals/QuickCreditModal';

export interface TabBarProps {
  className?: string;
  onNewCreditClick?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ className = '', onNewCreditClick }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isQuickCreditOpen, setIsQuickCreditOpen] = useState<boolean>(false);

  useEffect(() => {
    // Count customers with pending debts for the badge
    const updateCount = async () => {
      try {
        const customers = await db.customers.toArray();
        const count = customers.filter((c) => c.balance > 0).length;
        setPendingCount(count);
      } catch (err) {
        console.error('Error counting pending debts:', err);
      }
    };
    updateCount();
  }, []);

  const handlePlusClick = () => {
    if (onNewCreditClick) {
      onNewCreditClick();
    } else {
      setIsQuickCreditOpen(true);
    }
  };

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full max-w-sm sm:max-w-md z-40 rounded-full bg-white/[0.72] backdrop-blur-[24px] backdrop-saturate-[190%] border border-t-white border-x-white/50 border-b-white/20 shadow-[0_20px_45px_-8px_rgba(15,23,42,0.18),0_4px_12px_rgba(0,0,0,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95)] px-3 py-1.5 transition-all duration-200 ${className}`}
      >
        {/* Top specular highlight */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full bg-gradient-to-b from-white/60 via-white/10 to-transparent"
        />

        <div className="relative z-10 flex items-center justify-between w-full px-1">
          {/* 1. Inicio */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-full transition-all duration-200 text-[10px] font-black ${
                isActive
                  ? 'text-amber-800 bg-white/[0.45] backdrop-blur-md border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.15]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110 drop-shadow-2xs' : 'text-slate-600'}`} />
                <span>Inicio</span>
              </>
            )}
          </NavLink>

          {/* 2. Clientes */}
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-full transition-all duration-200 text-[10px] font-black ${
                isActive
                  ? 'text-amber-800 bg-white/[0.45] backdrop-blur-md border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.15]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Users className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110 drop-shadow-2xs' : 'text-slate-600'}`} />
                <span>Clientes</span>
              </>
            )}
          </NavLink>

          {/* 3. Central Prominent Elevated Plus Button */}
          <div className="relative -top-6 sm:-top-7 flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={handlePlusClick}
              aria-label="Registrar nuevo fiado"
              className="relative overflow-hidden w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-90 text-slate-950 font-black flex items-center justify-center shadow-[0_12px_28px_-2px_rgba(245,158,11,0.65),0_4px_12px_rgba(245,158,11,0.45),inset_0_2px_3px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(180,83,9,0.4)] border-[3px] border-white transition-all duration-200 cursor-pointer group"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/15 to-transparent rounded-t-full"
              />
              <Plus className="relative z-10 w-7 h-7 stroke-[3.5] transition-transform group-hover:scale-110 group-active:rotate-90" />
            </button>
          </div>

          {/* 4. Cobros / Historial */}
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-full transition-all duration-200 text-[10px] font-black ${
                isActive
                  ? 'text-amber-800 bg-white/[0.45] backdrop-blur-md border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.15]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Receipt className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110 drop-shadow-2xs' : 'text-slate-600'}`} />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-black bg-rose-500 text-white rounded-full border border-white shadow-xs animate-in zoom-in-50">
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
              `flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-full transition-all duration-200 text-[10px] font-black ${
                isActive
                  ? 'text-amber-800 bg-white/[0.45] backdrop-blur-md border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.15]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <BarChart3 className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110 drop-shadow-2xs' : 'text-slate-600'}`} />
                <span>Reportes</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Quick Credit Modal for the Floating Plus Button */}
      <QuickCreditModal
        isOpen={isQuickCreditOpen}
        onClose={() => setIsQuickCreditOpen(false)}
      />
    </>
  );
};
