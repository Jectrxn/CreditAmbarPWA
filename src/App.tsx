import React, { useState } from 'react';
import { useAuthStore } from './store/authStore';
import { GlassCard } from './components/ui/GlassCard';
import { LiquidModal } from './components/ui/LiquidModal';
import { ShieldCheck, UserCheck, Lock, Unlock, CreditCard, Sparkles } from 'lucide-react';

export default function App() {
  const {
    storeSession,
    setStoreSession,
    cashiers,
    setCashiers,
    activeCashier,
    isLocked,
    unlockWithPin,
    lockSession,
    logoutCashier,
  } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Auto-init demo session and cashiers if empty
  React.useEffect(() => {
    if (!storeSession) {
      setStoreSession({
        storeId: 'demo-store-1',
        storeName: 'Fiambrería El Ámbar',
        authenticatedAt: new Date().toISOString(),
      });
    }

    if (cashiers.length === 0) {
      setCashiers([
        { id: 'c-1', name: 'Laura Gómez', role: 'cajero', pin: '1234' },
        { id: 'c-2', name: 'Marcos Rivas', role: 'supervisor', pin: '4321' },
        { id: 'c-3', name: 'Don Roberto', role: 'jefe', pin: '9999' },
      ]);
    }
  }, [storeSession, cashiers.length, setStoreSession, setCashiers]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashierId) {
      setPinError('Seleccione un cajero');
      return;
    }
    const success = unlockWithPin(selectedCashierId, pinInput);
    if (success) {
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN incorrecto. Intente nuevamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 flex flex-col items-center relative overflow-hidden selection:bg-amber-200 selection:text-amber-900">
      {/* Ambient Fluid Lighting (The secret to realistic Liquid Glass refraction) */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/25 blur-3xl pointer-events-none animate-pulse duration-1000" />
      <div className="absolute top-1/4 -left-28 w-96 h-96 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-12 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-1.5 shadow-sm flex items-center justify-center">
            <img
              src="/logo-ambar.png"
              alt="Ámbar Bodega"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                CreditAmbar
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70 font-semibold shadow-xs">
                PWA
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              {storeSession ? storeSession.storeName : 'Dispositivo no vinculado'} • Bodega & Fiambrería
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCashier ? (
            <div className="flex items-center gap-2">
              <div className="text-xs bg-white/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/80 shadow-xs text-slate-700 font-medium">
                <span className="font-semibold text-slate-900">{activeCashier.name}</span>
                <span className="ml-1 text-xs text-amber-700 font-bold uppercase tracking-wider">({activeCashier.role})</span>
              </div>
              <button
                onClick={lockSession}
                className="glass-pill-button text-xs py-1.5 px-3.5 flex items-center gap-1.5 text-slate-700 hover:text-amber-800"
                title="Bloquear sesión"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Bloquear
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-500 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/70">
              Esperando operador
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl space-y-8 relative z-10">
        {/* Exact Reference Button Optical Showcase */}
        <section className="flex flex-col items-center justify-center p-6 md:p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/80 shadow-sm text-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Comparativa Directa de Acabado iOS Liquid Glass
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* 1. Exact Replica of User Reference Image (Blue / Aqua Backdrop) */}
            <div className="relative h-48 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-tr from-teal-200 via-sky-300 to-blue-600 shadow-inner p-4">
              {/* Deep Satin Royal Blue Disc intersecting the button */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-blue-700 to-indigo-950 shadow-2xl opacity-90" />
              <div className="absolute left-4 bottom-2 w-28 h-28 rounded-full bg-emerald-300/60 blur-xl" />

              {/* Exact Pill Button Replica from Reference Image */}
              <button className="glass-pill-button text-slate-950 font-bold px-8 py-3 text-base shadow-2xl relative z-10 hover:scale-105 active:scale-95 transition-all">
                {/* Hand-drawn squiggly mark like reference image */}
                <svg className="w-6 h-4 text-slate-950 stroke-[2.5]" fill="none" viewBox="0 0 24 16" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c3-8 5-8 8 0s5 8 8 0 3-4 4-2" />
                </svg>
                <span className="tracking-tight text-lg">Button</span>
              </button>
            </div>

            {/* 2. Bodega Ámbar Branded Version (Amber / Lime / Magenta Backdrop) */}
            <div className="relative h-48 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-tr from-amber-200 via-amber-300 to-rose-400 shadow-inner p-4">
              {/* Brand color sphere */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-amber-600 to-rose-700 shadow-2xl opacity-90" />
              <div className="absolute left-4 bottom-2 w-28 h-28 rounded-full bg-lime-400/60 blur-xl" />

              {/* Pill button for Ámbar */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="glass-pill-button text-slate-950 font-bold px-7 py-3 text-base shadow-2xl relative z-10 hover:scale-105 active:scale-95 transition-all"
              >
                <CreditCard className="w-5 h-5 text-amber-900" />
                <span className="tracking-tight text-lg">Probar Modal</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Fíjate cómo el cristal refracta la esfera oscura de fondo a través del cuerpo del botón, manteniendo el borde iluminado.
          </p>
        </section>

        {/* Terminal Login or Active Session */}
        {isLocked ? (
          <GlassCard variant="prominent" className="max-w-md mx-auto p-7 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Terminal de Tienda</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Seleccione su nombre e introduzca su PIN para operar
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Operador / Cajero
                </label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => {
                    setSelectedCashierId(e.target.value);
                    setPinError('');
                  }}
                  className="w-full glass-input text-sm font-medium bg-white/80 text-slate-900 cursor-pointer"
                >
                  <option value="">-- Seleccionar Operador --</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900">
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Código PIN
                  </label>
                  {selectedCashierId && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      PIN prueba: {cashiers.find(c => c.id === selectedCashierId)?.pin}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full glass-input text-center text-xl font-bold tracking-widest bg-white/80 text-slate-900"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 text-center">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full glass-button-primary py-3 font-bold text-base flex items-center justify-center gap-2 mt-2"
              >
                <Unlock className="w-5 h-5 text-amber-950" />
                <span>Desbloquear Terminal</span>
              </button>
            </form>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard variant="prominent" className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-lime-600" />
                  Turno Activo
                </h3>
                <span className="text-xs px-3 py-1 rounded-full bg-lime-100 text-lime-800 border border-lime-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                  En Línea
                </span>
              </div>
              <div className="text-sm text-slate-700 space-y-1.5 bg-white/40 p-4 rounded-2xl border border-white/80">
                <p><span className="text-slate-500 font-medium">Operador:</span> <strong className="text-slate-900">{activeCashier?.name}</strong></p>
                <p><span className="text-slate-500 font-medium">Rol:</span> <span className="capitalize font-bold text-amber-700">{activeCashier?.role}</span></p>
                <p><span className="text-slate-500 font-medium">Sucursal:</span> {storeSession?.storeName}</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="glass-pill-button text-xs py-2 px-4"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Probar Modal
                </button>
                <button
                  onClick={logoutCashier}
                  className="glass-pill-button text-xs py-2 px-4 text-rose-600 hover:text-rose-800 hover:bg-rose-50/50"
                >
                  Cerrar Turno
                </button>
              </div>
            </GlassCard>

            <GlassCard variant="default" glow className="space-y-4 p-6">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Estilo iOS Liquid Glass
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Superficies translúcidas en color claro con refracción de luz sobre los colores de la marca
                (ámbar dorado, fucsia y lima).
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-2xl bg-white/70 border border-white/90 shadow-xs">
                  <span className="text-slate-400 block font-medium">Refracción</span>
                  <span className="text-amber-700 font-bold text-sm">Light Glass (24px)</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/70 border border-white/90 shadow-xs">
                  <span className="text-slate-400 block font-medium">Modo Tienda</span>
                  <span className="text-lime-700 font-bold text-sm">PIN Rápido</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </main>

      {/* Modal Demo */}
      <LiquidModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal iOS Liquid Glass"
        footer={
          <button
            onClick={() => setIsModalOpen(false)}
            className="glass-pill-button text-xs py-2 px-5 font-bold"
          >
            Entendido
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            Este diálogo implementa el acabado translúcido con desenfoque de fondo y borde especular reflectante sobre fondo claro.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-medium">
            La refracción ahora resalta con los tonos cálidos del logo de <strong>Ámbar Bodega</strong> y tipografía nítida de alto contraste.
          </div>
        </div>
      </LiquidModal>
    </div>
  );
}
