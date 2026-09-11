import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { UserCheck } from 'lucide-react';

export interface OperatorSelectorProps {
  selectedName: string;
  onSelect: (name: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const FALLBACK_OPERATORS = ['Martin', 'Emiliano', 'Anthony', 'Benjamin'];

export const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  selectedName,
  onSelect,
  label = 'Atendido por:',
  className = '',
  disabled = false,
}) => {
  const { cashiers, setCurrentOperatorName } = useAuthStore();

  // Get active cashiers (or default 4 operators)
  const operators = React.useMemo(() => {
    const list = cashiers.filter((c) => c.role === 'cajero').map((c) => c.name);
    return list.length > 0 ? list : FALLBACK_OPERATORS;
  }, [cashiers]);

  const handleSelect = (name: string) => {
    if (disabled) return;
    onSelect(name);
    setCurrentOperatorName(name);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1 text-[11px] font-black text-slate-700 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] font-bold text-amber-800/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
            1 Toque
          </span>
        </div>
      )}

      {/* 4-Pill Liquid Glass Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {operators.map((name) => {
          const isSelected = selectedName.trim().toLowerCase() === name.trim().toLowerCase();
          const initial = name.charAt(0).toUpperCase();

          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(name)}
              aria-pressed={isSelected}
              className={`relative overflow-hidden group py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer select-none text-left ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/60 shadow-[0_4px_14px_rgba(245,158,11,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.95)] scale-[1.02]'
                  : 'bg-white/[0.45] hover:bg-white/[0.75] active:scale-95 text-slate-700 hover:text-slate-950 backdrop-blur-md border border-t-white/80 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_6px_rgba(15,23,42,0.03)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Liquid Glass Specular Top Highlight */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/60 via-white/10 to-transparent"
              />

              {/* Initial Avatar */}
              <span
                className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-transform ${
                  isSelected
                    ? 'bg-white text-amber-900 shadow-2xs scale-105'
                    : 'bg-white/70 text-slate-600 border border-white/50 group-hover:scale-105'
                }`}
              >
                {initial}
              </span>

              {/* Cashier Name */}
              <span className="relative z-10 text-xs font-black truncate tracking-tight">
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
