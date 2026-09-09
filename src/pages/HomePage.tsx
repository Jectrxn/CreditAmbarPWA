import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Customer, CreditTransaction } from '../types/database';
import { db } from '../lib/dexie';
import {
  Search,
  Users,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Wallet,
} from 'lucide-react';
import { QuickCreditModal } from '../components/modals/QuickCreditModal';
import { QuickPaymentModal } from '../components/modals/QuickPaymentModal';

export const HomePage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState<Customer | undefined>(undefined);

  const loadData = async () => {
    try {
      const [allCustomers, allTransactions] = await Promise.all([
        db.customers.toArray(),
        db.creditTransactions.toArray(),
      ]);
      setCustomers(allCustomers);
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregated calculations
  const stats = useMemo(() => {
    const totalReceivable = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    const pendingAccountsCount = customers.filter((c) => c.balance > 0).length;

    // Filter today's transactions
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter((t) => {
      const txDate = new Date(t.created_at);
      return txDate >= startOfToday;
    });

    const fiadoHoy = todayTransactions
      .filter((t) => t.type === 'credit_purchase' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.total_amount, 0);
    const fiadoHoyCount = todayTransactions.filter(
      (t) => t.type === 'credit_purchase' && t.status !== 'cancelled'
    ).length;

    const cobradoHoy = todayTransactions
      .filter((t) => t.type === 'payment' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.total_amount, 0);
    const cobradoHoyCount = todayTransactions.filter(
      (t) => t.type === 'payment' && t.status !== 'cancelled'
    ).length;

    const totalCobradoHistorico = transactions
      .filter((t) => t.type === 'payment' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.total_amount, 0);

    const totalFiadoHistorico = transactions
      .filter((t) => t.type === 'credit_purchase' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.total_amount, 0);

    // Top debtors (sorted by highest balance)
    const topDebtors = [...customers]
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    return {
      totalReceivable,
      pendingAccountsCount,
      totalCustomers: customers.length,
      fiadoHoy,
      fiadoHoyCount,
      cobradoHoy,
      cobradoHoyCount,
      totalCobradoHistorico,
      totalFiadoHistorico,
      topDebtors,
    };
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, searchQuery]);

  const handleOpenCreditModal = (cust?: Customer) => {
    setModalCustomer(cust);
    setIsCreditModalOpen(true);
  };

  const handleOpenPaymentModal = (cust?: Customer) => {
    setModalCustomer(cust);
    setIsPaymentModalOpen(true);
  };

  const handleTransactionSuccess = () => {
    loadData();
  };

  const currentDateFormatted = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    const str = d.toLocaleDateString('es-PE', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  return (
    <div data-testid="page-home" className="w-full max-w-xl mx-auto p-4 space-y-5 pb-24">
      {/* Date & Quick Badge Row */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-white/80 backdrop-blur-md shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>{currentDateFormatted}</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/70 border border-white/80 backdrop-blur-md shadow-xs">
          <span>{customers.length} clientes</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cliente para fiar o cobrar..."
          className="w-full pl-11 pr-4 py-3.5 text-sm bg-white/80 border border-white/90 backdrop-blur-md rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        {/* Live Search Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No se encontró ningún cliente con ese nombre
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Deuda: <span className="font-semibold text-amber-800">S/ {c.balance.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleOpenCreditModal(c);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                    >
                      + Fiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleOpenPaymentModal(c);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
                    >
                      Cobrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Hero Card: TOTAL POR COBRAR (Dark Liquid Glass) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white shadow-xl border border-white/20 backdrop-blur-xl space-y-4">
        {/* Glow circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-400 uppercase">
            <Wallet className="w-4 h-4" />
            <span>Total por Cobrar</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            • {stats.pendingAccountsCount} cuentas pendientes
          </span>
        </div>

        <div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-amber-400">
            S/ {stats.totalReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total fiado histórico: S/ {stats.totalFiadoHistorico.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Clientes</span>
              <span className="text-xs font-bold text-white">{stats.totalCustomers} registrados</span>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Cobrado Total</span>
              <span className="text-xs font-bold text-emerald-400">
                S/ {stats.totalCobradoHistorico.toFixed(2)}
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Daily Metrics: Fiado Hoy vs Cobrado Hoy */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-white/70 border border-white/80 backdrop-blur-md shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Fiado Hoy
            </span>
            <span className="block text-base font-black text-slate-900">
              S/ {stats.fiadoHoy.toFixed(2)}
            </span>
            <span className="block text-[10px] text-slate-500">
              {stats.fiadoHoyCount} {stats.fiadoHoyCount === 1 ? 'venta hoy' : 'ventas hoy'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 border border-white/80 backdrop-blur-md shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cobrado Hoy
            </span>
            <span className="block text-base font-black text-slate-900">
              S/ {stats.cobradoHoy.toFixed(2)}
            </span>
            <span className="block text-[10px] text-slate-500">
              {stats.cobradoHoyCount} {stats.cobradoHoyCount === 1 ? 'abono hoy' : 'abonos hoy'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOpenCreditModal()}
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>+ Nuevo Fiado</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenPaymentModal()}
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>Registrar Abono</span>
        </button>
      </div>

      {/* Mayores Deudas Pendientes */}
      <div className="p-5 rounded-3xl bg-white/70 border border-white/80 backdrop-blur-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black tracking-wide text-slate-900 uppercase">
            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span>Mayores Deudas Pendientes</span>
          </div>
          <Link
            to="/customers"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-500">Cargando deudas...</div>
        ) : stats.topDebtors.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            ¡Excelente! No hay deudas pendientes registradas.
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.topDebtors.map((debtor, index) => {
              const maxCredit = debtor.credit_limit || 100;
              const ratio = Math.min(100, Math.round((debtor.balance / maxCredit) * 100));

              return (
                <div
                  key={debtor.id}
                  className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/70 flex items-center justify-between gap-3 hover:border-amber-400/80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{debtor.name}</p>
                        {debtor.balance > 100 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 uppercase">
                            Antigua
                          </span>
                        )}
                      </div>
                      {/* Debt progress bar */}
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="block text-xs font-black text-rose-600">
                        S/ {debtor.balance.toFixed(2)}
                      </span>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Pendiente
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(debtor)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                      Abonar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Modals */}
      <QuickCreditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        customer={modalCustomer}
        onSuccess={handleTransactionSuccess}
      />

      <QuickPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={modalCustomer}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
};
