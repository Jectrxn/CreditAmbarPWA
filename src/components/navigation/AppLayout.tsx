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
      className={`min-h-screen bg-slate-100 text-slate-900 flex flex-col relative overflow-hidden selection:bg-amber-200 selection:text-amber-900 ${className}`}
    >
      {/* Ambient Fluid Lighting */}
      <div className="absolute -top-16 -right-16 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 blur-3xl opacity-60 pointer-events-none animate-pulse duration-1000" />
      <div className="absolute top-1/3 -left-20 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 blur-3xl opacity-55 pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-400 via-emerald-400 to-sky-400 blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/40 via-orange-400/35 to-rose-400/40 blur-3xl opacity-45 pointer-events-none" />

      {/* Sticky TopBar */}
      <TopBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10 pb-28 md:pb-24 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Fixed Bottom TabBar */}
      <TabBar />
    </div>
  );
};
