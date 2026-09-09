import React from 'react';

export const HistoryPage: React.FC = () => {
  return (
    <div data-testid="page-history" className="w-full max-w-4xl p-4 space-y-4">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial</h1>
      <p className="text-sm text-slate-600">Historial de movimientos y auditoría de transacciones.</p>
    </div>
  );
};
