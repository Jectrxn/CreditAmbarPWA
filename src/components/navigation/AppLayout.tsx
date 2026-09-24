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
      className={`min-h-screen text-slate-900 flex flex-col relative overflow-x-clip selection:bg-amber-200 selection:text-amber-900 bg-slate-50 ${className}`}
    >
      {/* Master Organic Amber Liquid Glass Fluid Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-amber-100/30"
        aria-hidden="true"
      >
        {/* Liquid Amber Fluid Waves Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 transition-opacity duration-700"
          style={{ backgroundImage: 'url("/bg-liquid-amber.png")' }}
        />
        {/* Warm ambient overlay — color, not white wash, so glass has something to refract */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/10 via-transparent to-amber-200/30" />
      </div>

      {/* Floating TopBar Container (Aligned with main content column) */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto px-3.5 pt-2 sm:pt-3.5 sticky top-0 z-40">
        <TopBar />
      </div>

      {/* Main Content Column (Unified 390px / max-w-sm sm:max-w-md width) */}
      <main className="flex-1 w-full max-w-sm sm:max-w-md mx-auto px-3.5 py-1.5 relative z-10 pb-28 sm:pb-32 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Floating Bottom TabBar */}
      <TabBar />
    </div>
  );
};
