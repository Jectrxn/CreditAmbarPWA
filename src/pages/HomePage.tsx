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
  Wallet,
  ShieldCheck,
  MessageCircle,
  X,
  Hash,
  Clock,
  Sparkles,
} from 'lucide-react';
import { QuickCreditModal } from '../components/modals/QuickCreditModal';
import { QuickPaymentModal } from '../components/modals/QuickPaymentModal';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { generateWhatsAppPaymentReminder } from '../features/transactions/whatsappHelper';

export const HomePage: React.FC = () => {
  const { storeSession } = useAuthStore();
  const setTabBarHidden = useUIStore((s) => s.setTabBarHidden);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNumericMode, setIsNumericMode] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'debt' | 'clean'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recent customer searches stored in localStorage
  const RECENT_CUSTOMERS_KEY = 'creditambar_recent_customer_ids';
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_CUSTOMERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentCustomer = (customerId: string) => {
    setRecentCustomerIds((prev) => {
      const updated = [customerId, ...prev.filter((id) => id !== customerId)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentCustomerIds([]);
    try {
      localStorage.removeItem(RECENT_CUSTOMERS_KEY);
    } catch {
      // ignore
    }
  };

  // Modals state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState<Customer | undefined>(undefined);

  useEffect(() => {
    if (isSearchFocused || searchQuery.trim().length > 0) {
      setTabBarHidden(true);
    } else {
      setTabBarHidden(false);
    }
    return () => {
      setTabBarHidden(false);
    };
  }, [isSearchFocused, searchQuery, setTabBarHidden]);

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
    const totalReceivable = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
    const pendingAccountsCount = customers.filter((c) => (c.balance || 0) > 0).length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTxs = transactions.filter(
      (t) => new Date(t.created_at) >= startOfToday && t.status !== 'cancelled'
    );

    const fiadoHoy = todayTxs
      .filter((t) => t.type === 'credit_purchase')
      .reduce((acc, t) => acc + t.total_amount, 0);
    const fiadoHoyCount = todayTxs.filter((t) => t.type === 'credit_purchase').length;

    const cobradoHoy = todayTxs
      .filter((t) => t.type === 'payment')
      .reduce((acc, t) => acc + t.total_amount, 0);
    const cobradoHoyCount = todayTxs.filter((t) => t.type === 'payment').length;

    const totalFiadoHistorico = transactions
      .filter((t) => t.type === 'credit_purchase' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + t.total_amount, 0);

    const totalCobradoHistorico = transactions
      .filter((t) => t.type === 'payment' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + t.total_amount, 0);

    // Top debtors (sorted by highest balance)
    const topDebtors = [...customers]
      .filter((c) => (c.balance || 0) > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    return {
      totalReceivable,
      pendingAccountsCount,
      fiadoHoy,
      fiadoHoyCount,
      cobradoHoy,
      cobradoHoyCount,
      totalFiadoHistorico,
      totalCobradoHistorico,
      totalCustomers: customers.length,
      topDebtors,
    };
  }, [customers, transactions]);

  // Filtered customers according to search query and active filter chip
  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (filterMode === 'debt') {
      result = result.filter((c) => (c.balance || 0) > 0);
    } else if (filterMode === 'clean') {
      result = result.filter((c) => (c.balance || 0) <= 0);
    }

    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return result
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.toLowerCase().includes(query))
      )
      .sort((a, b) => (b.balance || 0) - (a.balance || 0));
  }, [customers, searchQuery, filterMode]);

  // Suggested / Recent customers when search query is empty but input has focus
  const suggestedCustomers = useMemo(() => {
    let baseList: Customer[] = [];

    if (recentCustomerIds.length > 0) {
      baseList = recentCustomerIds
        .map((id) => customers.find((c) => c.id === id))
        .filter((c): c is Customer => Boolean(c));
    }

    // If no recents or not enough, fill with top debtors or top customers
    if (baseList.length < 3) {
      const existingIds = new Set(baseList.map((c) => c.id));
      const additional = [...customers]
        .filter((c) => !existingIds.has(c.id))
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));
      baseList = [...baseList, ...additional].slice(0, 4);
    }

    if (filterMode === 'debt') {
      return baseList.filter((c) => (c.balance || 0) > 0);
    } else if (filterMode === 'clean') {
      return baseList.filter((c) => (c.balance || 0) <= 0);
    }

    return baseList.slice(0, 4);
  }, [customers, recentCustomerIds, filterMode]);

  const handleOpenCreditModal = (customer?: Customer) => {
    setModalCustomer(customer);
    setIsCreditModalOpen(true);
  };

  const handleOpenPaymentModal = (customer?: Customer) => {
    setModalCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handleTransactionSuccess = () => {
    loadData();
    setToastMessage('¡Operación registrada con éxito!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    setTabBarHidden(false);
    setFilterMode('all');
  };

  return (
    <div data-testid="page-home" className="w-full space-y-2.5">
      {/* Transaction Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-600/95 text-white font-black text-xs shadow-xl backdrop-blur-md flex items-center gap-2 border border-white/40 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search Backdrop Scrim to isolate search and prevent overlapping HeroCard */}
      {(searchQuery.trim() || isSearchFocused) && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-[3px] animate-in fade-in duration-200"
          onClick={handleClearSearch}
        />
      )}

      {/* Global Search Bar */}
      <div className="relative z-30">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        {/* Top Specular Rim for search input */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full bg-gradient-to-b from-white/60 via-white/10 to-transparent"
        />
        <input
          type={isNumericMode ? 'tel' : 'text'}
          inputMode={isNumericMode ? 'tel' : 'text'}
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsSearchFocused(false);
            }, 250);
          }}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isNumericMode ? "Buscar por teléfono o número..." : "Buscar cliente para fiar o cobrar..."}
          className="w-full pl-10 pr-20 py-2.5 text-xs sm:text-sm bg-white/[0.55] hover:bg-white/[0.65] focus:bg-white/[0.75] backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-6px_rgba(15,23,42,0.06)] focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-300/30 focus:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_12px_28px_-4px_rgba(245,158,11,0.18)] transition-all duration-300"
        />

        {/* Numeric / Text Mode Toggle Button */}
        <button
          type="button"
          onClick={() => setIsNumericMode((prev) => !prev)}
          title={isNumericMode ? 'Cambiar a teclado normal' : 'Cambiar a teclado numérico (teléfono/código)'}
          aria-label={isNumericMode ? 'Teclado alfanumérico' : 'Teclado numérico'}
          className={`absolute right-9 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight transition-all duration-200 cursor-pointer z-10 flex items-center gap-0.5 ${
            isNumericMode
              ? 'bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-200 text-amber-950 border border-t-white/95 border-b-amber-500/40 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_8px_rgba(245,158,11,0.35)] scale-105'
              : 'bg-white/40 hover:bg-white/70 text-slate-500 hover:text-amber-800 border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]'
          }`}
        >
          <Hash className="w-2.5 h-2.5 stroke-[3]" />
          <span>123</span>
        </button>

        {(searchQuery || isSearchFocused) && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 active:scale-90 hover:bg-white/40 rounded-full transition cursor-pointer z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Live Search Results Floating Panel (Liquid Glass Card) */}
        {(searchQuery.trim() || isSearchFocused) && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-full left-0 right-0 mt-2.5 p-3.5 rounded-[2rem] bg-gradient-to-b from-white/[0.80] via-white/[0.70] to-amber-50/[0.75] backdrop-blur-[24px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22),0_8px_20px_rgba(0,0,0,0.04),inset_0_2px_3px_rgba(255,255,255,0.95)] z-40 max-h-[60vh] overflow-y-auto space-y-2.5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Top Specular Rim Reflection */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1/3 pointer-events-none rounded-t-[2rem] bg-gradient-to-b from-white/70 via-white/15 to-transparent"
            />

            {/* Quick Filter Chips Bar */}
            <div className="relative z-10 flex items-center justify-between pb-1.5 border-b border-white/50">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight transition-all duration-200 cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white/[0.85] text-slate-900 border border-t-white/95 border-x-white/40 border-b-white/20 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_6px_rgba(15,23,42,0.08)] scale-102'
                      : 'bg-white/[0.35] hover:bg-white/[0.55] text-slate-600 border border-white/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('debt')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    filterMode === 'debt'
                      ? 'bg-rose-500/20 text-rose-800 border border-rose-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(244,63,94,0.2)] scale-102'
                      : 'bg-white/[0.35] hover:bg-white/[0.55] text-slate-600 border border-white/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />
                  <span>Con Deuda</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('clean')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    filterMode === 'clean'
                      ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(16,185,129,0.2)] scale-102'
                      : 'bg-white/[0.35] hover:bg-white/[0.55] text-slate-600 border border-white/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                  <span>Al Día</span>
                </button>
              </div>

              {!searchQuery.trim() && recentCustomerIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-1 shrink-0"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Header with Liquid Amber Badge & Context Title */}
            <div className="relative z-10 flex items-center justify-between px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <div className="flex items-center gap-1.5">
                {searchQuery.trim() ? (
                  <>
                    <Search className="w-3 h-3 text-amber-700" />
                    <span>Resultados de búsqueda</span>
                  </>
                ) : recentCustomerIds.length > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>Búsquedas recientes</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Clientes frecuentes</span>
                  </>
                )}
              </div>
              <span className="bg-amber-400/20 text-amber-950 px-2 py-0.5 rounded-full font-black border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-xs text-[9px]">
                {(searchQuery.trim() ? filteredCustomers : suggestedCustomers).length}{' '}
                {(searchQuery.trim() ? filteredCustomers : suggestedCustomers).length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>

            {/* Content List */}
            {(searchQuery.trim() ? filteredCustomers : suggestedCustomers).length === 0 ? (
              <div className="relative z-10 p-5 text-center space-y-1.5 rounded-2xl bg-white/[0.35] border border-white/50 backdrop-blur-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                <p className="text-xs font-black text-slate-800">
                  {searchQuery.trim()
                    ? 'No se encontró ningún cliente con ese criterio'
                    : 'No hay clientes que coincidan con el filtro'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {searchQuery.trim()
                    ? 'Verifica la ortografía o registra uno nuevo con el botón (+).'
                    : 'Selecciona otro filtro o busca por nombre/teléfono arriba.'}
                </p>
              </div>
            ) : (
              <div className="relative z-10 space-y-2">
                {(searchQuery.trim() ? filteredCustomers : suggestedCustomers).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/[0.50] hover:bg-white/[0.75] backdrop-blur-md border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(15,23,42,0.06)] transition-all gap-2 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Amber Crystal Avatar */}
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-orange-300 to-amber-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_10px_rgba(245,158,11,0.3)] shrink-0 group-hover:scale-105 transition-transform">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-slate-900 truncate">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {c.balance > 0 ? (
                            <span className="text-[10px] font-black text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                              Deuda: S/ {c.balance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                              Al día
                            </span>
                          )}
                          {c.phone && (
                            <span className="text-[10px] text-slate-500 font-medium truncate hidden sm:inline">
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Liquid Glass Action Button: + Fiar */}
                      <button
                        type="button"
                        onClick={() => {
                          saveRecentCustomer(c.id);
                          setSearchQuery('');
                          handleOpenCreditModal(c);
                        }}
                        aria-label="+ Fiar"
                        className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10.5px] sm:text-[11px] font-black text-amber-950 bg-gradient-to-tr from-amber-400/95 via-amber-300/95 to-amber-200/90 hover:from-amber-300 hover:to-amber-100 active:scale-95 rounded-full border border-t-white/95 border-b-amber-600/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3.2]" />
                        <span>Fiar</span>
                      </button>

                      {/* Liquid Glass Action Button: Cobrar */}
                      <button
                        type="button"
                        onClick={() => {
                          saveRecentCustomer(c.id);
                          setSearchQuery('');
                          handleOpenPaymentModal(c);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10.5px] sm:text-[11px] font-black text-emerald-950 bg-gradient-to-tr from-emerald-500/90 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 active:scale-95 rounded-full border border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.8]" />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Card: TOTAL POR COBRAR (Luminous Liquid Glass) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/[0.80] via-white/[0.65] to-amber-50/[0.75] backdrop-blur-[24px] backdrop-saturate-[190%] p-4 text-slate-900 border border-t-white border-x-white/50 border-b-white/20 shadow-[0_16px_36px_-8px_rgba(245,158,11,0.14),0_4px_16px_rgba(15,23,42,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2.5">
        {/* Specular Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/15 to-transparent rounded-t-[inherit]"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-amber-800 uppercase">
            <Wallet className="w-3.5 h-3.5 text-amber-700" />
            <span>Total por Cobrar</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-900 border border-amber-400/30 shadow-2xs backdrop-blur-md">
            • {stats.pendingAccountsCount} {stats.pendingAccountsCount === 1 ? 'cuenta pendiente' : 'cuentas pendientes'}
          </span>
        </div>

        <div className="relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600">S/</span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 drop-shadow-2xs">
              {stats.totalReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-0.5">
            Total fiado histórico: <span className="text-slate-900 font-bold">S/ {stats.totalFiadoHistorico.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Mini stats row (Liquid Glass Wells) */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60">
          <div className="p-2 sm:p-2.5 bg-white/[0.60] backdrop-blur-md border border-t-white border-x-white/50 border-b-white/20 rounded-2xl flex items-center justify-between shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.03)] min-w-0">
            <div className="min-w-0 pr-1">
              <span className="block text-[9px] uppercase font-black text-slate-500 tracking-wider truncate">Clientes</span>
              <span className="text-xs font-black text-slate-900 truncate block">
                {stats.totalCustomers} {stats.totalCustomers === 1 ? 'registrado' : 'registrados'}
              </span>
            </div>
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>

          <div className="p-2 sm:p-2.5 bg-white/[0.60] backdrop-blur-md border border-t-white border-x-white/50 border-b-white/20 rounded-2xl flex items-center justify-between shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.03)] min-w-0">
            <div className="min-w-0 pr-1">
              <span className="block text-[9px] uppercase font-black text-slate-500 tracking-wider truncate">Cobrado Total</span>
              <span className="text-xs font-black text-emerald-700 truncate block">
                S/ {stats.totalCobradoHistorico.toFixed(2)}
              </span>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
        </div>
      </div>

      {/* Daily Metrics: Fiado Hoy vs Cobrado Hoy (Interactive Links to History) */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/history"
          className="relative overflow-hidden p-3 rounded-2xl bg-white/[0.60] hover:bg-white/[0.80] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center gap-2.5 active:scale-[0.98] transition-all group cursor-pointer"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/5 to-transparent rounded-t-[inherit]" />
          <div className="relative z-10 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 backdrop-blur-md flex items-center justify-center text-amber-700 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
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
        </Link>

        <Link
          to="/history"
          className="relative overflow-hidden p-3 rounded-2xl bg-white/[0.60] hover:bg-white/[0.80] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center gap-2.5 active:scale-[0.98] transition-all group cursor-pointer"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/5 to-transparent rounded-t-[inherit]" />
          <div className="relative z-10 w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-md flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
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
        </Link>
      </div>

      {/* Mayores Deudas Pendientes */}
      <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-[inherit]" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-black tracking-wide text-slate-900 uppercase">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                stats.topDebtors.length > 0
                  ? 'bg-rose-500/15 text-rose-700 border-rose-400/30'
                  : 'bg-amber-500/15 text-amber-800 border-amber-400/30'
              }`}
            >
              {stats.topDebtors.length > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
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
                      {/* Debt progress bar with semantic health color */}
                      <div className="w-20 h-1 bg-slate-200/80 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ratio >= 80
                              ? 'bg-rose-500'
                              : ratio >= 50
                              ? 'bg-amber-500'
                              : 'bg-amber-400'
                          }`}
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      {debtor.phone && (
                        <a
                          href={generateWhatsAppPaymentReminder(
                            {
                              name: debtor.name,
                              phone: debtor.phone,
                              balance: debtor.balance,
                            },
                            storeSession?.storeName || 'Ámbar'
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp a ${debtor.name}`}
                          className="p-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-700 border border-emerald-400/30 transition shadow-2xs cursor-pointer flex items-center justify-center"
                          title="Enviar recordatorio por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(debtor)}
                        className="relative overflow-hidden px-3 py-1 text-[11px] font-black text-emerald-950 bg-gradient-to-b from-emerald-400/90 to-emerald-500/80 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 border-t border-t-white/90 border-x-white/30 border-b-emerald-600/40 rounded-full transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(16,185,129,0.2)] cursor-pointer"
                      >
                        Abonar
                      </button>
                    </div>
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
