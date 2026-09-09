import React from 'react';
import { Lock, Wifi, WifiOff, RefreshCw, AlertCircle, Shield, User } from 'lucide-react';
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
  const { storeSession, activeCashier, lockSession } = useAuthStore();
  const syncStatus = useSyncStatus();
  const syncConfig = syncStatusMap[syncStatus] || syncStatusMap.online;

  return (
    <header
      className={`sticky top-0 z-40 w-full max-w-sm sm:max-w-md mx-auto mt-2 sm:mt-3.5 px-3 py-1.5 rounded-full bg-white/[0.60] backdrop-blur-[24px] backdrop-saturate-[190%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center justify-between gap-2 transition-all duration-200 ${className}`}
    >
      {/* Top Specular Rim Reflection */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full bg-gradient-to-b from-white/60 via-white/10 to-transparent"
      />

      {/* Brand & Store Info */}
      <div className="relative z-10 flex items-center gap-2 min-w-0">
        <div className="h-8 w-8 rounded-full bg-white/[0.80] backdrop-blur-md border border-t-white border-x-white/50 border-b-white/20 p-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)] flex items-center justify-center shrink-0">
          <img
            src="/logo-ambar.png"
            alt="Ámbar Bodega"
            className="h-full w-full object-contain rounded-full drop-shadow-2xs"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-nowrap">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 drop-shadow-2xs whitespace-nowrap">
              CreditAmbar
            </h1>
            <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-950 border border-amber-400/50 font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] shrink-0">
              PWA
            </span>
          </div>
          <p className="text-[9px] font-semibold text-slate-500 truncate max-w-[120px] sm:max-w-[160px]">
            {storeSession ? `${storeSession.storeName} • Bodega & Fiambrería` : 'Ámbar Bodega • Bodega & Fiambrería'}
          </p>
        </div>
      </div>

      {/* Right Section: Sync Status & Cashier Profile / Lock Button */}
      <div className="relative z-10 flex items-center gap-1.5 shrink-0">
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
            <div className="text-[10px] bg-white/[0.60] backdrop-blur-md px-2.5 py-1 rounded-full border border-t-white border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] text-slate-800 font-bold flex items-center gap-1">
              {activeCashier.role === 'supervisor' || activeCashier.role === 'jefe' ? (
                <Shield className="w-3 h-3 text-amber-600 shrink-0" />
              ) : (
                <User className="w-3 h-3 text-slate-600 shrink-0" />
              )}
              <span className="truncate max-w-[65px] sm:max-w-[85px]">{activeCashier.name}</span>
              <span className="text-[9px] text-amber-800 uppercase font-black">
                ({activeCashier.role})
              </span>
            </div>
            <button
              type="button"
              onClick={lockSession}
              className="p-1.5 rounded-full bg-white/[0.5] hover:bg-white/[0.85] border border-white/60 text-slate-600 hover:text-amber-800 transition cursor-pointer shadow-2xs"
              title="Bloquear sesión"
            >
              <Lock className="w-3 h-3 text-amber-700" />
              <span className="sr-only">Bloquear</span>
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-700 bg-white/[0.60] backdrop-blur-md px-2.5 py-1 rounded-full border border-t-white border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]">
            Esperando operador
          </span>
        )}
      </div>
    </header>
  );
};
