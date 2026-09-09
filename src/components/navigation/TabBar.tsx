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
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-[20px] backdrop-saturate-[180%] border-t border-t-white/90 border-x-white/30 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.1),inset_0_1px_1px_rgba(255,255,255,0.9)] pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-200 ${className}`}
      >
        <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
          {/* 1. Inicio */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isActive
                  ? 'text-amber-800 bg-amber-500/15 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110' : 'text-slate-500'}`} />
                <span>Inicio</span>
              </>
            )}
          </NavLink>

          {/* 2. Clientes */}
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isActive
                  ? 'text-amber-800 bg-amber-500/15 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Users className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110' : 'text-slate-500'}`} />
                <span>Clientes</span>
              </>
            )}
          </NavLink>

          {/* 3. Central Prominent Plus Button */}
          <div className="relative -top-4 flex items-center justify-center">
            <button
              type="button"
              onClick={handlePlusClick}
              aria-label="Registrar nuevo fiado"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:scale-95 text-slate-950 font-bold flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5),inset_0_2px_2px_rgba(255,255,255,0.6)] border-2 border-white/80 transition-all cursor-pointer group"
            >
              <Plus className="w-6 h-6 stroke-[3] transition-transform group-hover:scale-110 group-active:scale-90" />
            </button>
          </div>

          {/* 4. Cobros / Historial */}
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isActive
                  ? 'text-amber-800 bg-amber-500/15 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Receipt className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110' : 'text-slate-500'}`} />
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
              `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 text-[11px] font-bold ${
                isActive
                  ? 'text-amber-800 bg-amber-500/15 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <BarChart3 className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-110' : 'text-slate-500'}`} />
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
