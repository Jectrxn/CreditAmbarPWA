import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/dexie';
import type { Customer } from '../types/database';
import { NewCustomerModal } from '../components/modals/NewCustomerModal';
import { CustomerDetailModal } from '../components/modals/CustomerDetailModal';
import { QuickPaymentModal } from '../components/modals/QuickPaymentModal';
import { QuickCreditModal } from '../components/modals/QuickCreditModal';
import {
  Search,
  UserPlus,
  TrendingDown,
  ChevronRight,
  X,
  Users,
  ArrowUpDown,
  Hash,
  MessageCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

import { AdvancedFiltersModal, type AdvancedFilters } from '../components/modals/AdvancedFiltersModal';
import { calculateOldestUnpaidDate } from '../features/transactions/debtAgeCalculator';

import { useUIStore } from '../store/uiStore';
import { useAuthStore, useActiveStoreId } from '../store/authStore';
import { useReminderStore } from '../store/reminderStore';
import { generateWhatsAppPaymentReminder } from '../features/transactions/whatsappHelper';
import { triggerHaptic } from '../utils/haptics';
import { BatchReminderModal } from '../components/modals/BatchReminderModal';

type TabFilter = 'all' | 'debt' | 'clean';
type SortOption = 'highest_debt' | 'lowest_debt' | 'name_asc' | 'recent';

export const CustomersPage: React.FC = () => {
  const { storeSession } = useAuthStore();
  const activeStoreId = useActiveStoreId();
  const { setTabBarHidden } = useUIStore();
  const { sentReminders, markAsSent } = useReminderStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isNumericMode, setIsNumericMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('highest_debt');

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

  // Modals state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isBatchReminderOpen, setIsBatchReminderOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  
  const [debtAgeMap, setDebtAgeMap] = useState<Record<string, Date | null>>({});
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    minAmount: null,
    maxAmount: null,
    minAgeDays: null,
  });

  const loadData = async (storeId: string) => {
    try {
      const storeCustomers = await db.customers.where('store_id').equals(storeId).toArray();
      setCustomers(storeCustomers);
      
      // Compute debt age map for all customers
      const storeTxs = await db.creditTransactions.where('store_id').equals(storeId).toArray();
      const newDebtAgeMap: Record<string, Date | null> = {};
      
      for (const cust of storeCustomers) {
        if (cust.balance > 0) {
          const custTxs = storeTxs.filter(t => t.customer_id === cust.id);
          newDebtAgeMap[cust.id] = calculateOldestUnpaidDate(custTxs);
        }
      }
      setDebtAgeMap(newDebtAgeMap);
      
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeStoreId);
  }, [activeStoreId]);

  // Aggregated Stats
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const debtCustomers = customers.filter((c) => c.balance > 0);
    const cleanCustomers = customers.filter((c) => c.balance === 0);
    const totalPending = debtCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);

    return {
      totalCustomers,
      debtCount: debtCustomers.length,
      cleanCount: cleanCustomers.length,
      totalPending,
    };
  }, [customers]);

  // Filtered & Sorted Customer List
  const filteredAndSortedCustomers = useMemo(() => {
    let list = [...customers];

    // 1. Search Query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    // 2. Tab Filter
    if (activeTab === 'debt') {
      list = list.filter((c) => c.balance > 0);
    } else if (activeTab === 'clean') {
      list = list.filter((c) => c.balance === 0);
    }

    // 2.5 Advanced Filters
    if (advancedFilters.minAmount !== null) {
      list = list.filter(c => c.balance >= advancedFilters.minAmount!);
    }
    if (advancedFilters.maxAmount !== null) {
      list = list.filter(c => c.balance <= advancedFilters.maxAmount!);
    }
    if (advancedFilters.minAgeDays !== null) {
      const now = new Date();
      list = list.filter(c => {
        const oldestDate = debtAgeMap[c.id];
        if (!oldestDate) return false;
        const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= advancedFilters.minAgeDays!;
      });
    }

    // 3. Sorting
    list.sort((a, b) => {
      switch (sortOption) {
        case 'highest_debt':
          // Highest debt first, then name
          if (b.balance !== a.balance) return b.balance - a.balance;
          return a.name.localeCompare(b.name);
        case 'lowest_debt':
          if (a.balance !== b.balance) return a.balance - b.balance;
          return a.name.localeCompare(b.name);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return b.balance - a.balance;
      }
    });

    return list;
  }, [customers, searchQuery, activeTab, sortOption, advancedFilters, debtAgeMap]);

  // Debtors list for batch reminder
  const debtors = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);

  // Alphabetical distinct initials
  const availableInitials = useMemo(() => {
    const set = new Set<string>();
    filteredAndSortedCustomers.forEach((c) => {
      const first = c.name.trim().charAt(0).toUpperCase();
      if (first) set.add(first);
    });
    return Array.from(set).sort();
  }, [filteredAndSortedCustomers]);

  const handleJumpToInitial = (letter: string) => {
    triggerHaptic(15);
    const element = document.getElementById(`customer-group-${letter}`);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleSort = () => {
    triggerHaptic(15);
    setSortOption((current) => {
      if (current === 'highest_debt') return 'name_asc';
      if (current === 'name_asc') return 'recent';
      return 'highest_debt';
    });
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'highest_debt':
        return 'Mayor Deuda';
      case 'name_asc':
        return 'Nombre A-Z';
      case 'recent':
        return 'Más Recientes';
      default:
        return 'Mayor Deuda';
    }
  };

  const handleOpenDetail = (cust: Customer) => {
    triggerHaptic(15);
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  const handleOpenPayment = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic(20);
    setSelectedCustomer(cust);
    setIsPaymentModalOpen(true);
  };

  const handleOpenCredit = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic(20);
    setSelectedCustomer(cust);
    setIsCreditModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadData(activeStoreId);
  };

  return (
    <div data-testid="page-customers" className="w-full space-y-2.5">
      {/* Hidden Accessible Page Title for screen readers & tests */}
      <h1 className="sr-only">Clientes</h1>

      {/* Top Action Buttons Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* + Nuevo Cliente Button */}
        <button
          type="button"
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-gradient-to-tr from-amber-400/95 via-amber-300/95 to-amber-200/90 hover:from-amber-300 hover:to-amber-100 active:scale-[0.97] text-amber-950 font-black text-xs sm:text-sm border border-t-white/95 border-b-amber-600/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-3px_rgba(245,158,11,0.35)] transition-all cursor-pointer group"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/15 to-transparent rounded-t-full"
          />
          <UserPlus className="relative z-10 w-4 h-4 stroke-[2.8] transition-transform group-hover:scale-110" />
          <span className="relative z-10">+ Nuevo Cliente</span>
        </button>

        {/* Sort / Mayor Deuda Button */}
        <button
          type="button"
          onClick={toggleSort}
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white/[0.60] hover:bg-white/[0.75] active:scale-[0.97] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 text-slate-800 font-black text-xs sm:text-sm shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer group"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full"
          />
          {sortOption === 'highest_debt' ? (
            <TrendingDown className="relative z-10 w-4 h-4 text-rose-600 stroke-[2.8]" />
          ) : (
            <ArrowUpDown className="relative z-10 w-4 h-4 text-amber-700 stroke-[2.8]" />
          )}
          <span className="relative z-10 truncate">{getSortLabel()}</span>
        </button>
      </div>

      {/* Search Input Bar & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          {/* Top Specular Rim */}
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
            placeholder={isNumericMode ? "Buscar por teléfono o número..." : "Buscar clientes por nombre o teléfono..."}
            className="w-full pl-10 pr-20 py-2.5 text-xs sm:text-sm bg-white/[0.55] hover:bg-white/[0.65] focus:bg-white/[0.75] backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-6px_rgba(15,23,42,0.06)] focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-300/30 focus:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_12px_28px_-4px_rgba(245,158,11,0.18)] transition-all duration-300"
          />

          {/* Numeric / Text Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsNumericMode((prev) => !prev)}
            title={isNumericMode ? 'Cambiar a teclado alfanumérico' : 'Cambiar a teclado numérico (teléfono/código)'}
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
              onClick={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
                setTabBarHidden(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 active:scale-90 hover:bg-white/40 rounded-full transition cursor-pointer z-10"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Advanced Filters Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setIsFiltersModalOpen(true);
          }}
          className={`relative overflow-hidden shrink-0 flex items-center justify-center w-[2.6rem] h-[2.6rem] rounded-full backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer group ${
            advancedFilters.minAmount !== null || advancedFilters.maxAmount !== null || advancedFilters.minAgeDays !== null
              ? 'bg-emerald-500/20 text-emerald-800 border-emerald-400/50'
              : 'bg-white/[0.60] hover:bg-white/[0.75] text-slate-700'
          }`}
          title="Filtros Avanzados"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full"
          />
          <Filter className="relative z-10 w-4 h-4 stroke-[2.8]" />
          {(advancedFilters.minAmount !== null || advancedFilters.maxAmount !== null || advancedFilters.minAgeDays !== null) && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
          )}
        </button>
      </div>

      {/* Stats Summary Row (Unified Liquid Glass Strip) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.65] via-white/[0.55] to-amber-50/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_20px_-6px_rgba(15,23,42,0.06)] p-2">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/10 to-transparent rounded-t-[inherit]"
        />
        <div className="relative z-10 grid grid-cols-3 divide-x divide-white/50 text-center">
          {/* 1. Total Clientes */}
          <div className="px-1.5 py-1">
            <span className="block text-[8.5px] sm:text-[9.5px] font-black text-slate-500 uppercase tracking-wider truncate">
              Total Clientes
            </span>
            <span className="block text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
              {stats.totalCustomers}
            </span>
          </div>

          {/* 2. Con Deuda */}
          <div className="px-1.5 py-1">
            <span className="block text-[8.5px] sm:text-[9.5px] font-black text-rose-600 uppercase tracking-wider truncate">
              Con Deuda
            </span>
            <span className="block text-base sm:text-lg font-black text-rose-700 leading-tight mt-0.5">
              {stats.debtCount}
            </span>
          </div>

          {/* 3. Total Pendiente */}
          <div className="px-1.5 py-1">
            <span className="block text-[8.5px] sm:text-[9.5px] font-black text-amber-800 uppercase tracking-wider truncate">
              Total Pendiente
            </span>
            <span className="block text-xs sm:text-sm font-black text-amber-900 leading-tight truncate mt-0.5">
              S/ {stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Pills) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-white/[0.35] backdrop-blur-md border border-white/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
        {/* Tab: Todos */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveTab('all');
          }}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            activeTab === 'all'
              ? 'bg-white/[0.85] text-slate-950 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_8px_rgba(15,23,42,0.08)] border border-t-white/95 border-x-white/40 border-b-white/20 scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.40]'
          }`}
        >
          Todos ({stats.totalCustomers})
        </button>

        {/* Tab: Con Deuda */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveTab('debt');
          }}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate flex items-center justify-center gap-1 ${
            activeTab === 'debt'
              ? 'bg-rose-500/20 text-rose-800 border border-rose-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(244,63,94,0.2)] scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.40]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />
          <span>Con Deuda ({stats.debtCount})</span>
        </button>

        {/* Tab: Al Día */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveTab('clean');
          }}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate flex items-center justify-center gap-1 ${
            activeTab === 'clean'
              ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(16,185,129,0.2)] scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.40]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
          <span>Al día ({stats.cleanCount})</span>
        </button>
      </div>

      {/* Batch Debt Reminder Banner (When debtors exist) */}
      {debtors.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-teal-500/15 backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_6px_18px_-4px_rgba(16,185,129,0.15)] p-2.5 flex items-center justify-between gap-2">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/60 via-white/10 to-transparent rounded-t-[inherit]"
          />
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-400/40 shadow-xs">
              <MessageCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">
                Cobranza Masiva ({debtors.length})
              </p>
              <p className="text-[10px] font-semibold text-slate-600 truncate">
                Recordatorios WhatsApp con saldo al día
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setIsBatchReminderOpen(true);
            }}
            className="relative z-10 px-3 py-1.5 text-xs font-black text-emerald-950 bg-gradient-to-tr from-emerald-500/95 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 active:scale-95 rounded-full border border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)] transition cursor-pointer shrink-0"
          >
            Recordar Deudas
          </button>
        </div>
      )}

      {/* Alphabetical Quick Jump Strip (A-Z Scrubber) */}
      {availableInitials.length > 0 && !searchQuery && (
        <div className="flex items-center gap-1 overflow-x-auto py-1 px-1.5 rounded-full bg-white/[0.30] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] no-scrollbar">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider px-1 shrink-0">
            A-Z:
          </span>
          {availableInitials.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => handleJumpToInitial(letter)}
              className="w-6 h-6 shrink-0 rounded-full text-[10.5px] font-black text-slate-800 bg-white/[0.55] hover:bg-white/[0.85] active:scale-90 border border-t-white/95 border-b-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)] flex items-center justify-center transition cursor-pointer"
              aria-label={`Ir a letra ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {/* Customer List Container */}
      <div className="space-y-2 pt-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-500">
            Cargando clientes...
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-3xl bg-white/[0.55] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_8px_20px_-4px_rgba(15,23,42,0.06)] space-y-2">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400/20 via-orange-300/20 to-amber-200/20 text-amber-800 flex items-center justify-center mx-auto border border-amber-400/30 shadow-xs">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-slate-900">
              {searchQuery
                ? 'No se encontraron clientes'
                : activeTab === 'debt'
                ? '¡Todas las cuentas están al día!'
                : 'Aún no hay clientes registrados'}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-medium">
              {searchQuery
                ? `No hay resultados para "${searchQuery}".`
                : activeTab === 'debt'
                ? 'No hay deudas pendientes en este momento.'
                : 'Registrá un nuevo cliente con el botón superior para comenzar.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setIsNewCustomerModalOpen(true);
                }}
                className="mt-2 px-4 py-1.5 text-xs font-black text-amber-950 bg-gradient-to-tr from-amber-400/95 via-amber-300/95 to-amber-200/90 hover:from-amber-300 hover:to-amber-100 rounded-full border border-t-white/95 border-b-amber-600/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(245,158,11,0.25)] transition active:scale-95 cursor-pointer"
              >
                + Crear Primer Cliente
              </button>
            )}
          </div>
        ) : (
          (() => {
            const renderedInitials = new Set<string>();
            return filteredAndSortedCustomers.map((customer) => {
              const initialLetter = customer.name.charAt(0).toUpperCase() || 'C';
              const isFirstOfInitial = !renderedInitials.has(initialLetter);
              if (isFirstOfInitial) {
                renderedInitials.add(initialLetter);
              }
              const hasDebt = customer.balance > 0;
              const isSent = sentReminders.includes(customer.id);

              return (
                <div
                  key={customer.id}
                  id={isFirstOfInitial ? `customer-group-${initialLetter}` : undefined}
                  onClick={() => handleOpenDetail(customer)}
                  className={`p-3.5 rounded-3xl backdrop-blur-[20px] backdrop-saturate-[190%] border border-t-white/95 border-x-white/35 border-b-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_6px_18px_-4px_rgba(15,23,42,0.06)] flex items-center justify-between gap-2.5 transition-all duration-200 group cursor-pointer ${isSent ? 'bg-emerald-500/10' : 'bg-white/[0.55] hover:bg-white/[0.75]'}`}
                >
                  {/* Left: Avatar Initial & Name/Phone */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-orange-300 to-amber-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border border-white/90 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_10px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
                      {initialLetter}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {customer.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {hasDebt ? (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                            Debe: S/ {customer.balance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                            Al día
                          </span>
                        )}
                        {isSent && hasDebt && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Notificado
                          </span>
                        )}
                        {customer.phone && !isSent && (
                          <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Balance, Quick Action, and Arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* WhatsApp Direct Shortcut Button (for debtors) */}
                    {hasDebt && (
                      <a
                        href={generateWhatsAppPaymentReminder(customer, storeSession?.storeName || 'Ámbar Bodega')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(25);
                          markAsSent(customer.id);
                        }}
                        className={`p-1.5 rounded-full border shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] transition active:scale-90 cursor-pointer ${
                          isSent
                            ? 'text-emerald-700 bg-emerald-500/20 border-emerald-400/50'
                            : 'text-emerald-700 hover:text-emerald-900 bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40'
                        }`}
                        title="Enviar recordatorio por WhatsApp"
                        aria-label={`WhatsApp a ${customer.name}`}
                      >
                        {isSent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                      </a>
                    )}

                    {/* Quick Action Button: Abonar (if debt) or + Fiar */}
                    {hasDebt ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenPayment(customer, e)}
                        className="px-3 py-1.5 text-xs font-black text-emerald-950 bg-gradient-to-tr from-emerald-500/90 via-emerald-400/95 to-teal-300/90 hover:from-emerald-400 hover:to-teal-200 active:scale-95 rounded-full border border-t-white/95 border-b-emerald-700/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(16,185,129,0.25)] transition cursor-pointer"
                      >
                        Abonar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleOpenCredit(customer, e)}
                        className="px-3 py-1.5 text-xs font-black text-amber-950 bg-gradient-to-tr from-amber-400/95 via-amber-300/95 to-amber-200/90 hover:from-amber-300 hover:to-amber-100 active:scale-95 rounded-full border border-t-white/95 border-b-amber-600/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_12px_rgba(245,158,11,0.25)] transition cursor-pointer"
                      >
                        + Fiar
                      </button>
                    )}

                    {/* Detail Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        customer={selectedCustomer}
        onOpenCreditModal={(c) => {
          setSelectedCustomer(c);
          setIsCreditModalOpen(true);
        }}
        onOpenPaymentModal={(c) => {
          setSelectedCustomer(c);
          setIsPaymentModalOpen(true);
        }}
        onCustomerUpdated={handleModalSuccess}
      />

      <QuickPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={handleModalSuccess}
      />

      <QuickCreditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={handleModalSuccess}
      />

      <BatchReminderModal
        isOpen={isBatchReminderOpen}
        onClose={() => setIsBatchReminderOpen(false)}
        debtors={debtors}
      />

      <AdvancedFiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        currentFilters={advancedFilters}
        onApplyFilters={setAdvancedFilters}
      />
    </div>
  );
};
