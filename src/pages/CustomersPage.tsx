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
  Phone,
  ChevronRight,
  X,
  Users,
  ArrowUpDown,
} from 'lucide-react';

type TabFilter = 'all' | 'debt' | 'clean';
type SortOption = 'highest_debt' | 'lowest_debt' | 'name_asc' | 'recent';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('highest_debt');

  // Modals state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const loadData = async () => {
    try {
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
  }, [customers, searchQuery, activeTab, sortOption]);

  const toggleSort = () => {
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
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  const handleOpenPayment = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setIsPaymentModalOpen(true);
  };

  const handleOpenCredit = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setIsCreditModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadData();
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
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-3 px-3 rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 backdrop-blur-[16px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 text-slate-950 font-black text-xs sm:text-sm shadow-[0_8px_20px_-3px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer group"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-full"
          />
          <UserPlus className="relative z-10 w-4 h-4 stroke-[2.8] transition-transform group-hover:scale-110" />
          <span className="relative z-10">+ Nuevo Cliente</span>
        </button>

        {/* Sort / Mayor Deuda Button */}
        <button
          type="button"
          onClick={toggleSort}
          className="relative overflow-hidden flex items-center justify-center gap-1.5 py-3 px-3 rounded-full bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 text-slate-800 font-bold text-xs sm:text-sm shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] hover:bg-white/[0.80] active:scale-[0.97] transition-all cursor-pointer group"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-full"
          />
          {sortOption === 'highest_debt' ? (
            <TrendingDown className="relative z-10 w-4 h-4 text-rose-500 stroke-[2.5]" />
          ) : (
            <ArrowUpDown className="relative z-10 w-4 h-4 text-amber-600 stroke-[2.5]" />
          )}
          <span className="relative z-10 truncate">{getSortLabel()}</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar clientes por nombre o teléfono..."
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_16px_-4px_rgba(15,23,42,0.06)] focus:outline-none focus:bg-white/[0.85] focus:border-amber-500/60 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full transition"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stats Summary Row (3 Cards) */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. Total Clientes */}
        <div className="relative overflow-hidden p-2.5 rounded-2xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] text-center flex flex-col justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-[inherit]"
          />
          <span className="block text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider truncate">
            Total Clientes
          </span>
          <span className="block text-base sm:text-lg font-black text-slate-900 leading-tight">
            {stats.totalCustomers}
          </span>
        </div>

        {/* 2. Con Deuda */}
        <div className="relative overflow-hidden p-2.5 rounded-2xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] text-center flex flex-col justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-[inherit]"
          />
          <span className="block text-[8px] sm:text-[9px] font-black text-rose-500 uppercase tracking-wider truncate">
            Con Deuda
          </span>
          <span className="block text-base sm:text-lg font-black text-rose-600 leading-tight">
            {stats.debtCount}
          </span>
        </div>

        {/* 3. Total Pendiente */}
        <div className="relative overflow-hidden p-2.5 rounded-2xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] text-center flex flex-col justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-t-[inherit]"
          />
          <span className="block text-[8px] sm:text-[9px] font-black text-amber-700 uppercase tracking-wider truncate">
            Total Pendiente
          </span>
          <span className="block text-xs sm:text-sm font-black text-amber-600/90 leading-tight truncate">
            S/ {stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter Tabs (Pills) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-white/[0.30] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            activeTab === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
          }`}
        >
          Todos ({stats.totalCustomers})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debt')}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            activeTab === 'debt'
              ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
          }`}
        >
          Con Deuda ({stats.debtCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clean')}
          className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            activeTab === 'clean'
              ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
          }`}
        >
          Al día ({stats.cleanCount})
        </button>
      </div>

      {/* Customer List Container */}
      <div className="space-y-2 pt-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-500">
            Cargando clientes...
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-3xl bg-white/[0.60] backdrop-blur-[20px] border border-white/60 space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              {searchQuery
                ? 'No se encontraron clientes'
                : activeTab === 'debt'
                ? '¡Todas las cuentas están al día!'
                : 'Aún no hay clientes registrados'}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              {searchQuery
                ? `No hay resultados para "${searchQuery}".`
                : activeTab === 'debt'
                ? 'No hay deudas pendientes en este momento.'
                : 'Registrá un nuevo cliente con el botón superior para comenzar.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="mt-2 px-4 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-full shadow-xs transition"
              >
                + Crear Primer Cliente
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedCustomers.map((customer) => {
            const initialLetter = customer.name.charAt(0).toUpperCase() || 'C';
            const hasDebt = customer.balance > 0;

            return (
              <div
                key={customer.id}
                onClick={() => handleOpenDetail(customer)}
                className="p-3 rounded-3xl bg-white/[0.60] hover:bg-white/[0.80] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center justify-between gap-2.5 transition-all duration-200 group cursor-pointer"
              >
                {/* Left: Avatar Initial & Name/Phone */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-black text-base flex items-center justify-center shrink-0 border border-white/80 shadow-2xs">
                    {initialLetter}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {customer.name}
                    </p>
                    {customer.phone ? (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-slate-400 italic">
                        Sin teléfono
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Balance, Quick Action, and Arrow */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Debt Amount Display */}
                  <div className="text-right">
                    <span
                      className={`block text-xs sm:text-sm font-black leading-tight ${
                        hasDebt ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      S/ {customer.balance.toFixed(2)}
                    </span>
                    <span
                      className={`block text-[8px] font-black uppercase tracking-wider ${
                        hasDebt ? 'text-slate-400' : 'text-emerald-600'
                      }`}
                    >
                      {hasDebt ? 'Debe' : 'Al día'}
                    </span>
                  </div>

                  {/* Quick Action Button: Abonar (if debt) or + Fiar */}
                  {hasDebt ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenPayment(customer, e)}
                      className="px-3 py-1.5 text-xs font-black text-emerald-950 bg-gradient-to-b from-emerald-300 to-emerald-400 hover:from-emerald-300 hover:to-emerald-500 rounded-full border border-t-white/90 border-b-emerald-500/50 shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                      Abonar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleOpenCredit(customer, e)}
                      className="px-3 py-1.5 text-xs font-black text-amber-950 bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-500 rounded-full border border-t-white/90 border-b-amber-500/50 shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                      + Fiar
                    </button>
                  )}

                  {/* Detail Arrow */}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </div>
              </div>
            );
          })
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
    </div>
  );
};
