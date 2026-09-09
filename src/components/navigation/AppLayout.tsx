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
      className={`min-h-screen text-slate-900 flex flex-col relative overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 ${className}`}
    >
      {/* Liquid Glass Fluid Mesh Gradient Ambient Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-slate-100/90"
        aria-hidden="true"
      >
        {/* Ambient Fluid Diffusion Orbs (Soft Gaussian Mesh) */}
        <div className="absolute -top-24 -right-16 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-amber-400/40 via-orange-400/30 to-rose-400/35 blur-[95px] animate-pulse duration-1000" />
        <div className="absolute top-1/4 -left-28 w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-violet-500/30 via-fuchsia-400/25 to-pink-400/30 blur-[105px]" />
        <div className="absolute top-2/3 -right-24 w-[480px] h-[480px] rounded-full bg-gradient-to-tl from-emerald-400/30 via-teal-300/25 to-sky-400/30 blur-[95px]" />
        <div className="absolute -bottom-24 left-10 w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-amber-300/35 via-rose-300/30 to-purple-400/25 blur-[90px]" />
        {/* Specular overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]" />
      </div>

      {/* Floating TopBar */}
      <TopBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-sm sm:max-w-md mx-auto px-3 py-1 relative z-10 pb-28 sm:pb-32 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Floating Bottom TabBar */}
      <TabBar />
    </div>
  );
};
