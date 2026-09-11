import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore, type CashierProfile, type CashierRole } from '../../store/authStore';
import {
  Shield,
  ShieldCheck,
  User,
  Crown,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Delete,
  X,
} from 'lucide-react';

export interface CashierLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cashier: CashierProfile) => void;
}

export const CashierLoginModal: React.FC<CashierLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    cashiers,
    activeCashier,
    unlockWithPin,
    logoutCashier,
    isProfileLocked,
    getLockoutRemainingTime,
  } = useAuthStore();

  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);

  const adminCashiers = cashiers.filter(c => c.role === 'jefe' || c.role === 'supervisor');

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMessage(null);
      setIsSuccessFeedback(false);

      if (activeCashier && (activeCashier.role === 'jefe' || activeCashier.role === 'supervisor')) {
        setSelectedCashierId(activeCashier.id);
      } else if (adminCashiers.length > 0) {
        setSelectedCashierId(adminCashiers[0].id);
      }
    }
  }, [isOpen, activeCashier, cashiers]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

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

  const selectedCashier = cashiers.find((c) => c.id === selectedCashierId);

  const handleKeypadPress = (num: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setErrorMessage(null);
      if (nextPin.length === 4) {
        attemptLogin(selectedCashierId, nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const attemptLogin = (cashierId: string, pin: string) => {
    if (!cashierId) {
      setErrorMessage('Seleccione un rol autorizado.');
      return;
    }

    if (isProfileLocked(cashierId)) {
      const remainingSec = Math.ceil(getLockoutRemainingTime(cashierId) / 1000);
      setErrorMessage(`Bloqueado por seguridad. Intente en ${remainingSec}s.`);
      setPinInput('');
      return;
    }

    const success = unlockWithPin(cashierId, pin);
    if (success) {
      setIsSuccessFeedback(true);
      const targetCashier = cashiers.find((c) => c.id === cashierId);
      setTimeout(() => {
        if (targetCashier) onSuccess?.(targetCashier);
        onClose();
      }, 400);
    } else {
      const isNowLocked = isProfileLocked(cashierId);
      if (isNowLocked) {
        setErrorMessage('PIN incorrecto 3 veces. Perfil bloqueado.');
      } else {
        setErrorMessage('PIN incorrecto. Intente nuevamente.');
      }
      setPinInput('');
    }
  };

  const handleLogout = () => {
    logoutCashier();
    setPinInput('');
    setErrorMessage(null);
    onClose();
  };

  const getRoleBadge = (role: CashierRole) => {
    switch (role) {
      case 'jefe':
        return {
          label: 'Admin',
          icon: <Crown className="w-4 h-4 text-amber-500" />,
          badgeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border-amber-400',
        };
      case 'supervisor':
        return {
          label: 'Supervisor',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
          badgeClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md border-emerald-400',
        };
      case 'cajero':
        return {
          label: 'Cajero',
          icon: <User className="w-4 h-4 text-slate-500" />,
          badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
        };
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      data-testid="cashier-login-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      role="presentation"
    >
      <div
        data-testid="cashier-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cashier-login-title"
        className="relative w-full sm:max-w-sm mt-auto sm:mt-0 flex flex-col overflow-hidden max-h-[92vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 pb-safe rounded-t-[2.5rem] rounded-b-none sm:rounded-b-[2.5rem] bg-white/[0.60] backdrop-blur-[24px] backdrop-saturate-[190%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Specular Rim Reflection */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-[2.5rem] bg-gradient-to-b from-white/60 via-white/10 to-transparent"
        />
        {/* Handle bar for mobile bottom sheet feel */}
        <div className="flex flex-col items-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-400/80 shadow-inner"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-300/50 shrink-0">
          <div id="cashier-login-title" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500 drop-shadow-sm" />
            <span className="font-black tracking-tight text-slate-900 text-lg">Acceso Autorizado</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-full p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 active:bg-slate-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-5 text-slate-800">
          {/* Active Session Notice if already logged in */}
          {activeCashier && (activeCashier.role === 'jefe' || activeCashier.role === 'supervisor') && (
            <div className="p-3 rounded-2xl bg-white/[0.80] backdrop-blur-xl border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center border border-white/80 shadow-sm shrink-0">
                  {activeCashier.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {activeCashier.name}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    Sesión activa
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-rose-700 bg-white/50 hover:bg-rose-50 rounded-full border border-rose-200 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                title="Cerrar sesión de operador"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Salir</span>
              </button>
            </div>
          )}

          {/* Cashier Profiles Grid (Only Admins/Supervisors) */}
          <div>
            <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 ml-1 drop-shadow-sm">
              Seleccionar Rol:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {adminCashiers.map((cashier) => {
                const isSelected = cashier.id === selectedCashierId;
                const roleInfo = getRoleBadge(cashier.role);

                return (
                  <button
                    key={cashier.id}
                    type="button"
                    onClick={() => {
                      setSelectedCashierId(cashier.id);
                      setPinInput('');
                      setErrorMessage(null);
                    }}
                    className={`relative overflow-hidden p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-white/95 to-white/80 border-amber-300 shadow-[0_8px_16px_-4px_rgba(245,158,11,0.2),inset_0_2px_4px_rgba(255,255,255,0.9)] scale-[1.02]'
                        : 'bg-white/60 hover:bg-white/80 border-white/60 shadow-sm hover:scale-[1.01]'
                    }`}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 shadow-sm flex items-center justify-center border border-amber-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-amber-900" />
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md border ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 border-white/80'
                            : 'bg-white/90 text-slate-600 border-slate-300'
                        }`}
                      >
                        {roleInfo.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-[11px] font-black tracking-wide ${isSelected ? 'text-amber-950' : 'text-slate-900'}`}>
                          {roleInfo.label}
                        </p>
                        <p className="text-[9px] font-bold text-slate-700 truncate w-full max-w-[80px] mx-auto">
                          {cashier.name}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Entry Area */}
          {selectedCashier && (
            <div className="p-4 rounded-[32px] bg-white/[0.85] backdrop-blur-2xl backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/10 shadow-[0_16px_32px_-12px_rgba(15,23,42,0.1),inset_0_2px_3px_rgba(255,255,255,0.9)] space-y-5 text-center">
              <div>
                <p className="text-[11px] font-black tracking-widest text-slate-800 uppercase drop-shadow-sm">
                  PIN de {selectedCashier.role === 'jefe' ? 'Administrador' : 'Supervisor'}
                </p>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">
                  Ingrese su código de 4 dígitos
                </p>
              </div>

              {/* PIN Dots Display */}
              <div className="flex items-center justify-center gap-3.5">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pinInput.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                        isSuccessFeedback
                          ? 'bg-emerald-400 border-emerald-300 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                          : isFilled
                          ? 'bg-amber-400 border-amber-300 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'bg-white/50 border-slate-300/50 shadow-inner'
                      }`}
                    />
                  );
                })}
              </div>

              {errorMessage && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50/90 p-2.5 rounded-2xl border border-rose-200/60 shadow-sm animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* On-screen Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="py-3 text-lg font-black text-slate-900 bg-white/90 hover:bg-white active:scale-90 backdrop-blur-md rounded-2xl border border-t-white border-x-white/80 border-b-white/40 shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="py-3 text-lg font-black text-slate-900 bg-white/90 hover:bg-white active:scale-90 backdrop-blur-md rounded-2xl border border-t-white border-x-white/80 border-b-white/40 shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Borrar dígito"
                  className="py-3 flex items-center justify-center text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white active:scale-90 backdrop-blur-md rounded-2xl border border-t-white border-x-white/80 border-b-white/40 shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

