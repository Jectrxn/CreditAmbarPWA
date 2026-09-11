import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/dexie';
import type { Customer, CreditTransaction } from '../types/database';
import { useAuthStore } from '../store/authStore';
import { CashierLoginModal } from '../components/modals/CashierLoginModal';
import {
  Sparkles,
  Download,
  Users,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

type PeriodFilter = 'today' | 'week' | 'month';

export const SupervisorPage: React.FC = () => {
  const { isAdminMode } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('month');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [allCustomers, allTx] = await Promise.all([
        db.customers.toArray(),
        db.creditTransactions.toArray(),
      ]);
      setCustomers(allCustomers);
      setTransactions(allTx);
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter transactions by selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    let startDate = new Date();
    if (activePeriod === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (activePeriod === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (activePeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    }

    return transactions.filter((t) => {
      if (t.status === 'cancelled') return false;
      const txDate = new Date(t.created_at);
      return txDate >= startDate;
    });
  }, [transactions, activePeriod]);

  // Aggregated Metrics
  const metrics = useMemo(() => {
    const fiados = filteredTransactions.filter((t) => t.type === 'credit_purchase');
    const abonos = filteredTransactions.filter((t) => t.type === 'payment');

    const totalFiado = fiados.reduce((sum, t) => sum + t.total_amount, 0);
    const totalCobrado = abonos.reduce((sum, t) => sum + t.total_amount, 0);

    const fiadosCount = fiados.length;
    const abonosCount = abonos.length;

    // Distinct customer IDs involved in transactions in this period
    const activeCustomerIds = new Set(filteredTransactions.map((t) => t.customer_id));
    const activeCustomersCount = activeCustomerIds.size;

    // Average per payment
    const averageAbono = abonosCount > 0 ? totalCobrado / abonosCount : 0;

    // Recovery Rate %
    let recoveryRate = 0;
    if (totalFiado === 0 && totalCobrado === 0) {
      recoveryRate = 0;
    } else if (totalFiado === 0 && totalCobrado > 0) {
      recoveryRate = 100;
    } else {
      recoveryRate = Math.min(100, Math.round((totalCobrado / totalFiado) * 100));
    }

    // Top Fiados (sorted by highest amount)
    const topFiados = [...fiados]
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);

    // Latest Abonos (sorted by newest created_at)
    const latestAbonos = [...abonos]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      totalFiado,
      totalCobrado,
      fiadosCount,
      abonosCount,
      activeCustomersCount,
      averageAbono,
      recoveryRate,
      topFiados,
      latestAbonos,
    };
  }, [filteredTransactions]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const cashierBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; fiados: number; abonos: number; count: number }>();
    filteredTransactions.forEach((t) => {
      const name = t.cashier_pin_hash || 'Mostrador';
      const current = map.get(name) || { name, fiados: 0, abonos: 0, count: 0 };
      if (t.type === 'payment') {
        current.abonos += t.total_amount;
      } else {
        current.fiados += t.total_amount;
      }
      current.count += 1;
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.fiados + b.abonos - (a.fiados + a.abonos));
  }, [filteredTransactions]);

  const getPeriodLabel = () => {
    switch (activePeriod) {
      case 'today':
        return 'Hoy';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Mes Actual';
      default:
        return 'Mes Actual';
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Tipo', 'Cliente', 'Monto', 'Fecha', 'Operador', 'Notas'],
      ...filteredTransactions.map((t) => [
        t.id,
        t.type === 'payment' ? 'Abono' : 'Fiado',
        customerMap.get(t.customer_id)?.name || t.customer_id,
        t.total_amount.toFixed(2),
        t.created_at,
        t.cashier_pin_hash || 'Mostrador',
        t.notes || '',
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ambar_${activePeriod}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div data-testid="page-supervisor" className="w-full space-y-2.5">
      {/* Hidden Accessible Page Title for screen readers & tests */}
      <h1 className="sr-only">Supervisor y Reportes</h1>

      {/* Admin Mode Status Banner */}
      {!isAdminMode() ? (
        <div className="p-3 rounded-2xl bg-amber-500/10 backdrop-blur-md border border-t-white border-x-white/40 border-b-amber-500/25 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-950 truncate">Modo Vista Mostrador</p>
              <p className="text-[10px] text-amber-900/80 font-medium truncate">
                Ingresá el PIN de Supervisor (1234) para autorizar cambios.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="px-3 py-1 text-[11px] font-black text-slate-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 rounded-full border border-white/80 shadow-xs shrink-0 cursor-pointer active:scale-95 transition"
          >
            Activar Admin
          </button>
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-400/20 via-amber-500/15 to-emerald-500/20 backdrop-blur-md border border-t-white border-x-white/40 border-b-amber-500/30 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-black text-slate-900">
              Modo Supervisor / Admin Activo
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
            PIN 1234 Verificado
          </span>
        </div>
      )}

      {/* Period Filter Tabs & Export Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 gap-1 p-1 rounded-full bg-white/[0.35] backdrop-blur-md border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
          <button
            type="button"
            onClick={() => setActivePeriod('today')}
            className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
              activePeriod === 'today'
                ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => setActivePeriod('week')}
            className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
              activePeriod === 'week'
                ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
            }`}
          >
            Esta Semana
          </button>

          <button
            type="button"
            onClick={() => setActivePeriod('month')}
            className={`py-2 px-2 rounded-full text-xs font-black transition-all duration-200 cursor-pointer text-center truncate ${
              activePeriod === 'month'
                ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-t-white/80 border-b-amber-500/50'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/[0.3]'
            }`}
          >
            Este Mes
          </button>
        </div>

        {/* Download / Export Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          aria-label="Descargar reporte CSV"
          className="p-2.5 rounded-2xl bg-white/[0.60] hover:bg-white/[0.80] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 text-slate-700 hover:text-slate-900 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] active:scale-95 transition cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Hero Card: RENDIMIENTO DEL PERÍODO (Dark Liquid Glass) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-amber-950/85 backdrop-blur-[24px] backdrop-saturate-[190%] p-4 text-white border border-t-white/30 border-x-white/15 border-b-white/5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.35),0_8px_20px_-4px_rgba(15,23,42,0.15),inset_0_1.5px_2px_rgba(255,255,255,0.35)] space-y-3">
        {/* Specular Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-amber-400 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>RENDIMIENTO DEL PERÍODO</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-slate-200 border border-white/15 shadow-2xs backdrop-blur-md">
            {getPeriodLabel()}
          </span>
        </div>

        {/* Recovery Rate Metric */}
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-300">Tasa de Recuperación</span>
            <span className="text-amber-400 text-sm">{metrics.recoveryRate}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 transition-all duration-300"
              style={{ width: `${metrics.recoveryRate}%` }}
            />
          </div>
        </div>

        {/* Inner 2-Column Wells */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-1.5 border-t border-white/10">
          <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="block text-[9px] uppercase font-black text-rose-400 tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-rose-400" />
                <span>TOTAL FIADO</span>
              </span>
              <span className="block text-sm sm:text-base font-black text-white mt-0.5">
                S/ {metrics.totalFiado.toFixed(2)}
              </span>
              <span className="block text-[9px] text-slate-400 font-medium">
                {metrics.fiadosCount} {metrics.fiadosCount === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="block text-[9px] uppercase font-black text-emerald-400 tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span>TOTAL COBRADO</span>
              </span>
              <span className="block text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                S/ {metrics.totalCobrado.toFixed(2)}
              </span>
              <span className="block text-[9px] text-slate-400 font-medium">
                {metrics.abonosCount} {metrics.abonosCount === 1 ? 'abono' : 'abonos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stats Cards (2 Columns) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Card 1: Clientes con Movimiento */}
        <div className="p-3.5 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex flex-col justify-between gap-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-700 shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider leading-tight">
              CLIENTES CON MOVIMIENTO
            </span>
            <span className="block text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {metrics.activeCustomersCount}
            </span>
          </div>
        </div>

        {/* Card 2: Promedio por Abono */}
        <div className="p-3.5 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex flex-col justify-between gap-2">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Banknote className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider leading-tight">
              PROMEDIO POR ABONO
            </span>
            <span className="block text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              S/ {metrics.averageAbono.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Operaciones por Cajero (Martin, Emiliano, Anthony, Benjamin) */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black text-slate-900 tracking-tight">
              Movimientos por Cajero
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-full border border-white/80">
            {cashierBreakdown.length} registrado{cashierBreakdown.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cashierBreakdown.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 font-medium">
            Sin operaciones registradas en este período
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cashierBreakdown.map((item) => (
              <div
                key={item.name}
                className="p-2.5 rounded-2xl bg-white/[0.55] backdrop-blur-md border border-white/60 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border border-white shrink-0 shadow-2xs">
                    {item.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {item.count} operación{item.count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] space-y-0.5">
                  {item.fiados > 0 && (
                    <div className="text-rose-600 font-black text-[11px]">
                      Fiado: S/ {item.fiados.toFixed(2)}
                    </div>
                  )}
                  {item.abonos > 0 && (
                    <div className="text-emerald-700 font-black text-[11px]">
                      Cobro: S/ {item.abonos.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 1: Mayores Fiados Registrados */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          <h3 className="text-xs font-black text-slate-900 tracking-tight">
            Mayores Fiados Registrados
          </h3>
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-xs text-slate-500 font-medium">
            Cargando registros...
          </div>
        ) : metrics.topFiados.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-medium">
            Sin fiados registrados en este período
          </div>
        ) : (
          <div className="space-y-1.5">
            {metrics.topFiados.map((tx) => {
              const customer = customerMap.get(tx.customer_id);
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
                  className="p-2.5 rounded-2xl bg-white/[0.55] backdrop-blur-md border border-white/60 shadow-2xs flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {customer?.name || 'Cliente'}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formattedDate}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block font-black text-rose-600 text-xs sm:text-sm">
                      + S/ {tx.total_amount.toFixed(2)}
                    </span>
                    {tx.notes && (
                      <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
                        {tx.notes}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Últimos Abonos Realizados */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)] space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <h3 className="text-xs font-black text-slate-900 tracking-tight">
            Últimos Abonos Realizados
          </h3>
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-xs text-slate-500 font-medium">
            Cargando cobros...
          </div>
        ) : metrics.latestAbonos.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-medium">
            Sin cobros registrados en este período
          </div>
        ) : (
          <div className="space-y-1.5">
            {metrics.latestAbonos.map((tx) => {
              const customer = customerMap.get(tx.customer_id);
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
                  className="p-2.5 rounded-2xl bg-white/[0.55] backdrop-blur-md border border-white/60 shadow-2xs flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {customer?.name || 'Cliente'}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formattedDate}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block font-black text-emerald-600 text-xs sm:text-sm">
                      - S/ {tx.total_amount.toFixed(2)}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-medium uppercase">
                      {tx.payment_method === 'qr' ? 'QR' : 'Efectivo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Login / PIN Modal */}
      <CashierLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
