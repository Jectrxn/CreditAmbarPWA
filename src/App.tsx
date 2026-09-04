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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {/* Top Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center backdrop-blur-md">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              CreditAmbar <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PWA</span>
            </h1>
            <p className="text-xs text-slate-400">
              {storeSession ? storeSession.storeName : 'Dispositivo no vinculado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCashier ? (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-white/10 text-slate-300">
                {activeCashier.name} ({activeCashier.role})
              </span>
              <button
                onClick={lockSession}
                className="glass-button text-xs py-1.5 px-2.5 flex items-center gap-1.5 text-amber-300"
                title="Bloquear sesión"
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquear
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Sin sesión activa</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl space-y-6">
        {/* Active Cashier or Lock Screen */}
        {isLocked ? (
          <GlassCard variant="prominent" className="max-w-md mx-auto p-6 text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Terminal Bloqueada</h2>
              <p className="text-xs text-slate-400 mt-1">
                Seleccione su perfil e ingrese su PIN de cajero para operar
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cajero / Operador</label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="w-full glass-input text-sm bg-slate-900/90 text-white"
                >
                  <option value="">-- Seleccionar --</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full glass-input text-center text-lg tracking-widest"
                />
              </div>

              {pinError && <p className="text-xs text-rose-400 text-center">{pinError}</p>}

              <button type="submit" className="w-full glass-button bg-indigo-600/40 hover:bg-indigo-600/60 border-indigo-500/40 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" /> Desbloquear
              </button>
            </form>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard variant="prominent" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  Sesión de Operador Activa
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  En Línea
                </span>
              </div>
              <div className="text-sm text-slate-300 space-y-1">
                <p><span className="text-slate-400">Operador:</span> {activeCashier?.name}</p>
                <p><span className="text-slate-400">Rol:</span> <span className="capitalize">{activeCashier?.role}</span></p>
                <p><span className="text-slate-400">Sucursal:</span> {storeSession?.storeName}</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="glass-button text-xs flex items-center gap-2 bg-indigo-500/30 hover:bg-indigo-500/50 border-indigo-400/40"
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  Abrir Modal Liquid Glass
                </button>
                <button
                  onClick={logoutCashier}
                  className="glass-button text-xs text-slate-300 hover:text-rose-300"
                >
                  Cerrar Turno
                </button>
              </div>
            </GlassCard>

            <GlassCard variant="default" glow className="space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Liquid Glass UI & PWA Ready
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                El sistema adopta el lenguaje visual Liquid Glass con soporte de desenfoque translúcido,
                reflejos dinámicos y adaptación responsiva a orientación horizontal y vertical.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block">Backdrop Blur</span>
                  <span className="text-emerald-400 font-medium">Activo (16px)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block">Modo Compartido</span>
                  <span className="text-indigo-400 font-medium">PIN Rápido</span>
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
        title="Liquid Glass Modal"
        footer={
          <button
            onClick={() => setIsModalOpen(false)}
            className="glass-button text-xs py-1.5 px-4"
          >
            Entendido
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Este modal implementa el efecto translúcido con desenfoque de fondo y borde reflectante.
            En navegadores sin soporte para <code className="text-indigo-300 bg-white/5 px-1 py-0.5 rounded">backdrop-filter</code>,
            se aplica un degradado semitransparente sólido como fallback garantizando legibilidad.
          </p>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            Orientación adaptativa: se reacomoda verticalmente en móviles y en cuadrícula compacta en modo apaisado.
          </div>
        </div>
      </LiquidModal>
    </div>
  );
}
