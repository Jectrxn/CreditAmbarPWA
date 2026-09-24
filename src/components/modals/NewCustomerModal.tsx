import React, { useState } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer } from '../../types/database';
import { createCreditAccount, DEFAULT_CREDIT_LIMIT } from '../../features/credit/creditService';
import { useActiveStoreId } from '../../store/authStore';
import { AlertCircle, User, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

const PRESET_LIMITS = [50, 100, 200, 300];

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const activeStoreId = useActiveStoreId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState(DEFAULT_CREDIT_LIMIT.toString());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);

  const resetForm = () => {
    setName('');
    setPhone('');
    setCreditLimit(DEFAULT_CREDIT_LIMIT.toString());
    setErrorMessage(null);
    setCreatedCustomer(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('El nombre del cliente es obligatorio.');
      return;
    }

    const parsedLimit = parseFloat(creditLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setErrorMessage('El límite de crédito debe ser un monto válido mayor o igual a 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const storeId = activeStoreId;
      const newCust = await createCreditAccount({
        storeId,
        name: trimmedName,
        phone: phone.trim() || undefined,
        creditLimit: parsedLimit,
      });

      setCreatedCustomer(newCust);
      onSuccess?.(newCust);
    } catch (err: any) {
      if (err?.message?.includes('Customer already has an active account')) {
        setErrorMessage('Ya existe un cliente registrado con ese mismo nombre o teléfono.');
      } else {
        setErrorMessage(err?.message || 'Error al registrar el nuevo cliente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdCustomer ? '¡Cliente Registrado!' : 'Nuevo Cliente'}
      variant="bottom-sheet"
      maxWidth="md"
      data-testid="new-customer-modal"
    >
      <div className="py-1 space-y-4">
        {createdCustomer ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-400 via-emerald-300 to-teal-200 text-emerald-950 rounded-2xl flex items-center justify-center mx-auto border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{createdCustomer.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliente creado con éxito y cuenta de fiado activa.
              </p>
            </div>

            <div className="p-4 bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] rounded-2xl border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_16px_rgba(15,23,42,0.06)] text-xs space-y-2 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Límite de Crédito:</span>
                <span className="font-bold text-emerald-700">S/ {createdCustomer.credit_limit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Deuda Inicial:</span>
                <span className="font-bold text-slate-800">S/ 0.00 (Al día)</span>
              </div>
              {createdCustomer.phone && (
                <div className="flex justify-between border-t border-white/20 pt-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">Teléfono / WhatsApp:</span>
                  <span className="font-bold text-slate-800">{createdCustomer.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={handleClose}
                className="relative overflow-hidden w-full py-3.5 text-sm font-black text-slate-950 bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 rounded-2xl shadow-[0_8px_20px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/50 via-white/10 to-transparent"
                />
                <span className="relative z-10">Listo / Cerrar</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50/90 backdrop-blur-md border border-rose-200 rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Nombre y Apellido / Apodo <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Diego | Los Angeles, Sr. Otoya"
                  className="w-full px-4 py-3 text-sm font-bold bg-white/[0.65] backdrop-blur-md border border-t-white/95 border-x-white/40 border-b-white/20 rounded-2xl text-slate-900 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_6px_rgba(15,23,42,0.03)] focus:outline-none focus:bg-white/[0.90] focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 placeholder:text-slate-400 placeholder:font-normal"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Teléfono / WhatsApp</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Opcional
                </span>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 927268714"
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-white/[0.55] backdrop-blur-md border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_6px_rgba(15,23,42,0.02)] focus:outline-none focus:bg-white/[0.85] focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 placeholder:text-slate-400"
                />
              </div>
              <p className="text-[10px] font-medium text-slate-400/90 mt-1 pl-1">
                Recomendado para enviar comprobantes digitales por WhatsApp.
              </p>
            </div>

            {/* Credit Limit */}
            <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-amber-100/20 to-transparent p-3.5 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_4px_14px_-6px_rgba(180,83,9,0.15)]">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-[11px] font-black text-amber-900 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Límite de Fiado Máximo</span>
                </label>
                <span className="text-[10px] font-bold text-amber-800/80 bg-amber-100/60 border border-amber-200/50 px-2 py-0.5 rounded-full">
                  Sugerido: S/ 100
                </span>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 mb-2.5">
                {PRESET_LIMITS.map((amount) => {
                  const isSelected = parseFloat(creditLimit) === amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCreditLimit(amount.toString())}
                      className={`flex-1 py-1.5 px-2 text-xs font-black rounded-xl border transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/90 text-amber-950 border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)]'
                          : 'bg-white/[0.60] text-slate-700 border-white/80 hover:bg-white/[0.85] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]'
                      }`}
                    >
                      S/ {amount}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div className="relative flex items-center">
                <span className="absolute left-3.5 z-10 pointer-events-none text-xs font-black text-amber-900 select-none">
                  S/
                </span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="100.00"
                  className="w-full pl-9 pr-4 py-2.5 text-base font-black bg-white/[0.85] backdrop-blur-md border border-t-white/95 border-x-amber-100/70 border-b-amber-300/50 rounded-xl text-slate-950 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(180,83,9,0.06)] focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Actions: Ergonomic Full-width CTA */}
            <div className="space-y-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="relative overflow-hidden w-full py-3.5 text-sm font-black text-slate-950 bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 rounded-2xl shadow-[0_8px_20px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/50 via-white/10 to-transparent"
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    'Guardar Cliente'
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
