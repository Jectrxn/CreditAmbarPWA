import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Users, History, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface TabBarProps {
  className?: string;
}

interface NavTabItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: 'supervisor';
}

const NAV_TABS: NavTabItem[] = [
  {
    path: '/pos',
    label: 'Caja',
    icon: CreditCard,
  },
  {
    path: '/customers',
    label: 'Clientes',
    icon: Users,
  },
  {
    path: '/history',
    label: 'Historial',
    icon: History,
  },
  {
    path: '/supervisor',
    label: 'Supervisor',
    icon: ShieldCheck,
    requiredRole: 'supervisor',
  },
];

export const TabBar: React.FC<TabBarProps> = ({ className = '' }) => {
  const hasRole = useAuthStore((state) => state.hasRole);
  const canAccessSupervisor = hasRole('supervisor');

  const visibleTabs = NAV_TABS.filter((tab) => {
    if (tab.requiredRole === 'supervisor') {
      return canAccessSupervisor;
    }
    return true;
  });

  return (
    <nav
      aria-label="Navegación principal"
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-[17px] backdrop-saturate-[180%] border-t border-t-white/80 border-x-white/25 border-b-white/15 shadow-[0_-4px_16px_-4px_rgba(15,23,42,0.1),inset_0_1px_1px_rgba(255,255,255,0.9)] pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-200 ${className}`}
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[4rem] rounded-2xl transition-all duration-200 text-xs font-semibold ${
                  isActive
                    ? 'text-amber-700 bg-amber-500/15 border border-amber-400/40 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-amber-600 scale-105' : 'text-slate-500'}`} />
                  <span className="leading-none">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
