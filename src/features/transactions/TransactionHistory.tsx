import React, { useState, useEffect, useCallback } from 'react';
import type { CreditTransaction, Customer } from '../../types/database';
import { db } from '../../lib/dexie';
import { checkAuditGraceWindow } from './transactionRules';
import { generateWhatsAppPaymentReminder } from './whatsappHelper';
import { LiquidModal } from '../../components/ui/LiquidModal';
import {
  History,
  Edit2,
  Trash2,
  RotateCcw,
  Lock,
  MessageCircle,
  AlertCircle,
  Clock,
  DollarSign,
  QrCode,
  ShoppingBag,
  ArrowDownLeft,
} from 'lucide-react';

export interface TransactionHistoryProps {
  storeId: string;
  now?: Date;
  className?: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  storeId,
  now = new Date(),
  className = '',
}) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Edit State
  const [editingTx, setEditingTx] = useState<CreditTransaction | null>(null);
  const [newAmount, setNewAmount] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  // Cancel State
  const [cancellingTx, setCancellingTx] = useState<CreditTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const txs = await db.creditTransactions
        .where('store_id')
        .equals(storeId)
        .reverse()
        .sortBy('created_at');

      const custs = await db.customers.where('store_id').equals(storeId).toArray();
      const map: Record<string, Customer> = {};
      for (const c of custs) {
        map[c.id] = c;
      }

      setTransactions(txs);
      setCustomersMap(map);
    } catch (err: any) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setErrorMessage(null);

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a cero.');
      return;
    }

    if (!editReason.trim()) {
      setErrorMessage('El motivo de corrección es obligatorio.');
      return;
    }

    const grace = checkAuditGraceWindow(editingTx.created_at, now);
    if (!grace.canEdit) {
      setErrorMessage(grace.error || 'La ventana de auditoría ha cerrado.');
      return;
    }

    const diff = parsedAmount - editingTx.total_amount;
    const customer = customersMap[editingTx.customer_id];

    const updatedTx: CreditTransaction = {
      ...editingTx,
      total_amount: parsedAmount,
      edit_reason: editReason.trim(),
      updated_at: new Date().toISOString(),
      synced: false,
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

    // Update customer balance
    if (customer) {
      let updatedBalance = customer.balance;
      if (editingTx.type === 'payment') {
        // Higher payment decreases customer debt; lower payment increases debt
        updatedBalance = Math.max(0, customer.balance - diff);
      } else {
        // Higher purchase increases debt
        updatedBalance = customer.balance + diff;
      }

      const updatedCust: Customer = {
        ...customer,
        balance: updatedBalance,
      };

      await db.customers.put({ ...updatedCust, synced: false });
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
    setNewAmount('');
    setEditReason('');
    await loadData();
  };

  // Handle Cancel Submission
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTx) return;
    setErrorMessage(null);

    if (!cancelReason.trim()) {
      setErrorMessage('El motivo de anulación es obligatorio.');
      return;
    }

    const grace = checkAuditGraceWindow(cancellingTx.created_at, now);
    if (!grace.canEdit) {
      setErrorMessage(grace.error || 'La ventana de auditoría ha cerrado.');
      return;
    }

    const updatedTx: CreditTransaction = {
      ...cancellingTx,
      status: 'cancelled',
      edit_reason: cancelReason.trim(),
      updated_at: new Date().toISOString(),
      synced: false,
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

    // Reverse customer balance adjustment
    const customer = customersMap[cancellingTx.customer_id];
    if (customer) {
      let restoredBalance = customer.balance;
      if (cancellingTx.type === 'payment') {
        // Cancelling a payment restores customer debt
        restoredBalance = customer.balance + cancellingTx.total_amount;
      } else {
        // Cancelling a credit purchase decreases debt
        restoredBalance = Math.max(0, customer.balance - cancellingTx.total_amount);
      }

      const updatedCust: Customer = {
        ...customer,
        balance: restoredBalance,
      };

      await db.customers.put({ ...updatedCust, synced: false });
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
    setCancelReason('');
    await loadData();
  };

  // Handle Undo of Cancellation
  const handleUndoCancel = async (tx: CreditTransaction) => {
    setErrorMessage(null);

    const grace = checkAuditGraceWindow(tx.created_at, now);
    if (!grace.canUndo) {
      setErrorMessage('No se puede deshacer: la ventana de 10 minutos ha expirado.');
      return;
    }

    const restoredTx: CreditTransaction = {
      ...tx,
      status: 'completed',
      updated_at: new Date().toISOString(),
      synced: false,
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

    // Re-apply customer balance
    const customer = customersMap[tx.customer_id];
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

      await db.customers.put({ ...updatedCust, synced: false });
      await db.syncQueue.add({
        entity: 'customers',
        operation: 'UPDATE',
        payload: updatedCust,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });
    }

    await loadData();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-white/30">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-700" />
          <h2 className="text-base font-bold text-slate-900">Historial de Transacciones</h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">{transactions.length} registros</span>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-100/90 border border-red-300 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 py-4 text-center">Cargando transacciones...</p>
      ) : transactions.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">No hay transacciones registradas.</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const customer = customersMap[tx.customer_id];
            const grace = checkAuditGraceWindow(tx.created_at, now);
            const isCancelled = tx.status === 'cancelled';
            const isImmutable = !grace.canEdit;

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCancelled
                    ? 'bg-slate-100/70 border-slate-200 opacity-60'
                    : 'bg-white/70 border-white/80 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        tx.type === 'payment'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tx.type === 'payment' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {customer?.name || 'Cliente'}
                        </span>
                        {isCancelled ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-200 rounded-full">
                            Anulado
                          </span>
                        ) : isImmutable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-200/80 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Inmutable / Ventana cerrada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>{Math.ceil(grace.remainingMinutes)} min de gracia</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{new Date(tx.created_at).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{tx.type === 'payment' ? 'Abono' : 'Fiado'}</span>
                        {tx.payment_method && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              {tx.payment_method === 'cash' ? (
                                <>
                                  <DollarSign className="w-3 h-3 text-emerald-600" />
                                  <span>Efectivo</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-3 h-3 text-blue-600" />
                                  <span>QR</span>
                                </>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-base font-bold ${
                        isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      ${tx.total_amount.toFixed(2)}
                    </div>

                    {tx.edit_reason && (
                      <p className="text-[10px] text-amber-800 italic mt-0.5 max-w-[140px] truncate">
                        Motivo: {tx.edit_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions & WhatsApp button */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-black/5">
                  <div className="flex items-center gap-2">
                    {/* WhatsApp Reminder Link */}
                    {customer && (
                      <a
                        href={generateWhatsAppPaymentReminder(customer)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Enviar recordatorio WhatsApp"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 active:bg-emerald-300 rounded-xl transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCancelled && grace.canUndo ? (
                      <button
                        type="button"
                        onClick={() => handleUndoCancel(tx)}
                        aria-label="Deshacer anulación / Restaurar"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Deshacer anulación</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setNewAmount(tx.total_amount.toString());
                            setEditReason(tx.edit_reason || '');
                          }}
                          disabled={isImmutable || isCancelled}
                          aria-label="Editar"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-white/50 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCancellingTx(tx);
                            setCancelReason('');
                          }}
                          disabled={isImmutable || isCancelled}
                          aria-label="Anular"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Anular</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTx && (
        <LiquidModal
          isOpen={true}
          onClose={() => setEditingTx(null)}
          title="Corregir Transacción (Ventana de 10 min)"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="new-amount-input" className="block text-xs font-medium text-slate-700">
                Nuevo monto ($):
              </label>
              <input
                id="new-amount-input"
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                aria-label="Nuevo monto"
                className="w-full px-3 py-2 bg-white/80 border border-white/60 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-reason-input" className="block text-xs font-medium text-slate-700">
                Motivo del cambio / Motivo de corrección:
              </label>
              <input
                id="edit-reason-input"
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                aria-label="Motivo del cambio / Motivo de corrección"
                placeholder="Ej. Error de tipeo"
                className="w-full px-3 py-2 bg-white/80 border border-white/60 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow"
              >
                Guardar corrección
              </button>
            </div>
          </form>
        </LiquidModal>
      )}

      {/* Cancel Modal */}
      {cancellingTx && (
        <LiquidModal
          isOpen={true}
          onClose={() => setCancellingTx(null)}
          title="Anular Transacción"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 py-2">
            <p className="text-xs text-slate-600">
              ¿Estás seguro de anular esta transacción por ${cancellingTx.total_amount.toFixed(2)}?
              Podrás deshacerlo durante el tiempo restante de la ventana de 10 minutos.
            </p>

            <div className="space-y-1">
              <label htmlFor="cancel-reason-input" className="block text-xs font-medium text-slate-700">
                Motivo de anulación:
              </label>
              <input
                id="cancel-reason-input"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                aria-label="Motivo de anulación"
                placeholder="Ej. Duplicado o error de cliente"
                className="w-full px-3 py-2 bg-white/80 border border-white/60 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={() => setCancellingTx(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Volver
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow"
              >
                Confirmar anulación
              </button>
            </div>
          </form>
        </LiquidModal>
      )}
    </div>
  );
};
