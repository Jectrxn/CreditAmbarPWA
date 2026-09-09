import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import backgroundCirclesImg from '../../assets/background-circles.png';

export interface AppLayoutProps {
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ className = '' }) => {
  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col relative overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 ${className}`}
    >
      {/* Background with Ambient Softening */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-slate-50"
        aria-hidden="true"
      >
        <img
          src={backgroundCirclesImg}
          alt=""
          className="w-full h-full object-cover object-top sm:object-center opacity-90"
        />
        {/* Soft glass ambient overlay for high readability */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
      </div>

      {/* Floating TopBar */}
      <TopBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-4 py-1 relative z-10 pb-28 sm:pb-32 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Floating Bottom TabBar */}
      <TabBar />
    </div>
  );
};
