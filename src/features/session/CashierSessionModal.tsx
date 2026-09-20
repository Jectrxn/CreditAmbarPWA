import React, { useState } from 'react';
import { LiquidModal } from '../../components/ui/LiquidModal';
import { useSessionStore } from './sessionStore';
import { useAuthStore, useActiveStoreId } from '../../store/authStore';
import { DollarSign, QrCode, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export interface CashierSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashierSessionModal: React.FC<CashierSessionModalProps> = ({ isOpen, onClose }) => {
  const { activeSession, openSession, closeSession } = useSessionStore();
  const { activeCashier } = useAuthStore();
  const activeStoreId = useActiveStoreId();

  const [floatInput, setFloatInput] = useState<string>('50');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedFloat = parseFloat(floatInput);
    if (isNaN(parsedFloat) || parsedFloat < 0) {
      setErrorMessage('Float amount must be positive or zero (el monto debe ser mayor o igual a cero).');
      return;
    }

    const cashierId = activeCashier?.id || 'cajero-default';
    const cashierName = activeCashier?.name || 'Cajero';
    const storeId = activeStoreId;

    const res = openSession({
      cashierId,
      cashierName,
      storeId,
      startingFloat: parsedFloat,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'No se pudo abrir la sesión.');
    }
  };

  const handleCloseSession = () => {
    setErrorMessage(null);
    const res = closeSession();
    if (!res.success) {
      setErrorMessage(res.error || 'Error al cerrar sesión.');
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title={activeSession ? 'Caja Activa (Turno Activo)' : 'Apertura de Caja (Iniciar Turno)'}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-100/80 border border-red-300 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!activeSession ? (
          <form onSubmit={handleOpenSession} className="space-y-4">
            <p className="text-sm text-slate-600">
              Para registrar transacciones en efectivo con aislamiento FCC, declara el fondo inicial de efectivo en gaveta.
            </p>

            <div className="space-y-1">
              <label htmlFor="starting-float-input" className="block text-sm font-medium text-slate-800">
                Monto inicial / Fondo inicial ($):
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-semibold">$</span>
                <input
                  id="starting-float-input"
                  type="number"
                  step="0.01"
                  value={floatInput}
                  onChange={(e) => setFloatInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-white/70 border border-white/50 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-white/40 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow transition"
              >
                Iniciar Turno / Abrir Caja
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Turno activo — {activeSession.cashierName}</p>
                <p className="text-xs text-emerald-600">Iniciado: {new Date(activeSession.openedAt).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* FCC Drawer Cash */}
              <div className="p-3.5 bg-white/60 border border-white/80 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Efectivo en Gaveta (FCC)</span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  ${activeSession.currentCashTotal.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Fondo: ${activeSession.startingFloat.toFixed(2)} | Cobros: ${activeSession.cashPaymentsTotal.toFixed(2)}
                </div>
              </div>

              {/* QR Treasury Total */}
              <div className="p-3.5 bg-white/60 border border-white/80 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tesorería QR / Digital</span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  ${activeSession.qrPaymentsTotal.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Directo a cuenta comercio
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/30">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-white/40 transition"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow transition"
              >
                <Lock className="w-4 h-4" />
                <span>Cerrar Caja / Finalizar Turno</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </LiquidModal>
  );
};
