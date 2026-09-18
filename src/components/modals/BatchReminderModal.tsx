import React, { useState, useMemo } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer } from '../../types/database';
import { generateWhatsAppPaymentReminder, generateWhatsAppMessageText } from '../../features/transactions/whatsappHelper';
import { useAuthStore } from '../../store/authStore';
import { useReminderStore } from '../../store/reminderStore';
import { triggerHaptic } from '../../utils/haptics';
import {
  MessageCircle,
  CheckCircle2,
  Copy,
  AlertCircle,
  Search,
  Check,
} from 'lucide-react';

export interface BatchReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtors: Customer[];
}

export const BatchReminderModal: React.FC<BatchReminderModalProps> = ({
  isOpen,
  onClose,
  debtors,
}) => {
  const { storeSession } = useAuthStore();
  const storeName = storeSession?.storeName || 'CreditAmbar';

  const [searchFilter, setSearchFilter] = useState('');
  const { sentReminders, markAsSent } = useReminderStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter debtors by search
  const filteredDebtors = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return debtors;
    return debtors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.phone && d.phone.toLowerCase().includes(q))
    );
  }, [debtors, searchFilter]);

  // Aggregate stats
  const totalDebt = useMemo(() => {
    return debtors.reduce((sum, d) => sum + (d.balance || 0), 0);
  }, [debtors]);

  const handleSendWhatsApp = (customer: Customer) => {
    triggerHaptic(25);
    markAsSent(customer.id);
    const url = generateWhatsAppPaymentReminder(customer, storeName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = async (customer: Customer) => {
    triggerHaptic(15);
    const message = generateWhatsAppMessageText(customer, storeName);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(customer.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      data-testid="batch-reminder-modal"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center shrink-0 border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.3)]">
            <MessageCircle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Recordatorios de Cobro
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Notificaciones por WhatsApp con saldo actualizado
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-1">
          <div className="text-[11px] font-bold text-slate-600">
            Enviados: <span className="text-emerald-700 font-black">{sentReminders.length}</span> de {debtors.length}
          </div>
          <button
            type="button"
            data-testid="close-batch-modal-btn"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-800 bg-white/[0.60] hover:bg-white/[0.80] active:scale-95 rounded-full border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* KPI Strip */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.70] via-white/[0.60] to-emerald-50/[0.40] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_6px_18px_-4px_rgba(15,23,42,0.06)] p-2.5">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/10 to-transparent rounded-t-[inherit]"
          />
          <div className="relative z-10 grid grid-cols-2 divide-x divide-white/50 text-center">
            <div className="px-2">
              <span className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                Total por Cobrar
              </span>
              <span className="block text-base sm:text-lg font-black text-rose-700 leading-tight mt-0.5">
                S/ {totalDebt.toFixed(2)}
              </span>
            </div>
            <div className="px-2">
              <span className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                Clientes Deudores
              </span>
              <span className="block text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                {debtors.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search input if more than 3 debtors */}
        {debtors.length > 3 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por nombre o teléfono..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all"
            />
          </div>
        )}

        {/* Debtor List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
          {filteredDebtors.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-semibold">
              No hay deudores que coincidan con la búsqueda.
            </div>
          ) : (
            filteredDebtors.map((customer) => {
              const isSent = sentReminders.includes(customer.id);
              const isCopied = copiedId === customer.id;
              const hasPhone = Boolean(customer.phone && customer.phone.trim().length > 0);
              const initialLetter = customer.name.charAt(0).toUpperCase() || 'C';

              return (
                <div
                  key={customer.id}
                  className={`p-3 rounded-2xl transition-all duration-200 border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_4px_12px_-3px_rgba(15,23,42,0.05)] flex items-center justify-between gap-2.5 ${
                    isSent
                      ? 'bg-emerald-500/10 border-emerald-400/30'
                      : 'bg-white/[0.60] hover:bg-white/[0.75]'
                  }`}
                >
                  {/* Left: Customer Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-orange-300 to-amber-200 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 border border-white/90 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_6px_rgba(245,158,11,0.25)]">
                      {initialLetter}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {customer.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-black text-rose-700 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-400/30">
                          Debe: S/ {customer.balance.toFixed(2)}
                        </span>
                        {hasPhone ? (
                          <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                            {customer.phone}
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-amber-700 font-bold bg-amber-500/10 px-1 py-0.5 rounded-md flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> Sin fono
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Copy Text Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(customer)}
                      title="Copiar mensaje de recordatorio"
                      aria-label={`Copiar mensaje para ${customer.name}`}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white/60 hover:bg-white/90 border border-white/80 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] transition active:scale-90 cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                      )}
                    </button>

                    {/* Send WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(customer)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-full border transition active:scale-95 cursor-pointer ${
                        isSent
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                          : 'bg-gradient-to-tr from-emerald-500/95 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 text-emerald-950 border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)]'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Enviado</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </LiquidModal>
  );
};
