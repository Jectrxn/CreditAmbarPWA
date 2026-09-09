import React from 'react';
import { Lock, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import type { SyncStatus } from '../../lib/syncManager';

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
    icon: <Wifi className="w-3 h-3 text-emerald-600" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  },
  syncing: {
    label: 'Sincronizando',
    icon: <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />,
    badgeClass: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  },
  offline: {
    label: 'Sin conexión',
    icon: <WifiOff className="w-3 h-3 text-slate-600" />,
    badgeClass: 'bg-slate-500/15 text-slate-700 border-slate-400/30',
  },
  error: {
    label: 'Error de sincronización',
    icon: <AlertCircle className="w-3 h-3 text-rose-600" />,
    badgeClass: 'bg-rose-500/15 text-rose-800 border-rose-500/30',
  },
  idle: {
    label: 'En línea',
    icon: <Wifi className="w-3 h-3 text-emerald-600" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  },
};

export const TopBar: React.FC<TopBarProps> = ({ className = '' }) => {
  const { storeSession, activeCashier, lockSession } = useAuthStore();
  const syncStatus = useSyncStatus();
  const syncConfig = syncStatusMap[syncStatus] || syncStatusMap.online;

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/80 backdrop-blur-[17px] backdrop-saturate-[180%] border-b border-t-white/80 border-x-white/25 border-b-white/20 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.85)] transition-all duration-200 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Store Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/[0.08] backdrop-blur-[17px] border border-t-white/80 border-x-white/25 border-b-white/15 p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center shrink-0">
            <img
              src="/logo-ambar.png"
              alt="Ámbar Bodega"
              className="h-full w-full object-contain drop-shadow-sm"
              onError={(e) => {
                // Graceful fallback if image fails to load in non-browser environments
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] truncate">
                CreditAmbar
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400/50 font-bold shadow-xs shrink-0">
                PWA
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 truncate">
              {storeSession ? storeSession.storeName : 'Dispositivo no vinculado'} • Bodega & Fiambrería
            </p>
          </div>
        </div>

        {/* Right Section: Sync Status & Cashier Profile / Lock Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sync Status Badge */}
          <div
            data-testid="sync-status"
            data-status={syncStatus}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs ${syncConfig.badgeClass}`}
            title={`Estado de sincronización: ${syncConfig.label}`}
          >
            {syncConfig.icon}
            <span className="hidden sm:inline text-xs font-semibold">{syncConfig.label}</span>
          </div>

          {/* Cashier Profile Badge & Lock Button */}
          {activeCashier ? (
            <div className="flex items-center gap-2">
              <div className="text-xs bg-white/[0.08] backdrop-blur-[17px] px-3 py-1.5 rounded-full border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] text-slate-700 font-medium flex items-center gap-1">
                <span className="font-semibold text-slate-900">{activeCashier.name}</span>
                <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">
                  ({activeCashier.role})
                </span>
              </div>
              <button
                type="button"
                onClick={lockSession}
                className="glass-pill-button text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-700 hover:text-amber-800 cursor-pointer"
                title="Bloquear sesión"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">Bloquear</span>
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-600 bg-white/[0.08] backdrop-blur-[17px] px-3 py-1.5 rounded-full border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
              Esperando operador
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
