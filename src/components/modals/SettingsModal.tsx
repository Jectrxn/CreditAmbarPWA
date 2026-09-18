import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import { useSettingsStore } from '../../store/settingsStore';
import { triggerHaptic } from '../../utils/haptics';
import { Settings, Save, Smartphone } from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [greeting, setGreeting] = useState(settings.whatsappGreeting);
  const [paymentInfo, setPaymentInfo] = useState(settings.paymentAccountInfo);
  
  useEffect(() => {
    if (isOpen) {
      setGreeting(settings.whatsappGreeting);
      setPaymentInfo(settings.paymentAccountInfo);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    triggerHaptic(20);
    updateSettings({
      whatsappGreeting: greeting,
      paymentAccountInfo: paymentInfo,
    });
    onClose();
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 via-white to-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.1)]">
            <Settings className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Ajustes
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Configuración de la tienda
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end w-full pt-1 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-800 bg-white/[0.60] hover:bg-white/[0.80] active:scale-95 rounded-full border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-950 bg-gradient-to-tr from-emerald-500/95 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 active:scale-95 rounded-full border border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)] transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Plantilla de Cobranza */}
        <div className="p-4 rounded-3xl bg-white/[0.55] backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_6px_18px_-4px_rgba(15,23,42,0.06)]">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-600" /> Plantilla de WhatsApp
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Saludo inicial
              </label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all resize-none"
                placeholder="Ej. Hola {nombre}, te recordamos de {tienda}"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Variables: <span className="font-bold text-amber-700">{'{nombre}'}</span> y <span className="font-bold text-amber-700">{'{tienda}'}</span>
              </p>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Datos de cuenta (Yape / Plin / BCP)
              </label>
              <textarea
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white/[0.60] focus:bg-white/[0.80] backdrop-blur-[16px] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all resize-none"
                placeholder="Ej. Yape/Plin: 999 999 999"
              />
            </div>

            <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
              <p className="text-[10px] font-semibold text-emerald-800 leading-snug">
                <span className="font-black">Previsualización:</span><br/>
                {greeting.replace('{nombre}', 'Carlos').replace('{tienda}', 'Ámbar')} que tienes un saldo pendiente de S/ 15.50. Agradecemos tu pronto pago.
                {paymentInfo ? `\n\n${paymentInfo}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </LiquidModal>
  );
};
