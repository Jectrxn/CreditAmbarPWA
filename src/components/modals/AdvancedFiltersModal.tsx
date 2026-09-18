import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import { triggerHaptic } from '../../utils/haptics';
import { Filter, Calendar, DollarSign, Check, X } from 'lucide-react';

export interface AdvancedFilters {
  minAmount: number | null;
  maxAmount: number | null;
  minAgeDays: number | null;
}

export interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: AdvancedFilters;
  onApplyFilters: (filters: AdvancedFilters) => void;
}

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
}) => {
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [minAgeDays, setMinAgeDays] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMinAmount(currentFilters.minAmount ? currentFilters.minAmount.toString() : '');
      setMaxAmount(currentFilters.maxAmount ? currentFilters.maxAmount.toString() : '');
      setMinAgeDays(currentFilters.minAgeDays ? currentFilters.minAgeDays.toString() : '');
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    triggerHaptic(20);
    onApplyFilters({
      minAmount: minAmount ? parseFloat(minAmount) : null,
      maxAmount: maxAmount ? parseFloat(maxAmount) : null,
      minAgeDays: minAgeDays ? parseInt(minAgeDays, 10) : null,
    });
    onClose();
  };

  const handleClear = () => {
    triggerHaptic(15);
    setMinAmount('');
    setMaxAmount('');
    setMinAgeDays('');
  };

  const hasActiveFilters = Boolean(minAmount || maxAmount || minAgeDays);

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 via-white to-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.1)]">
            <Filter className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Filtros Avanzados
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Rango de deuda y antigüedad
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-1">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className={`px-3 py-2 text-xs font-black transition-all rounded-full flex items-center gap-1.5 ${
              hasActiveFilters
                ? 'text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 cursor-pointer'
                : 'text-slate-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black text-slate-800 bg-white/[0.60] hover:bg-white/[0.80] active:scale-95 rounded-full border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-950 bg-gradient-to-tr from-emerald-500/95 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 active:scale-95 rounded-full border border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)] transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Aplicar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        
        {/* Rango de Monto */}
        <div className="p-4 rounded-3xl bg-white/[0.55] backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_6px_18px_-4px_rgba(15,23,42,0.06)]">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Por Monto de Deuda
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Mínimo (S/)</label>
              <input
                type="number"
                inputMode="decimal"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Ej. 50"
                className="w-full px-3 py-2 text-sm font-bold bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Máximo (S/)</label>
              <input
                type="number"
                inputMode="decimal"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Ej. 500"
                className="w-full px-3 py-2 text-sm font-bold bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Rango de Antigüedad */}
        <div className="p-4 rounded-3xl bg-white/[0.55] backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_6px_18px_-4px_rgba(15,23,42,0.06)]">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> Por Antigüedad
          </h3>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Más de X días vencido</label>
            <input
              type="number"
              inputMode="numeric"
              value={minAgeDays}
              onChange={(e) => setMinAgeDays(e.target.value)}
              placeholder="Ej. 30"
              className="w-full px-3 py-2 text-sm font-bold bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all"
            />
          </div>
        </div>

      </div>
    </LiquidModal>
  );
};
