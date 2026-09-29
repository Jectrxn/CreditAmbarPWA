import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/dexie';
import type { Customer, CreditTransaction } from '../types/database';
import { useAuthStore, useActiveStoreId } from '../store/authStore';
import { QuickPaymentModal } from '../components/modals/QuickPaymentModal';
import { QuickCreditModal } from '../components/modals/QuickCreditModal';
import { CustomerDetailModal } from '../components/modals/CustomerDetailModal';
import { LiquidModal } from '../components/ui/LiquidModal';
import { generateWhatsAppReceipt } from '../features/transactions/whatsappHelper';
import {
  Banknote,
  Search,
  TrendingDown,
  Phone,
  ChevronRight,
  X,
  Users,
  CheckCircle2,
  ArrowUpDown,
  ArrowDownLeft,
  ShoppingBag,
  Clock,
  Lock,
  Edit2,
  Calendar,
  MessageSquare,
  Undo2,
  AlertCircle,
} from 'lucide-react';

type ViewMode = 'receivable' | 'movements';
type CobrosFilter = 'debt_only' | 'high_debt' | 'all';
type MovementsFilter = 'all' | 'fiados' | 'abonos';
type SortOption = 'highest_debt' | 'lowest_debt' | 'name_asc' | 'recent';

export const HistoryPage: React.FC = () => {
  const { storeSession } = useAuthStore();
  const activeStoreId = useActiveStoreId();

  const [viewMode, setViewMode] = useState<ViewMode>('receivable');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Receivable view states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<CobrosFilter>('debt_only');
  const [sortOption, setSortOption] = useState<SortOption>('highest_debt');

  // Movements feed states
  const [movementsSearch, setMovementsSearch] = useState<string>('');
  const [movementsFilter, setMovementsFilter] = useState<MovementsFilter>('all');

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  // Edit / Cancel Movement State (10-minute Audit Window)
  const [editingTx, setEditingTx] = useState<CreditTransaction | null>(null);
  const [editAmountInput, setEditAmountInput] = useState<string>('');
  const [editReasonInput, setEditReasonInput] = useState<string>('');
  const [cancellingTx, setCancellingTx] = useState<CreditTransaction | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);
  const [isAuditSubmitting, setIsAuditSubmitting] = useState<boolean>(false);

  const loadData = async (storeId: string) => {
    try {
      const [storeCustomers, storeTx] = await Promise.all([
        db.customers.where('store_id').equals(storeId).toArray(),
        db.creditTransactions.where('store_id').equals(storeId).toArray(),
      ]);
      setCustomers(storeCustomers);
      // Sort newest first
      setTransactions(
        storeTx.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (err) {
      console.error('Error loading cobros & movements data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeStoreId);
  }, [activeStoreId]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Aggregated Stats for Receivables
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const debtCustomers = customers.filter((c) => c.balance > 0);
    const totalReceivable = debtCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);
    const highDebtCustomers = customers.filter((c) => c.balance >= 50);
    const highestDebt = debtCustomers.length > 0 ? Math.max(...debtCustomers.map((c) => c.balance)) : 0;

    return {
      totalCustomers,
      debtCount: debtCustomers.length,
      highDebtCount: highDebtCustomers.length,
      totalReceivable,
      highestDebt,
    };
  }, [customers]);

  // Filtered & Sorted Receivables List
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

    // 2. Filter tabs
    if (activeFilter === 'debt_only') {
      list = list.filter((c) => c.balance > 0);
    } else if (activeFilter === 'high_debt') {
      list = list.filter((c) => c.balance >= 50);
    }

    // 3. Sorting
    list.sort((a, b) => {
      switch (sortOption) {
        case 'highest_debt':
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
  }, [customers, searchQuery, activeFilter, sortOption]);

  // Filtered Movements List
  const filteredMovements = useMemo(() => {
    let list = [...transactions];

    const q = movementsSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const custName = customerMap.get(t.customer_id)?.name.toLowerCase() || '';
        const notes = t.notes?.toLowerCase() || '';
        return custName.includes(q) || notes.includes(q);
      });
    }

    if (movementsFilter === 'fiados') {
      list = list.filter((t) => t.type === 'credit_purchase');
    } else if (movementsFilter === 'abonos') {
      list = list.filter((t) => t.type === 'payment');
    }

    return list;
  }, [transactions, movementsSearch, movementsFilter, customerMap]);

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
        return 'Mayor';
      case 'name_asc':
        return 'A-Z';
      case 'recent':
        return 'Recientes';
      default:
        return 'Mayor';
    }
  };

  const handleOpenPayment = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setIsPaymentModalOpen(true);
  };

  const handleOpenDetail = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadData(activeStoreId);
  };

  // 10-Minute Audit Window Check
  const getAuditStatus = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const isWithinGrace = elapsedMs < 10 * 60 * 1000;
    const remainingMin = Math.max(0, Math.ceil((10 * 60 * 1000 - elapsedMs) / 60000));
    return { isWithinGrace, remainingMin };
  };

  // Submit Edit Transaction Amount
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setAuditErrorMessage(null);

    const parsed = parseFloat(editAmountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setAuditErrorMessage('El monto debe ser un número válido mayor a 0.');
      return;
    }

    if (!editReasonInput.trim()) {
      setAuditErrorMessage('El motivo de corrección es obligatorio.');
      return;
    }

    const { isWithinGrace } = getAuditStatus(editingTx.created_at);
    if (!isWithinGrace) {
      setAuditErrorMessage('La ventana de 10 minutos para correcciones ha expirado.');
      return;
    }

    setIsAuditSubmitting(true);
    try {
      const diff = parsed - editingTx.total_amount;
      const customer = customerMap.get(editingTx.customer_id);

      const updatedTx: CreditTransaction = {
        ...editingTx,
        total_amount: parsed,
        edit_reason: editReasonInput.trim(),
        updated_at: new Date().toISOString(),
      };

      await db.creditTransactions.put(updatedTx);
      await db.syncQueue.add({
        entity: 'credit_transactions',
        operation: 'UPDATE',
        payload: updatedTx,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      if (customer) {
        let updatedBalance = customer.balance;
        if (editingTx.type === 'payment') {
          updatedBalance = Math.max(0, customer.balance - diff);
        } else {
          updatedBalance = customer.balance + diff;
        }

        const updatedCust: Customer = {
          ...customer,
          balance: updatedBalance,
        };

        await db.customers.put(updatedCust);
        await db.syncQueue.add({
          entity: 'customers',
          operation: 'UPDATE',
          payload: updatedCust,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });
      }

      setEditingTx(null);
      await loadData(activeStoreId);
    } catch (err: any) {
      setAuditErrorMessage(err?.message || 'Error al guardar la corrección.');
    } finally {
      setIsAuditSubmitting(false);
    }
  };

  // Submit Cancel Transaction
  const handleConfirmCancelTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTx) return;
    setAuditErrorMessage(null);

    if (!cancelReasonInput.trim()) {
      setAuditErrorMessage('El motivo de anulación es obligatorio.');
      return;
    }

    const { isWithinGrace } = getAuditStatus(cancellingTx.created_at);
    if (!isWithinGrace) {
      setAuditErrorMessage('La ventana de 10 minutos para anular ha expirado.');
      return;
    }

    setIsAuditSubmitting(true);
    try {
      const customer = customerMap.get(cancellingTx.customer_id);

      const updatedTx: CreditTransaction = {
        ...cancellingTx,
        status: 'cancelled',
        edit_reason: cancelReasonInput.trim(),
        updated_at: new Date().toISOString(),
      };

      await db.creditTransactions.put(updatedTx);
      await db.syncQueue.add({
        entity: 'credit_transactions',
        operation: 'UPDATE',
        payload: updatedTx,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      if (customer) {
        let restoredBalance = customer.balance;
        if (cancellingTx.type === 'payment') {
          restoredBalance = customer.balance + cancellingTx.total_amount;
        } else {
          restoredBalance = Math.max(0, customer.balance - cancellingTx.total_amount);
        }

        const updatedCust: Customer = {
          ...customer,
          balance: restoredBalance,
        };

        await db.customers.put(updatedCust);
        await db.syncQueue.add({
          entity: 'customers',
          operation: 'UPDATE',
          payload: updatedCust,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });
      }

      setCancellingTx(null);
      await loadData(activeStoreId);
    } catch (err: any) {
      setAuditErrorMessage(err?.message || 'Error al anular la transacción.');
    } finally {
      setIsAuditSubmitting(false);
    }
  };

  // Undo Cancel Transaction
  const handleUndoCancel = async (tx: CreditTransaction) => {
    const { isWithinGrace } = getAuditStatus(tx.created_at);
    if (!isWithinGrace) {
      alert('No se puede deshacer: la ventana de 10 minutos ha expirado.');
      return;
    }

    try {
      const customer = customerMap.get(tx.customer_id);
      const restoredTx: CreditTransaction = {
        ...tx,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };

      await db.creditTransactions.put(restoredTx);
      await db.syncQueue.add({
        entity: 'credit_transactions',
        operation: 'UPDATE',
        payload: restoredTx,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      if (customer) {
        let reAppliedBalance = customer.balance;
        if (tx.type === 'payment') {
          reAppliedBalance = Math.max(0, customer.balance - tx.total_amount);
        } else {
          reAppliedBalance = customer.balance + tx.total_amount;
        }

        const updatedCust: Customer = {
          ...customer,
          balance: reAppliedBalance,
        };

        await db.customers.put(updatedCust);
        await db.syncQueue.add({
          entity: 'customers',
          operation: 'UPDATE',
          payload: updatedCust,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });
      }

      await loadData(activeStoreId);
    } catch (err) {
      console.error('Error undoing cancel:', err);
    }
  };

  return (
    <div data-testid="page-history" className="w-full space-y-2.5 pb-24">
      {/* Hidden Accessible Page Title for screen readers & tests */}
      <h1 className="sr-only">Historial y Cobros</h1>

      {/* Dual View Segmented Selector: [ Por Cobrar ] | [ Movimientos ] */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-white/[0.35] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <button
          type="button"
          onClick={() => setViewMode('receivable')}
          className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            viewMode === 'receivable'
              ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
          }`}
        >
          Cuentas por Cobrar
        </button>

        <button
          type="button"
          onClick={() => setViewMode('movements')}
          className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
            viewMode === 'movements'
              ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
          }`}
        >
          Registro de Movimientos ({transactions.length})
        </button>
      </div>

      {viewMode === 'receivable' ? (
        /* ================= VISTA 1: CUENTAS POR COBRAR ================= */
        <>
          {/* Hero Card: MÓDULO DE COBRANZAS (Authentic Dark Liquid Glass) */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-emerald-950/85 backdrop-blur-[24px] backdrop-saturate-[190%] p-4 text-white border border-t-white/30 border-x-white/15 border-b-white/5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.35),0_8px_20px_-4px_rgba(15,23,42,0.15),inset_0_1.5px_2px_rgba(255,255,255,0.35)] space-y-3">
            {/* Specular Ambient Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Top Tag & Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-emerald-400 uppercase">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>MÓDULO DE COBRANZAS</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs backdrop-blur-md">
                • Por Cobrar
              </span>
            </div>

            {/* Main Metric */}
            <div className="relative z-10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-amber-400/90">S/</span>
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]">
                  {stats.totalReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-300/80 mt-0.5">
                {stats.debtCount} {stats.debtCount === 1 ? 'cliente con cuenta activa' : 'clientes con cuentas activas'}
              </p>
            </div>

            {/* Mini stats row (Dark Glass Wells) */}
            <div className="relative z-10 grid grid-cols-2 gap-2 pt-1.5 border-t border-white/10">
              <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Deudores</span>
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-slate-300 inline" />
                    {stats.debtCount} de {stats.totalCustomers}
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Deuda Más Alta</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 mt-0.5">
                    S/ {stats.highestDebt.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar & Sort Button Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente para cobrar..."
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

            {/* Sort button */}
            <button
              type="button"
              onClick={toggleSort}
              className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-full bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 text-slate-800 font-bold text-xs sm:text-sm shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] hover:bg-white/[0.80] active:scale-[0.97] transition-all cursor-pointer group shrink-0"
            >
              {sortOption === 'highest_debt' ? (
                <TrendingDown className="w-4 h-4 text-rose-500 stroke-[2.5]" />
              ) : (
                <ArrowUpDown className="w-4 h-4 text-amber-600 stroke-[2.5]" />
              )}
              <span className="font-black text-xs">{getSortLabel()}</span>
            </button>
          </div>

          {/* Filter Tabs (Pills) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-white/[0.30] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
            <button
              type="button"
              onClick={() => setActiveFilter('debt_only')}
              className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                activeFilter === 'debt_only'
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-rose-700/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              Solo Deuda ({stats.debtCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('high_debt')}
              className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                activeFilter === 'high_debt'
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-rose-700/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              ≥ S/ 50
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-rose-700/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              Todos ({stats.totalCustomers})
            </button>
          </div>

          {/* Debtors / Collections List */}
          <div className="space-y-2 pt-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-500">
                Cargando cobros pendientes...
              </div>
            ) : filteredAndSortedCustomers.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-3xl bg-white/[0.60] backdrop-blur-[20px] border border-white/60 space-y-2 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">
                  {searchQuery
                    ? 'No se encontraron clientes'
                    : '¡No hay cobros pendientes!'}
                </h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {searchQuery
                    ? `No hay coincidencias para "${searchQuery}".`
                    : 'Todas las cuentas corrientes se encuentran al día.'}
                </p>
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

                    {/* Right: Amount, Prominent Abonar Button, Arrow */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Amount Display */}
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
                          {hasDebt ? 'Por Cobrar' : 'Al día'}
                        </span>
                      </div>

                      {/* Prominent Emerald Abonar Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenPayment(customer, e)}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 rounded-full border border-t-white/80 border-b-emerald-700/50 shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition cursor-pointer"
                      >
                        <Banknote className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Abonar</span>
                      </button>

                      {/* Detail Arrow */}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* ================= VISTA 2: REGISTRO DE MOVIMIENTOS (AUDITORÍA & GRACE WINDOW) ================= */
        <div className="space-y-2.5">
          {/* Search Movements & Filters */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              value={movementsSearch}
              onChange={(e) => setMovementsSearch(e.target.value)}
              placeholder="Buscar en movimientos por cliente o notas..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 rounded-full text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_4px_16px_-4px_rgba(15,23,42,0.06)] focus:outline-none focus:bg-white/[0.85] focus:border-amber-500/60 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200"
            />
            {movementsSearch && (
              <button
                type="button"
                onClick={() => setMovementsSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full transition"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-filters for Movements */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-white/[0.30] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
            <button
              type="button"
              onClick={() => setMovementsFilter('all')}
              className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                movementsFilter === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              Todos ({transactions.length})
            </button>

            <button
              type="button"
              onClick={() => setMovementsFilter('fiados')}
              className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                movementsFilter === 'fiados'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              Solo Fiados ({transactions.filter((t) => t.type === 'credit_purchase').length})
            </button>

            <button
              type="button"
              onClick={() => setMovementsFilter('abonos')}
              className={`py-1.5 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
                movementsFilter === 'abonos'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
              }`}
            >
              Solo Abonos ({transactions.filter((t) => t.type === 'payment').length})
            </button>
          </div>

          {/* Movements List Feed */}
          <div className="space-y-2 pt-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-500">
                Cargando historial de movimientos...
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-3xl bg-white/[0.60] backdrop-blur-[20px] border border-white/60 space-y-2 shadow-sm">
                <p className="text-xs font-bold text-slate-700">No hay movimientos registrados.</p>
                <p className="text-[11px] text-slate-500">
                  Los nuevos fiados y cobros aparecerán aquí automáticamente en tiempo real.
                </p>
              </div>
            ) : (
              filteredMovements.map((tx) => {
                const customer = customerMap.get(tx.customer_id);
                const isPayment = tx.type === 'payment';
                const isCancelled = tx.status === 'cancelled';
                const { isWithinGrace, remainingMin } = getAuditStatus(tx.created_at);

                const txDate = new Date(tx.created_at);
                const formattedDate = txDate.toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={tx.id}
                    className={`p-3 rounded-3xl backdrop-blur-[20px] backdrop-saturate-[180%] border transition-all duration-200 space-y-2 ${
                      isCancelled
                        ? 'bg-slate-100/60 border-slate-300/50 opacity-60'
                        : 'bg-white/[0.60] border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)]'
                    }`}
                  >
                    {/* Top Row: Customer info & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${
                            isPayment
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : 'bg-amber-100 text-amber-700 border-amber-300'
                          }`}
                        >
                          {isPayment ? (
                            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {customer?.name || 'Cliente'}
                            </p>
                            {isCancelled ? (
                              <span className="px-2 py-0.2 text-[9px] font-black uppercase text-slate-600 bg-slate-200 rounded-full">
                                Anulado
                              </span>
                            ) : isWithinGrace ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 text-[9px] font-black text-emerald-900 bg-emerald-100/90 rounded-full border border-emerald-300 shadow-2xs">
                                <Clock className="w-2.5 h-2.5 text-emerald-700" />
                                <span>{remainingMin} min gracia</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 text-[9px] font-bold text-slate-500 bg-slate-100 rounded-full border border-slate-200">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Inmutable</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span>{isPayment ? 'Abono' : 'Fiado'}</span>
                            {tx.payment_method && (
                              <span className="uppercase font-bold text-[9px] text-slate-600 bg-white/60 px-1.5 py-0.2 rounded-full border border-white/80">
                                {tx.payment_method === 'qr' ? 'QR' : 'Efectivo'}
                              </span>
                            )}
                            {tx.cashier_pin_hash && (
                              <span className="font-bold text-[9px] text-amber-900 bg-amber-400/20 border border-amber-300/40 px-1.5 py-0.2 rounded-full">
                                👤 {tx.cashier_pin_hash}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <span
                          className={`block font-black text-sm sm:text-base ${
                            isCancelled
                              ? 'line-through text-slate-400'
                              : isPayment
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {isPayment ? '-' : '+'} S/ {tx.total_amount.toFixed(2)}
                        </span>
                        {tx.notes && (
                          <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
                            {tx.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row: WhatsApp receipt & Grace Window Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/20 text-[11px]">
                      {/* WhatsApp Receipt Button */}
                      {customer && !isCancelled ? (
                        <a
                          href={generateWhatsAppReceipt(
                            tx,
                            customer,
                            storeSession?.storeName || 'Ámbar Bodega'
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 transition"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>Comprobante</span>
                        </a>
                      ) : <div />}

                      {/* Grace Window Edit / Cancel Actions */}
                      <div className="flex items-center gap-1.5">
                        {!isCancelled && isWithinGrace && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTx(tx);
                                setEditAmountInput(tx.total_amount.toString());
                                setEditReasonInput('');
                                setAuditErrorMessage(null);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition"
                            >
                              <Edit2 className="w-3 h-3 text-amber-700" />
                              <span>Corregir</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCancellingTx(tx);
                                setCancelReasonInput('');
                                setAuditErrorMessage(null);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 transition"
                            >
                              <X className="w-3 h-3 text-rose-700" />
                              <span>Anular</span>
                            </button>
                          </>
                        )}

                        {isCancelled && isWithinGrace && (
                          <button
                            type="button"
                            onClick={() => handleUndoCancel(tx)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 transition"
                          >
                            <Undo2 className="w-3 h-3 text-blue-700" />
                            <span>Deshacer Anulación</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals for Quick Actions */}
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
        onVoided={handleModalSuccess}
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

      {/* Audit Edit Modal (10-minute window) */}
      <LiquidModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Corregir Monto de Transacción"
        maxWidth="sm"
      >
        {editingTx && (
          <form onSubmit={handleSaveEditTx} className="space-y-4 py-1">
            {auditErrorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{auditErrorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Nuevo Monto Total (S/):
              </label>
              <input
                type="number"
                step="0.10"
                value={editAmountInput}
                onChange={(e) => setEditAmountInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white/80 border border-amber-300 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Motivo de corrección (Obligatorio para auditoría):
              </label>
              <input
                type="text"
                value={editReasonInput}
                onChange={(e) => setEditReasonInput(e.target.value)}
                placeholder="Ej. Error de tipeo en mostrador"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-300 rounded-xl"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 rounded-full"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isAuditSubmitting}
                className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-full shadow-md"
              >
                {isAuditSubmitting ? 'Guardando...' : 'Guardar Corrección'}
              </button>
            </div>
          </form>
        )}
      </LiquidModal>

      {/* Audit Cancel Modal (10-minute window) */}
      <LiquidModal
        isOpen={!!cancellingTx}
        onClose={() => setCancellingTx(null)}
        title="Anular Transacción"
        maxWidth="sm"
      >
        {cancellingTx && (
          <form onSubmit={handleConfirmCancelTx} className="space-y-4 py-1">
            {auditErrorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{auditErrorMessage}</span>
              </div>
            )}

            <p className="text-xs text-slate-600">
              ¿Estás seguro de anular la transacción de{' '}
              <span className="font-bold text-slate-900">
                S/ {cancellingTx.total_amount.toFixed(2)}
              </span>{' '}
              para {customerMap.get(cancellingTx.customer_id)?.name || 'Cliente'}? El saldo del
              cliente se revertirá automáticamente.
            </p>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Motivo de anulación (Obligatorio):
              </label>
              <input
                type="text"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Ej. Cobro duplicado o fiado erróneo"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-rose-300 rounded-xl"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={() => setCancellingTx(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 rounded-full"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isAuditSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-full shadow-md"
              >
                {isAuditSubmitting ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </form>
        )}
      </LiquidModal>
    </div>
  );
};
