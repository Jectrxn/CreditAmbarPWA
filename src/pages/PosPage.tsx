import React, { useState, useEffect, useMemo } from 'react';
import type { Customer, CreditTransaction } from '../types/database';
import { db } from '../lib/dexie';
import { useSessionStore } from '../features/session/sessionStore';
import { useAuthStore } from '../store/authStore';
import { CashierSessionModal } from '../features/session/CashierSessionModal';
import { TransactionForm } from '../features/transactions/TransactionForm';
import { generateWhatsAppReceipt } from '../features/transactions/whatsappHelper';
import {
  DollarSign,
  QrCode,
  Search,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Lock,
  Wallet,
} from 'lucide-react';

export const PosPage: React.FC = () => {
  const { activeSession } = useSessionStore();
  const { storeSession } = useAuthStore();

  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lastTransaction, setLastTransaction] = useState<CreditTransaction | null>(null);
  const [lastTransactionCustomer, setLastTransactionCustomer] = useState<Customer | null>(null);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const list = await db.customers.toArray();
      setCustomers(list);
    } catch (err) {
      console.error('Error loading customers from Dexie:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const handleTransactionSuccess = async (tx: CreditTransaction) => {
    setLastTransaction(tx);
    setLastTransactionCustomer(selectedCustomer);
    await loadCustomers();
  };

  const handleNewOperation = () => {
    setLastTransaction(null);
    setLastTransactionCustomer(null);
    setSelectedCustomer(null);
  };

  return (
    <div data-testid="page-pos" className="w-full max-w-4xl p-4 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-amber-500" />
            <span>Caja</span>
          </h1>
          <p className="text-sm text-slate-600">
            Registro ágil de cobranzas, pagos y ventas a crédito (fiados).
          </p>
        </div>

        {/* Cashier Session Button */}
        <button
          type="button"
          onClick={() => setIsSessionModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm border ${
            activeSession
              ? 'bg-emerald-500/10 border-emerald-400 text-emerald-900 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-400 text-amber-900 hover:bg-amber-500/20'
          }`}
        >
          {activeSession ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Turno Activo: {activeSession.cashierName}</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Abrir Turno de Caja</span>
            </>
          )}
        </button>
      </div>

      {/* Cashier Session Banner / Summary Card */}
      {!activeSession ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/60 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100/80 rounded-2xl text-amber-700 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Caja cerrada / Sin turno activo</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Para registrar cobros en efectivo con aislamiento FCC, abrí tu turno y declará el fondo inicial.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow transition shrink-0"
          >
            Iniciar Turno / Abrir Caja
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-white/70 border border-white/80 backdrop-blur-md shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Cajero en Turno</span>
              <span className="block text-xs font-bold text-slate-900">{activeSession.cashierName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Gaveta Efectivo (FCC)</span>
              <span className="block text-xs font-bold text-emerald-700">
                ${activeSession.currentCashTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-700">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Recaudación QR</span>
              <span className="block text-xs font-bold text-blue-700">
                ${activeSession.qrPaymentsTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {lastTransaction ? (
        /* Transaction Success & WhatsApp Receipt Card */
        <div className="p-6 rounded-3xl bg-white/80 border border-emerald-300/80 backdrop-blur-xl shadow-lg space-y-5 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">¡Operación Exitosa!</h2>
            <p className="text-xs text-slate-600">
              La transacción ha sido registrada y encolada para sincronización offline-first.
            </p>
          </div>

          {/* Details Pill */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">{lastTransactionCustomer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo de Transacción:</span>
              <span className="font-bold text-slate-900">
                {lastTransaction.type === 'payment' ? 'Abono / Pago' : 'Nuevo Fiado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monto:</span>
              <span className="font-bold text-emerald-700 text-sm">
                ${lastTransaction.total_amount.toFixed(2)}
              </span>
            </div>
            {lastTransactionCustomer && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Saldo pendiente actualizado:</span>
                <span className="font-bold text-slate-900">
                  ${lastTransactionCustomer.balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {lastTransactionCustomer && (
              <a
                href={generateWhatsAppReceipt(
                  lastTransaction,
                  lastTransactionCustomer,
                  storeSession?.storeName || 'CreditAmbar'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Comprobante WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleNewOperation}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-300 rounded-xl shadow-sm transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Nueva Operación</span>
            </button>
          </div>
        </div>
      ) : selectedCustomer ? (
        /* Selected Customer & Transaction Form */
        <div className="p-6 rounded-3xl bg-white/80 border border-white/80 backdrop-blur-xl shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Operación para Cliente</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
            >
              Cambiar Cliente
            </button>
          </div>

          <TransactionForm
            customer={selectedCustomer}
            onSuccess={handleTransactionSuccess}
            onCancel={() => setSelectedCustomer(null)}
          />
        </div>
      ) : (
        /* Customer Search and Selector List */
        <div className="p-5 rounded-3xl bg-white/70 border border-white/80 backdrop-blur-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Seleccionar Cliente</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nombre o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/90 border border-slate-200/80 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* Customer Cards Grid */}
          {isLoadingCustomers ? (
            <div className="py-8 text-center text-xs text-slate-500">Cargando clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-500">No se encontraron clientes para tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredCustomers.map((cust) => {
                const availableCredit = Math.max(0, cust.credit_limit - cust.balance);
                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setSelectedCustomer(cust)}
                    className="p-3.5 text-left rounded-2xl bg-white/80 hover:bg-white border border-slate-200/60 hover:border-amber-400/80 shadow-sm hover:shadow transition flex items-center justify-between group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-900">
                        {cust.name}
                      </p>
                      {cust.phone && <p className="text-[11px] text-slate-500">{cust.phone}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Deuda / Disponible
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span
                          className={`text-xs font-bold ${
                            cust.balance > 0 ? 'text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          ${cust.balance.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-300">/</span>
                        <span className="text-xs font-bold text-emerald-700">
                          ${availableCredit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cashier Session Modal */}
      <CashierSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
      />
    </div>
  );
};
