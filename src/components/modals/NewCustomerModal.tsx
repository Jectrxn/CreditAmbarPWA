import React, { useState } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer } from '../../types/database';
import { createCreditAccount, DEFAULT_CREDIT_LIMIT } from '../../features/credit/creditService';
import { useAuthStore } from '../../store/authStore';
import { AlertCircle, User, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { storeSession } = useAuthStore();
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
      const storeId = storeSession?.storeId || 'store-default';
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
      title={createdCustomer ? '¡Cliente Registrado!' : '+ Nuevo Cliente'}
      maxWidth="md"
      data-testid="new-customer-modal"
    >
      <div className="py-2 space-y-4">
        {createdCustomer ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{createdCustomer.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliente creado con éxito y cuenta de fiado activa.
              </p>
            </div>

            <div className="p-4 bg-white/[0.10] backdrop-blur-md rounded-2xl border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] text-xs space-y-2 text-left max-w-sm mx-auto">
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
                  <span className="text-slate-500 font-medium">Teléfono:</span>
                  <span className="font-bold text-slate-800">{createdCustomer.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 rounded-full border border-t-white/80 border-b-amber-600/50 shadow-md transition active:scale-95 cursor-pointer"
              >
                Listo / Cerrar
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
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre y Apellido / Apodo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Diego | Los Angeles, Sr. Otoya"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white/[0.60] backdrop-blur-md border border-t-white/90 border-x-white/40 border-b-white/20 rounded-2xl text-slate-900 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.8)] focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-amber-500/40"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Teléfono / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 927268714"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white/[0.60] backdrop-blur-md border border-t-white/90 border-x-white/40 border-b-white/20 rounded-2xl text-slate-900 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.8)] focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Credit Limit */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Límite de Fiado Máximo (S/)
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="100.00"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold bg-white/[0.60] backdrop-blur-md border border-t-white/90 border-x-white/40 border-b-white/20 rounded-2xl text-slate-900 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.8)] focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 pl-1">
                Límite por defecto sugerido para clientes nuevos: S/ 100.00.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/20">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-full transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 rounded-full shadow-[0_8px_20px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-95 transition cursor-pointer"
              >
                {isSubmitting ? 'Registrando...' : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
