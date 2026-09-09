import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useInRouterContext,
} from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/navigation/AppLayout';
import { TopBar } from './components/navigation/TopBar';
import { ProtectedRoute } from './components/navigation/ProtectedRoute';
import { PosPage } from './pages/PosPage';
import { CustomersPage } from './pages/CustomersPage';
import { HistoryPage } from './pages/HistoryPage';
import { SupervisorPage } from './pages/SupervisorPage';
import { GlassCard } from './components/ui/GlassCard';
import { Lock, Unlock } from 'lucide-react';

export interface AppProps {
  initialEntries?: string[];
}

export function AppContent() {
  const {
    storeSession,
    setStoreSession,
    cashiers,
    setCashiers,
    activeCashier,
    isLocked,
    unlockWithPin,
    isProfileLocked,
  } = useAuthStore();

  const [selectedCashierId, setSelectedCashierId] = useState(activeCashier?.id || '');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Auto-init demo session and cashiers if empty
  useEffect(() => {
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

  useEffect(() => {
    if (activeCashier?.id && !selectedCashierId) {
      setSelectedCashierId(activeCashier.id);
    }
  }, [activeCashier?.id, selectedCashierId]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashierId) {
      setPinError('Seleccione un cajero');
      return;
    }
    if (isProfileLocked(selectedCashierId)) {
      setPinError('Perfil bloqueado por 5 minutos tras 3 intentos fallidos.');
      return;
    }
    const success = unlockWithPin(selectedCashierId, pinInput);
    if (success) {
      setPinInput('');
      setPinError('');
    } else {
      if (isProfileLocked(selectedCashierId)) {
        setPinError('Perfil bloqueado por 5 minutos tras 3 intentos fallidos.');
      } else {
        setPinError('PIN incorrecto. Intente nuevamente.');
      }
    }
  };

  // Unauthenticated or locked state: render Terminal Login PIN screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-between relative overflow-hidden selection:bg-amber-200 selection:text-amber-900">
        {/* Ambient Fluid Lighting */}
        <div className="absolute -top-16 -right-16 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 blur-3xl opacity-60 pointer-events-none animate-pulse duration-1000" />
        <div className="absolute top-1/3 -left-20 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 blur-3xl opacity-55 pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-400 via-emerald-400 to-sky-400 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/40 via-orange-400/35 to-rose-400/40 blur-3xl opacity-45 pointer-events-none" />

        {/* Sticky TopBar */}
        <TopBar />

        {/* PIN Entry Terminal Card */}
        <main className="w-full max-w-md mx-auto p-4 flex-1 flex flex-col items-center justify-center relative z-10 my-auto">
          <GlassCard variant="prominent" className="w-full p-7 text-center space-y-6 shadow-xl">
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
                  className="w-full glass-input text-sm font-medium cursor-pointer"
                >
                  <option value="" className="text-slate-900 bg-white">-- Seleccionar Operador --</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900 bg-white">
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
                      PIN prueba: {cashiers.find((c) => c.id === selectedCashierId)?.pin}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full glass-input text-center text-xl font-bold tracking-widest"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-400/30 text-xs font-semibold text-rose-700 text-center">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full glass-button-primary py-3 font-bold text-base flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <Unlock className="w-5 h-5 text-amber-950" />
                <span>Desbloquear Terminal</span>
              </button>
            </form>
          </GlassCard>
        </main>
      </div>
    );
  }

  // Authenticated state: render navigation shell with routes
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute requiredRole="supervisor" fallbackPath="/pos">
              <SupervisorPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Route>
    </Routes>
  );
}

export default function App({ initialEntries }: AppProps = {}) {
  const isInRouter = useInRouterContext();

  if (isInRouter) {
    return <AppContent />;
  }

  if (initialEntries) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AppContent />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
