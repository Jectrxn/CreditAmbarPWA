import React, { useState } from 'react';
import { useAuthStore } from './store/authStore';
import { GlassCard } from './components/ui/GlassCard';
import { LiquidGlass } from './components/ui/LiquidGlass';
import { LiquidModal } from './components/ui/LiquidModal';
import { ShieldCheck, UserCheck, Lock, Unlock, CreditCard, Sparkles, Sliders, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const {
    storeSession,
    setStoreSession,
    cashiers,
    setCashiers,
    activeCashier,
    isLocked,
    unlockWithPin,
    isProfileLocked,
    lockSession,
    logoutCashier,
  } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Liquid Glass Optical Parameters (Calibrated to Master Recipe: 2.5rem, 180% sat, inset 3D shadows)
  const [dispScale, setDispScale] = useState(35);
  const [blurAmt, setBlurAmt] = useState(0.25);
  const [saturation, setSaturation] = useState(180);
  const [chromatic, setChromatic] = useState(0);
  const [elasticity, setElasticity] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(40);
  const [borderOp, setBorderOp] = useState(0.30);
  const [showTuning, setShowTuning] = useState(false);
  const [bgPreset, setBgPreset] = useState<'landscape' | 'jewel' | 'minimal'>('landscape');
  const [blurPercent, setBlurPercent] = useState(71); // 71% (-29% calibrated by user = 17px)
  const masterBlurPx = Math.round(24 * (blurPercent / 100));

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 flex flex-col items-center relative overflow-hidden selection:bg-amber-200 selection:text-amber-900">
      {/* Ambient Fluid Lighting (High-saturation organic orbs for authentic iOS glass refraction) */}
      <div className="absolute -top-16 -right-16 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 blur-3xl opacity-60 pointer-events-none animate-pulse duration-1000" />
      <div className="absolute top-1/3 -left-20 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 blur-3xl opacity-55 pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-400 via-emerald-400 to-sky-400 blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/40 via-orange-400/35 to-rose-400/40 blur-3xl opacity-45 pointer-events-none" />


      {/* Top Navigation Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.08] backdrop-blur-[17px] border border-t-white/80 border-x-white/25 border-b-white/15 p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center">
            <img
              src="/logo-ambar.png"
              alt="Ámbar Bodega"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                CreditAmbar
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400/50 font-bold shadow-xs">
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
              <div className="text-xs bg-white/[0.08] backdrop-blur-[17px] px-3.5 py-1.5 rounded-full border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] text-slate-700 font-medium">
                <span className="font-semibold text-slate-900">{activeCashier.name}</span>
                <span className="ml-1 text-xs text-amber-700 font-bold uppercase tracking-wider">({activeCashier.role})</span>
              </div>
              <button
                onClick={lockSession}
                className="glass-pill-button text-xs py-1.5 px-3.5 flex items-center gap-1.5 text-slate-700 hover:text-amber-800 cursor-pointer"
                title="Bloquear sesión"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Bloquear
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-600 bg-white/[0.08] backdrop-blur-[17px] px-3.5 py-1.5 rounded-full border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
              Esperando operador
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl space-y-8 relative z-10">
        {/* Exact Reference Button & Liquid Glass Optical Showcase */}
        <section className="flex flex-col items-center justify-center p-6 md:p-8 rounded-3xl bg-white/20 backdrop-blur-md border border-white/60 shadow-sm text-center space-y-6">
          <div className="flex items-center justify-between w-full max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest text-left">
                Acabado iOS Liquid Glass con Refracción Óptica
              </p>
            </div>
            <button
              onClick={() => setShowTuning(!showTuning)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-xs font-bold text-slate-700 shadow-xs border border-white/80 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>{showTuning ? 'Ocultar Controles' : 'Ajustar Óptica (6 Opciones)'}</span>
            </button>
          </div>

          {/* Collapsible Tuning Sliders (The 6 options from user reference) */}
          {showTuning && (
            <div className="w-full max-w-2xl p-5 rounded-2xl bg-slate-900/90 text-white text-left space-y-4 shadow-xl border border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400">Calibrador de Física Óptica</span>
                <span className="text-[10px] text-slate-400">Los cambios se aplican en vivo</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Displacement Scale */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-sky-400">Displacement Scale: {dispScale}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={dispScale}
                    onChange={(e) => setDispScale(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls the intensity of edge distortion</p>
                </div>

                {/* 2. Blur Amount */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-emerald-400">Blur Amount: {blurAmt}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.01"
                    value={blurAmt}
                    onChange={(e) => setBlurAmt(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls backdrop blur intensity</p>
                </div>

                {/* 3. Saturation */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-purple-400">Saturation: {saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls color saturation of the backdrop</p>
                </div>

                {/* 4. Chromatic Aberration */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-cyan-400">Chromatic Aberration: {chromatic}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={chromatic}
                    onChange={(e) => setChromatic(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls RGB channel separation intensity</p>
                </div>

                {/* 5. Elasticity */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-amber-400">Elasticity: {elasticity}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={elasticity}
                    onChange={(e) => setElasticity(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls how much the glass reaches toward the cursor</p>
                </div>

                {/* 6. Corner Radius */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-pink-400">Corner Radius: {cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="50"
                    value={cornerRadius}
                    onChange={(e) => setCornerRadius(Number(e.target.value))}
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls the roundness of the glass corners</p>
                </div>

                {/* 7. Border Opacity */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold text-white">Border Opacity: {(borderOp * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={borderOp}
                    onChange={(e) => setBorderOp(Number(e.target.value))}
                    className="w-full accent-white cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Controls opacity of the border and specular highlights</p>
                </div>
              </div>
            </div>
          )}

          {/* Preset Background Selector & Quick Optical Blur Adjuster */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl p-2 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs text-xs font-semibold">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 px-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                Fondo:
              </span>
              <button
                type="button"
                onClick={() => setBgPreset('landscape')}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  bgPreset === 'landscape'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                🌄 Paisaje
              </button>
              <button
                type="button"
                onClick={() => setBgPreset('jewel')}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  bgPreset === 'jewel'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                🔮 Joya
              </button>
              <button
                type="button"
                onClick={() => setBgPreset('minimal')}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  bgPreset === 'minimal'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                ☁️ App
              </button>
            </div>

            {/* Quick Blur Adjuster (-29% calibrated by default) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-white/90 shadow-xs text-slate-700">
              <span className="text-slate-500 font-medium">Blur:</span>
              <strong className="text-emerald-700 font-bold">{masterBlurPx}px</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {blurPercent === 71 ? '-29% Calibrado' : `${blurPercent - 100 > 0 ? '+' : ''}${blurPercent - 100}%`}
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setBlurPercent((p) => Math.max(10, p - 3))}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer text-xs"
                  title="Bajar blur"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setBlurPercent(71)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    blurPercent === 71 ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Restablecer a 17px (-29% Calibrado)"
                >
                  17px
                </button>
                <button
                  type="button"
                  onClick={() => setBlurPercent((p) => Math.min(150, p + 3))}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer text-xs"
                  title="Subir blur"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Master Liquid Glass Specification Card (Live Implementation) */}
          <div className="w-full max-w-2xl relative rounded-[3rem] p-3 sm:p-6 overflow-hidden shadow-2xl border border-white/50 transition-all duration-500">
            {/* Background Layer Underneath & Extending Beyond the Card */}
            {bgPreset === 'landscape' && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
                style={{ backgroundImage: `url('/wallpaper-landscape.png')` }}
              >
                <div className="absolute inset-0 bg-black/10" />
              </div>
            )}

            {bgPreset === 'jewel' && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/50 via-fuchsia-500/40 to-rose-500/40 pointer-events-none" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-12 -left-12 w-52 h-52 rounded-full bg-indigo-600/50 blur-xl" />
                  <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-rose-500/45 blur-xl" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-violet-400/35 blur-lg" />
                </div>
              </>
            )}

            {bgPreset === 'minimal' && (
              <div className="absolute inset-0 bg-slate-200/60 pointer-events-none" />
            )}

            <div 
              className="relative overflow-hidden rounded-[2.5rem] border border-t-white/80 border-x-white/25 border-b-white/15 
                        bg-white/[0.07]
                        p-8 backdrop-blur-[17px] backdrop-saturate-[180%]
                        shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_20px_40px_-15px_rgba(0,0,0,0.2)] text-left"
              style={{
                backdropFilter: `blur(${masterBlurPx}px) saturate(${saturation}%)`,
                WebkitBackdropFilter: `blur(${masterBlurPx}px) saturate(${saturation}%)`,
              }}
            >

              {/* Contenido con drop-shadow enfocado en texto para legibilidad y pureza cristalina */}
              <div className="relative z-10 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] text-white">
                    Fórmula Maestra Calibrada
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-white font-semibold px-2.5 py-1 rounded-full bg-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Pure Liquid Glass</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  Liquid Glass Card
                </h2>
                <p className="mt-2 text-sm text-white/95 leading-relaxed max-w-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  Bisel direccional con luz cenital, fondo ultraligero cristalino (7%), sombra especular afilada y hendiduras interiores fluidas.
                </p>

                {/* Píldoras inferiores como hendiduras suaves sin borde exterior */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="px-3 py-2 rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] border-0">
                    <span className="text-white/70 block font-medium">Fondo</span>
                    <strong className="text-white font-bold">bg-white/[0.07]</strong>
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] border-0">
                    <span className="text-white/70 block font-medium">Bisel Luz</span>
                    <strong className="text-white font-bold">border-t-white/80</strong>
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] border-0">
                    <span className="text-white/70 block font-medium">Especular</span>
                    <strong className="text-white font-bold">Inset 1px afilado</strong>
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] border-0">
                    <span className="text-white/70 block font-medium">Hendiduras</span>
                    <strong className="text-white font-bold">Sin bordes ext.</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* 1. User Info Card Replica with Elasticity on Vivid Colorful Background */}
            <div className="relative h-64 rounded-3xl overflow-hidden flex items-center justify-center p-4 shadow-inner bg-slate-950 border border-white/20">
              {/* Vivid Radiant Background Layer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-700 opacity-90" />
              <div className="absolute -top-6 -left-6 w-40 h-40 rounded-full bg-amber-300 blur-2xl opacity-90 animate-pulse" />
              <div className="absolute -bottom-6 -right-6 w-40 h-40 rounded-full bg-lime-400 blur-2xl opacity-80" />
              <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-pink-500 blur-2xl opacity-85" />
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />

              <LiquidGlass
                displacementScale={dispScale}
                blurAmount={blurAmt}
                saturation={saturation}
                chromaticAberration={chromatic}
                elasticity={elasticity}
                cornerRadius={cornerRadius}
                borderOpacity={borderOp}
                className="w-full max-w-[260px] p-4 text-white text-left cursor-crosshair"
              >
                <div className="space-y-2">
                  <h3 className="text-xs font-bold tracking-tight text-white/95">User Info</h3>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center font-bold text-xs text-white">
                      JD
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">John Doe</h4>
                      <p className="text-[10px] text-white/75">Software Engineer</p>
                    </div>
                  </div>
                  <div className="pt-1.5 space-y-1 text-[10px] text-white/85 border-t border-white/15">
                    <div className="flex justify-between">
                      <span className="text-white/60">Email:</span>
                      <span className="font-medium text-white/95">john.doe@example.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Location:</span>
                      <span className="font-medium text-white/95">San Francisco, CA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Joined:</span>
                      <span className="font-medium text-white/95">March 2023</span>
                    </div>
                  </div>
                </div>
              </LiquidGlass>
            </div>

            {/* 2. Bodega Ámbar Branded Version (Amber / Lime / Magenta Backdrop) */}
            <div className="relative h-64 rounded-3xl overflow-hidden flex flex-col items-center justify-center bg-gradient-to-tr from-amber-200 via-amber-300 to-rose-400 shadow-inner p-4">
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gradient-to-br from-amber-600 to-rose-700 shadow-2xl opacity-90" />
              <div className="absolute left-4 bottom-2 w-28 h-28 rounded-full bg-lime-400/60 blur-xl" />

              <LiquidGlass
                displacementScale={dispScale}
                blurAmount={blurAmt}
                saturation={saturation}
                chromaticAberration={chromatic}
                elasticity={elasticity}
                cornerRadius={9999}
                borderOpacity={borderOp}
                className="cursor-pointer active:scale-95"
              >
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-7 py-3 text-slate-950 font-bold text-base flex items-center gap-2"
                >
                  <CreditCard className="w-5 h-5 text-amber-900" />
                  <span className="tracking-tight text-lg">Probar Modal</span>
                </button>
              </LiquidGlass>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            💡 Mueve el cursor sobre las tarjetas para probar la <strong>Elasticidad</strong> y observa la separación cromática en los bordes.
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard variant="prominent" className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-lime-600" />
                  Turno Activo
                </h3>
                <span className="text-xs px-3 py-1 rounded-full bg-lime-500/15 text-lime-800 border border-lime-400/50 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                  En Línea
                </span>
              </div>
              <div className="text-sm text-slate-700 space-y-1.5 glass-well p-4 rounded-2xl">
                <p><span className="text-slate-500 font-medium">Operador:</span> <strong className="text-slate-900">{activeCashier?.name}</strong></p>
                <p><span className="text-slate-500 font-medium">Rol:</span> <span className="capitalize font-bold text-amber-700">{activeCashier?.role}</span></p>
                <p><span className="text-slate-500 font-medium">Sucursal:</span> {storeSession?.storeName}</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="glass-pill-button text-xs py-2 px-4 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Probar Modal
                </button>
                <button
                  onClick={logoutCashier}
                  className="glass-pill-button text-xs py-2 px-4 text-rose-600 hover:text-rose-800 hover:bg-rose-50/50 cursor-pointer"
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
                <div className="p-3 rounded-2xl glass-well">
                  <span className="text-slate-400 block font-medium">Refracción</span>
                  <span className="text-amber-700 font-bold text-sm">Liquid Glass (17px)</span>
                </div>
                <div className="p-3 rounded-2xl glass-well">
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
          <div className="p-3.5 rounded-2xl glass-well border border-amber-400/30 text-xs text-amber-900 font-medium">
            La refracción ahora resalta con la fórmula calibrada a <strong>17px de blur</strong>, bisel especular direccional y tipografía nítida de alto contraste.
          </div>
        </div>
      </LiquidModal>
    </div>
  );
}
