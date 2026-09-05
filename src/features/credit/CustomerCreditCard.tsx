import React from 'react';
import type { Customer } from '../../types/database';
import { GlassCard } from '../../components/ui/GlassCard';
import { User, Phone, AlertTriangle, AlertOctagon, PlusCircle, ArrowDownLeft } from 'lucide-react';

export interface CustomerCreditCardProps {
  customer: Customer;
  onSelect?: (customer: Customer) => void;
  onRecordPayment?: (customer: Customer) => void;
  onNewCreditPurchase?: (customer: Customer) => void;
  className?: string;
}

export const CustomerCreditCard: React.FC<CustomerCreditCardProps> = ({
  customer,
  onSelect,
  onRecordPayment,
  onNewCreditPurchase,
  className = '',
}) => {
  const availableCredit = Math.max(0, customer.credit_limit - customer.balance);
  const utilizationPercent =
    customer.credit_limit > 0 ? (customer.balance / customer.credit_limit) * 100 : 0;

  const isExhausted = customer.balance >= customer.credit_limit;
  const isHighRisk = !isExhausted && utilizationPercent >= 80;

  return (
    <GlassCard
      variant="default"
      padding="md"
      className={`relative space-y-4 ${className}`}
      onClick={() => onSelect?.(customer)}
    >
      {/* Header: Customer Name and Phone */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-800">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-snug">{customer.name}</h3>
            {customer.phone ? (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.phone}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Sin teléfono</span>
            )}
          </div>
        </div>

        {/* Status badges */}
        {isExhausted && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100/90 border border-red-300 rounded-full">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Límite agotado</span>
          </span>
        )}

        {isHighRisk && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerta de límite / Límite cercano</span>
          </span>
        )}
      </div>

      {/* Credit Limits & Balance */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-white/60 border border-white/70 rounded-2xl">
          <p className="text-xs text-slate-500 font-medium">Deuda actual / Saldo pendiente</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">${customer.balance.toFixed(2)}</p>
        </div>

        <div className="p-3 bg-white/60 border border-white/70 rounded-2xl">
          <p className="text-xs text-slate-500 font-medium">Límite disponible</p>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">${availableCredit.toFixed(2)}</p>
        </div>
      </div>

      {/* Progress Bar for Credit Limit Utilization */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Límite total: ${customer.credit_limit.toFixed(2)}</span>
          <span className="font-semibold">{Math.min(100, Math.round(utilizationPercent))}% usado</span>
        </div>
        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isExhausted ? 'bg-red-500' : isHighRisk ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, utilizationPercent))}%` }}
          />
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/30">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRecordPayment?.(customer);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 active:bg-emerald-300/80 rounded-xl border border-emerald-300 transition"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Abonar / Registrar Pago</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewCreditPurchase?.(customer);
          }}
          disabled={isExhausted}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border transition ${
            isExhausted
              ? 'bg-slate-200/50 text-slate-400 border-slate-300 cursor-not-allowed'
              : 'text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 active:bg-amber-300/80 border-amber-300'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nuevo Fiado / Fiar</span>
        </button>
      </div>
    </GlassCard>
  );
};
