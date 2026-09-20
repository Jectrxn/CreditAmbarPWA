import React, { useState, useMemo } from 'react';
import { Lock, Wifi, WifiOff, RefreshCw, AlertCircle, Shield, User, Crown, ShieldCheck, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import type { SyncStatus } from '../../lib/syncManager';
import { CashierLoginModal } from '../modals/CashierLoginModal';
import { SettingsModal } from '../modals/SettingsModal';

export interface TopBarProps {
  className?: string;
}

interface SyncConfig {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
}

const syncStatusMap: Record<SyncStatus, SyncConfig> = {
  online: {
    label: 'En línea',
    icon: <Wifi className="w-3.5 h-3.5 text-emerald-600" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-950 border-emerald-500/30',
  },
  syncing: {
    label: 'Sincronizando',
    icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />,
    badgeClass: 'bg-amber-500/15 text-amber-950 border-amber-500/30',
  },
  offline: {
    label: 'Sin conexión',
    icon: <WifiOff className="w-3.5 h-3.5 text-slate-600" />,
    badgeClass: 'bg-slate-500/15 text-slate-800 border-slate-400/30',
  },
  error: {
    label: 'Error de sincronización',
    icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
    badgeClass: 'bg-rose-500/15 text-rose-950 border-rose-500/30',
  },
  idle: {
    label: 'En línea',
    icon: <Wifi className="w-3.5 h-3.5 text-emerald-600" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-950 border-emerald-500/30',
  },
};

export const TopBar: React.FC<TopBarProps> = ({ className = '' }) => {
  const { activeCashier, lockSession } = useAuthStore();
  const isTestMode = useAuthStore((s) => s.isTestMode);
  const syncStatus = useSyncStatus();
  const syncConfig = syncStatusMap[syncStatus] || syncStatusMap.online;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full px-3 py-1.5 rounded-full bg-white/[0.22] hover:bg-white/[0.28] backdrop-blur-[18px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.14),0_4px_16px_rgba(0,0,0,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center justify-between gap-2 transition-all duration-300 ${className}`}
      >
        {/* Top Specular Rim Reflection */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full bg-gradient-to-b from-white/50 via-white/10 to-transparent"
        />

        {/* Brand & Store Info */}
        <div className="relative z-10 flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-white/[0.60] backdrop-blur-md border border-t-white border-x-white/50 border-b-white/20 p-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)] flex items-center justify-center shrink-0">
            <img
              src="/logo-ambar.png"
              alt="Ámbar"
              className="h-full w-full object-contain rounded-full drop-shadow-2xs"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 drop-shadow-2xs whitespace-nowrap leading-tight">
              Ámbar
            </h1>
            <span className="text-[10px] font-bold text-slate-500 capitalize block leading-none">
              {currentDateFormatted}
            </span>
          </div>
        </div>

        {/* Right Section: Sync Status & Cashier Profile / Lock Button */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          {/* Test mode badge: persistent on every page while active */}
          {isTestMode && (
            <span
              data-testid="test-mode-badge"
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-400/40 text-amber-800 shadow-2xs backdrop-blur-md"
            >
              Modo Prueba
            </span>
          )}
          {/* Sync Status Badge */}
          <div
            data-testid="sync-status"
            data-status={syncStatus}
            className={`flex items-center justify-center p-1.5 rounded-full border shadow-2xs backdrop-blur-md ${syncConfig.badgeClass}`}
            title={`Estado de sincronización: ${syncConfig.label}`}
          >
            {syncConfig.icon}
            <span className="sr-only">{syncConfig.label}</span>
          </div>

          {/* Cashier Profile Badge & Lock Button */}
          {activeCashier ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="text-[10px] bg-white/[0.45] hover:bg-white/[0.75] active:scale-95 backdrop-blur-md px-2.5 py-1 rounded-full border border-t-white border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] text-slate-800 font-bold flex items-center gap-1 cursor-pointer transition"
                title="Cambiar operador o rol"
              >
                {activeCashier.role === 'jefe' ? (
                  <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                ) : activeCashier.role === 'supervisor' ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <User className="w-3 h-3 text-slate-600 shrink-0" />
                )}
                <span className="truncate max-w-[65px] sm:max-w-[85px]">{activeCashier.name}</span>
                <span className="text-[9px] text-amber-800 uppercase font-black">
                  ({activeCashier.role === 'jefe' ? 'Admin' : activeCashier.role})
                </span>
              </button>
              {activeCashier.role === 'jefe' && (
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-1.5 rounded-full bg-white/[0.45] hover:bg-white/[0.75] border border-white/60 text-slate-600 hover:text-slate-800 transition cursor-pointer shadow-2xs"
                  title="Ajustes de tienda"
                >
                  <Settings className="w-3 h-3 text-slate-700" />
                  <span className="sr-only">Ajustes</span>
                </button>
              )}
              <button
                type="button"
                onClick={lockSession}
                className="p-1.5 rounded-full bg-white/[0.45] hover:bg-white/[0.75] border border-white/60 text-slate-600 hover:text-amber-800 transition cursor-pointer shadow-2xs"
                title="Bloquear sesión"
              >
                <Lock className="w-3 h-3 text-amber-700" />
                <span className="sr-only">Bloquear</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                aria-label="Ingresar / Activar Admin"
                className="text-[11px] font-bold text-slate-800 bg-white/[0.50] hover:bg-white/[0.80] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_12px_rgba(245,158,11,0.12)] active:scale-95 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-full border border-t-white border-x-white/50 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] flex items-center gap-1 cursor-pointer transition-all duration-200"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Ingresar</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Cashier / Operator Login & Role Switcher Modal */}
      <CashierLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
};
