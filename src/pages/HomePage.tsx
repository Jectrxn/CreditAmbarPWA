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
    <div data-testid="page-home" className="w-full space-y-2.5">
      {/* Date & Quick Badge Row */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5 pt-0.5">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.55] backdrop-blur-[18px] border border-t-white border-x-white/40 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.03)]">
          <Calendar className="w-3.5 h-3.5 text-amber-700" />
          <span className="text-slate-800 font-bold text-[11px]">{currentDateFormatted}</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/[0.55] backdrop-blur-[18px] border border-t-white border-x-white/40 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.03)]">
          <span className="text-slate-800 font-bold text-[11px]">{customers.length} clientes</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cliente para fiar o cobrar..."
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_16px_-4px_rgba(15,23,42,0.06)] focus:outline-none focus:bg-white/[0.85] focus:border-amber-500/60 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200"
        />

        {/* Live Search Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white/[0.92] backdrop-blur-[24px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/40 border-b-white/20 rounded-3xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.22),inset_0_1px_1px_rgba(255,255,255,0.95)] z-30 max-h-60 overflow-y-auto space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No se encontró ningún cliente con ese nombre
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.5] hover:bg-white/[0.9] border border-white/50 transition"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Deuda: <span className="font-bold text-amber-800">S/ {c.balance.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleOpenCreditModal(c);
                      }}
                      className="px-2.5 py-1 text-[10px] font-black text-amber-950 bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-500 rounded-full border border-t-white/80 border-b-amber-500/50 shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                      + Fiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleOpenPaymentModal(c);
                      }}
                      className="px-2.5 py-1 text-[10px] font-black text-emerald-950 bg-gradient-to-b from-emerald-300 to-emerald-400 hover:from-emerald-300 hover:to-emerald-500 rounded-full border border-t-white/80 border-b-emerald-500/50 shadow-2xs transition active:scale-95 cursor-pointer"
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

      {/* Hero Card: TOTAL POR COBRAR (Authentic Dark Liquid Glass) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-amber-950/85 backdrop-blur-[24px] backdrop-saturate-[190%] p-4 text-white border border-t-white/30 border-x-white/15 border-b-white/5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.35),0_8px_20px_-4px_rgba(15,23,42,0.15),inset_0_1.5px_2px_rgba(255,255,255,0.35)] space-y-2.5">
        {/* Specular Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-amber-400 uppercase">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>Total por Cobrar</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-2xs backdrop-blur-md">
            • {stats.pendingAccountsCount} cuentas pendientes
          </span>
        </div>

        <div className="relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400/90">S/</span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]">
              {stats.totalReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-300/80 mt-0.5">
            Total fiado histórico: <span className="text-white font-bold">S/ {stats.totalFiadoHistorico.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Mini stats row (Dark Glass Wells) */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-1.5 border-t border-white/10">
          <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Clientes</span>
              <span className="text-xs font-black text-white">{stats.totalCustomers} registrados</span>
            </div>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Cobrado Total</span>
              <span className="text-xs font-black text-emerald-400">
                S/ {stats.totalCobradoHistorico.toFixed(2)}
              </span>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Daily Metrics: Fiado Hoy vs Cobrado Hoy */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative overflow-hidden p-3 rounded-2xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center gap-2.5">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/5 to-transparent rounded-t-[inherit]" />
          <div className="relative z-10 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 backdrop-blur-md flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="relative z-10 min-w-0">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider truncate">
              Fiado Hoy
            </span>
            <span className="block text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
              S/ {stats.fiadoHoy.toFixed(2)}
            </span>
            <span className="block text-[9px] text-slate-500 font-semibold truncate">
              {stats.fiadoHoyCount} {stats.fiadoHoyCount === 1 ? 'venta hoy' : 'ventas hoy'}
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden p-3 rounded-2xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center gap-2.5">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/5 to-transparent rounded-t-[inherit]" />
          <div className="relative z-10 w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-md flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="relative z-10 min-w-0">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider truncate">
              Cobrado Hoy
            </span>
            <span className="block text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
              S/ {stats.cobradoHoy.toFixed(2)}
            </span>
            <span className="block text-[9px] text-slate-500 font-semibold truncate">
              {stats.cobradoHoyCount} {stats.cobradoHoyCount === 1 ? 'abono hoy' : 'abonos hoy'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons (Single + in Nuevo Fiado) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOpenCreditModal()}
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-3 px-3 rounded-full bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/90 backdrop-blur-[16px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 text-slate-950 font-black text-xs sm:text-sm shadow-[0_8px_20px_-3px_rgba(245,158,11,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer group"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-full" />
          <Plus className="relative z-10 w-4 h-4 stroke-[3.5] transition-transform group-hover:scale-110" />
          <span className="relative z-10">Nuevo Fiado</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenPaymentModal()}
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-3 px-3 rounded-full bg-gradient-to-b from-emerald-500/95 via-emerald-600/90 to-emerald-700/90 backdrop-blur-[16px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-emerald-800/50 text-white font-black text-xs sm:text-sm shadow-[0_8px_20px_-3px_rgba(16,185,129,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(6,95,70,0.25)] hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.97] transition-all cursor-pointer group"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-full" />
          <CheckCircle2 className="relative z-10 w-4 h-4 stroke-[2.5] transition-transform group-hover:scale-110" />
          <span className="relative z-10">Registrar Abono</span>
        </button>
      </div>

      {/* Mayores Deudas Pendientes */}
      <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-[inherit]" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-slate-900 uppercase">
            <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-700 flex items-center justify-center border border-rose-400/30">
              <AlertTriangle className="w-3 h-3" />
            </div>
            <span>Mayores Deudas Pendientes</span>
          </div>

          {stats.topDebtors.length > 0 && (
            <Link
              to="/customers"
              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 group"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="relative z-10 py-3 text-center text-xs font-medium text-slate-500">Cargando deudas...</div>
        ) : stats.topDebtors.length === 0 ? (
          <div className="relative z-10 py-4 px-3 text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-800">¡Cuentas al día!</p>
            <p className="text-[11px] text-slate-500">No hay deudas pendientes registradas en este momento.</p>
          </div>
        ) : (
          <div className="relative z-10 space-y-1.5">
            {stats.topDebtors.map((debtor, index) => {
              const maxCredit = debtor.credit_limit || 100;
              const ratio = Math.min(100, Math.round((debtor.balance / maxCredit) * 100));

              return (
                <div
                  key={debtor.id}
                  className="p-2.5 rounded-2xl bg-white/[0.55] hover:bg-white/[0.80] backdrop-blur-md border border-t-white border-x-white/50 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(15,23,42,0.03)] flex items-center justify-between gap-2 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 border border-white/80 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{debtor.name}</p>
                        {debtor.balance > 100 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-800 border border-rose-400/30 uppercase">
                            Antigua
                          </span>
                        )}
                      </div>
                      {/* Debt progress bar */}
                      <div className="w-20 h-1 bg-slate-200/80 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="block text-xs font-black text-rose-600 drop-shadow-2xs">
                        S/ {debtor.balance.toFixed(2)}
                      </span>
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                        Pendiente
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(debtor)}
                      className="relative overflow-hidden px-3 py-1 text-[11px] font-black text-emerald-950 bg-gradient-to-b from-emerald-400/90 to-emerald-500/80 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 border-t border-t-white/90 border-x-white/30 border-b-emerald-600/40 rounded-full transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(16,185,129,0.2)] cursor-pointer"
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
