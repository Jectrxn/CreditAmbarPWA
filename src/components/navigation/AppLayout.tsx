import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';

export interface AppLayoutProps {
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ className = '' }) => {
  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col relative overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 bg-slate-50 ${className}`}
    >
      {/* Liquid Glass Volumetric Ambient Fluid Mesh Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-gradient-to-b from-amber-50/60 via-slate-100/80 to-rose-50/50"
        aria-hidden="true"
      >
        {/* Deep Volumetric Gaussian Fluid Light Orbs */}
        <div className="absolute -top-32 -right-20 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-amber-400/35 via-orange-400/25 to-rose-400/30 blur-[120px] animate-pulse duration-1000" />
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-violet-500/25 via-fuchsia-400/20 to-pink-400/25 blur-[130px]" />
        <div className="absolute top-2/3 -right-28 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-emerald-400/25 via-teal-300/20 to-sky-400/25 blur-[120px]" />
        <div className="absolute -bottom-28 left-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-amber-300/30 via-rose-300/25 to-purple-400/20 blur-[110px]" />

        {/* Liquid Glass Specular Surface Filter */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
      </div>

      {/* Floating TopBar Container (Aligned with main content column) */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto px-3.5 pt-2 sm:pt-3.5 sticky top-0 z-40">
        <TopBar />
      </div>

      {/* Main Content Column (Unified 390px / max-w-sm sm:max-w-md width) */}
      <main className="flex-1 w-full max-w-sm sm:max-w-md mx-auto px-3.5 py-1.5 relative z-10 pb-24 sm:pb-28 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Floating Bottom TabBar */}
      <TabBar />
    </div>
  );
};
