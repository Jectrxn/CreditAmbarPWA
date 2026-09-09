import React from 'react';

export const SupervisorPage: React.FC = () => {
  return (
    <div data-testid="page-supervisor" className="w-full max-w-4xl p-4 space-y-4">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supervisor</h1>
      <p className="text-sm text-slate-600">Panel de control, arqueo y métricas de supervisión.</p>
    </div>
  );
};
