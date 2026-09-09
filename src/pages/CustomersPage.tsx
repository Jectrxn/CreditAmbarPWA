import React from 'react';

export const CustomersPage: React.FC = () => {
  return (
    <div data-testid="page-customers" className="w-full max-w-4xl p-4 space-y-4">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clientes</h1>
      <p className="text-sm text-slate-600">Gestión de cuentas corrientes y saldos de clientes.</p>
    </div>
  );
};
