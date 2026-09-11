import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer, CreditTransaction } from '../../types/database';
import { db } from '../../lib/dexie';
import { useAuthStore } from '../../store/authStore';
import { updateCustomer } from '../../features/credit/creditService';
import { generateWhatsAppPaymentReminder } from '../../features/transactions/whatsappHelper';
import {
  Phone,
  MessageSquare,
  Plus,
  ArrowDownLeft,
  Edit2,
  Check,
  X,
  Calendar,
  Clock,
} from 'lucide-react';

export interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onOpenCreditModal: (customer: Customer) => void;
  onOpenPaymentModal: (customer: Customer) => void;
  onCustomerUpdated?: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer: initialCustomer,
  onOpenCreditModal,
  onOpenPaymentModal,
  onCustomerUpdated,
}) => {
  const { storeSession } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | undefined>(initialCustomer);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setCustomer(initialCustomer);
    setIsEditing(false);
    setEditError(null);

    if (initialCustomer) {
      setEditName(initialCustomer.name);
      setEditPhone(initialCustomer.phone || '');
      setEditLimit(initialCustomer.credit_limit.toString());
      loadCustomerTransactions(initialCustomer.id);
    }
  }, [initialCustomer, isOpen]);

  const loadCustomerTransactions = async (customerId: string) => {
    setIsLoadingTx(true);
    try {
      const allTx = await db.creditTransactions
        .where('customer_id')
        .equals(customerId)
        .toArray();
      // Sort newest first
      const sorted = allTx.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTransactions(sorted);
    } catch (err) {
      console.error('Error loading customer transactions:', err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  if (!customer) return null;

  const availableCredit = Math.max(0, customer.credit_limit - customer.balance);
  const utilizationPercent =
    customer.credit_limit > 0 ? (customer.balance / customer.credit_limit) * 100 : 0;
  const initialLetter = customer.name.charAt(0).toUpperCase() || 'C';

  const handleSaveEdit = async () => {
    setEditError(null);
    if (!editName.trim()) {
      setEditError('El nombre no puede estar vacío.');
      return;
    }

    const limitNum = parseFloat(editLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      setEditError('El límite debe ser un número válido.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await updateCustomer(customer.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        creditLimit: limitNum,
      });
      setCustomer(updated);
      setIsEditing(false);
      onCustomerUpdated?.();
    } catch (err: any) {
      setEditError(err?.message || 'Error al guardar cambios.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase text-slate-500 tracking-wider">
            Detalle de Cuenta
          </span>
        </div>
      }
      maxWidth="md"
      data-testid="customer-detail-modal"
    >
      <div className="py-2 space-y-4">
        {/* Customer Header Card */}
        <div className="p-4 rounded-3xl bg-white/[0.60] backdrop-blur-[20px] backdrop-saturate-[180%] border border-t-white border-x-white/40 border-b-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_6px_20px_-4px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 border border-white/80 shadow-2xs">
                {initialLetter}
              </div>

              {!isEditing ? (
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {customer.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {customer.phone ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Sin teléfono</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full px-2.5 py-1 text-xs font-bold bg-white/80 border border-amber-300 rounded-xl"
                  />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Teléfono"
                    className="w-full px-2.5 py-1 text-xs bg-white/80 border border-amber-300 rounded-xl"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Límite S/:</span>
                    <input
                      type="number"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      className="w-24 px-2 py-1 text-xs font-bold bg-white/80 border border-amber-300 rounded-xl"
                    />
                  </div>
                  {editError && <p className="text-[10px] text-rose-600 font-bold">{editError}</p>}
                </div>
              )}
            </div>

            {/* Edit Button */}
            <div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-white/40 hover:bg-white/70 rounded-full transition border border-white/60"
                  aria-label="Editar cliente"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="p-1.5 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-full transition border border-emerald-300"
                    aria-label="Guardar cambios"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(customer.name);
                      setEditPhone(customer.phone || '');
                      setEditLimit(customer.credit_limit.toString());
                    }}
                    className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full transition"
                    aria-label="Cancelar edición"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Balance Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20">
            <div className="p-2.5 rounded-2xl bg-white/[0.60] backdrop-blur-md border border-white/60 shadow-2xs">
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
                Deuda Actual
              </span>
              <span
                className={`block text-base sm:text-lg font-black leading-tight ${
                  customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                S/ {customer.balance.toFixed(2)}
              </span>
              <span className="block text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                {customer.balance > 0 ? 'Pendiente de pago' : 'Al día'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/[0.60] backdrop-blur-md border border-white/60 shadow-2xs">
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
                Crédito Disponible
              </span>
              <span className="block text-base sm:text-lg font-black text-slate-900 leading-tight">
                S/ {availableCredit.toFixed(2)}
              </span>
              <span className="block text-[9px] font-bold text-slate-400 mt-0.5">
                De S/ {customer.credit_limit.toFixed(2)} máx.
              </span>
            </div>
          </div>

          {/* Utilization Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Límite utilizado</span>
              <span>{Math.min(100, Math.round(utilizationPercent))}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  customer.balance >= customer.credit_limit
                    ? 'bg-rose-500'
                    : utilizationPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, utilizationPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreditModal(customer);
            }}
            className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/90 backdrop-blur-[16px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 text-slate-950 font-black text-xs shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.9)] hover:from-amber-400 hover:to-amber-500 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Fiar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPaymentModal(customer);
            }}
            className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-gradient-to-b from-emerald-500/95 via-emerald-600/90 to-emerald-700/90 backdrop-blur-[16px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-emerald-800/50 text-white font-black text-xs shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.9)] hover:from-emerald-500 hover:to-emerald-600 active:scale-95 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
            <span>Abonar / Cobrar</span>
          </button>
        </div>

        {/* WhatsApp Reminder Button */}
        {customer.balance > 0 && (
          <a
            href={generateWhatsAppPaymentReminder(
              customer,
              storeSession?.storeName || 'Ámbar Bodega'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-950 font-bold text-xs border border-emerald-500/30 transition active:scale-98 cursor-pointer shadow-2xs"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Enviar recordatorio por WhatsApp</span>
          </a>
        )}

        {/* Recent Transactions List */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Movimientos Recientes</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold lowercase">
              {transactions.length} registros
            </span>
          </div>

          {isLoadingTx ? (
            <div className="py-4 text-center text-xs text-slate-500 font-medium">
              Cargando historial...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-4 text-center rounded-2xl bg-white/[0.40] border border-white/50 p-3 text-xs text-slate-500 font-medium">
              No hay movimientos registrados para este cliente.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {transactions.map((tx) => {
                const isPayment = tx.type === 'payment';
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
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                          isPayment
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}
                      >
                        {isPayment ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {isPayment ? 'Abono / Pago' : 'Nuevo Fiado'}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`block font-black text-xs ${
                          isPayment ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPayment ? '-' : '+'} S/ {tx.total_amount.toFixed(2)}
                      </span>
                      {tx.notes && (
                        <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[100px]">
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
      </div>
    </LiquidModal>
  );
};
