import React from 'react';
import type { CashierSession } from '../session/sessionStore';
import { useSupervisorMetrics } from './useSupervisorMetrics';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  AlertTriangle,
  DollarSign,
  QrCode,
  Users,
  PowerOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export interface SupervisorDashboardProps {
  sessions?: CashierSession[];
  isOnline?: boolean;
  onForceClose?: (sessionId: string) => void;
  className?: string;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  sessions,
  isOnline,
  onForceClose,
  className = '',
}) => {
  const {
    activeSessionsCount,
    totalExpectedCash,
    totalCashPayments,
    totalQrPayments,
    totalCollected,
    sessions: sessionDetails,
    isOffline,
    offlineWarning,
  } = useSupervisorMetrics({ sessions, isOnline });

  return (
    <div className={`space-y-6 w-full max-w-5xl mx-auto p-4 md:p-6 ${className}`}>
      {/* Offline Status Warning Banner */}
      {isOffline && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-950 text-sm font-medium shadow-sm backdrop-blur-md animate-pulse"
        >
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-amber-950">
              {offlineWarning || 'Offline - Data may be outdated'}
            </span>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Mostrando las últimas métricas conocidas guardadas localmente. La información se actualizará cuando se restablezca la conexión.
            </p>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Panel de Supervisión
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-900 border border-indigo-400/40 font-bold">
              Supervisor
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Métricas consolidadas en tiempo real y control de sesiones de caja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-slate-700 font-semibold shadow-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeSessionsCount} Cajas Activas</span>
          </span>
          {isOffline ? (
            <span className="text-xs px-3 py-1.5 rounded-full bg-rose-500/15 text-rose-800 border border-rose-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Sin conexión
            </span>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En línea
            </span>
          )}
        </div>
      </div>

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected Cash in Drawer */}
        <GlassCard variant="prominent" className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Efectivo Esperado (FCC)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${totalExpectedCash.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Fondo inicial + Cobros en gaveta
          </p>
        </GlassCard>

        {/* Total Payments Collected */}
        <GlassCard variant="default" glow className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Cobrado
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${totalCollected.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Ingresos totales del turno
          </p>
        </GlassCard>

        {/* Cash Payments (FCC) */}
        <GlassCard variant="default" className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cobros Efectivo
            </span>
            <div className="p-2 rounded-xl bg-slate-500/15 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${totalCashPayments.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Aislado en gaveta física
          </p>
        </GlassCard>

        {/* QR Payments (Treasury) */}
        <GlassCard variant="default" className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cobros Digitales QR
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-700">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${totalQrPayments.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Directo a tesorería digital
          </p>
        </GlassCard>
      </div>

      {/* Cashier Sessions Breakdown */}
      <GlassCard variant="prominent" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/60 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            Sesiones de Caja ({sessionDetails.length})
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Aislamiento FCC y Rendición
          </span>
        </div>

        {sessionDetails.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No hay sesiones de caja registradas actualmente.
          </div>
        ) : (
          <div className="space-y-3">
            {sessionDetails.map((session) => {
              const isOpen = session.status === 'open';
              const isClosing = session.status === 'closing';

              return (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-white/80"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        {session.cashierName}
                      </span>
                      {isOpen && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                          Abierta
                        </span>
                      )}
                      {isClosing && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">
                          Sincronizando / Cerrando
                        </span>
                      )}
                      {!isOpen && !isClosing && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          Cerrada
                        </span>
                      )}
                      {session.closeReason && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                          {session.closeReason}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Fondo inicial: ${session.startingFloat.toFixed(2)}</span>
                      <span>Cobros Efectivo: ${session.cashPaymentsTotal.toFixed(2)}</span>
                      <span>Cobros QR: ${session.qrPaymentsTotal.toFixed(2)}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(session.openedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Efectivo en Gaveta
                      </span>
                      <span className="text-lg font-black text-amber-900">
                        ${session.expectedCash.toFixed(2)}
                      </span>
                    </div>

                    {isOpen && onForceClose && (
                      <button
                        type="button"
                        onClick={() => onForceClose(session.id)}
                        className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                        <span>Forzar Cierre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
