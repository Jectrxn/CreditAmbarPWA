import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer, CreditTransaction } from '../../types/database';
import { db } from '../../lib/dexie';
import { useAuthStore } from '../../store/authStore';
import { generateWhatsAppReceipt } from '../../features/transactions/whatsappHelper';
import { OperatorSelector } from '../ui/OperatorSelector';
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

export interface QuickCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onSuccess?: (tx: CreditTransaction) => void;
}

export const QuickCreditModal: React.FC<QuickCreditModalProps> = ({
  isOpen,
  onClose,
  customer: preselectedCustomer,
  onSuccess,
}) => {
  const { currentOperatorName, storeSession } = useAuthStore();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>(currentOperatorName || 'Martin');
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedTx, setCompletedTx] = useState<{
    transaction: CreditTransaction;
    customer: Customer;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCompletedTx(null);
      setAmountInput('');
      setNotes('');
      setOperatorName(currentOperatorName || 'Martin');

      db.customers.toArray().then((list) => {
        setAllCustomers(list);
        if (preselectedCustomer) {
          setSelectedCustomerId(preselectedCustomer.id);
        } else if (list.length > 0) {
          setSelectedCustomerId(list[0].id);
        }
      });
    }
  }, [isOpen, preselectedCustomer, currentOperatorName]);

  const activeCustomer =
    allCustomers.find((c) => c.id === selectedCustomerId) || preselectedCustomer;

  const availableCredit = activeCustomer
    ? Math.max(0, activeCustomer.credit_limit - activeCustomer.balance)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeCustomer) {
      setErrorMessage('Seleccione un cliente para registrar el fiado.');
      return;
    }

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Ingrese un monto válido mayor a cero.');
      return;
    }

    if (amount > availableCredit) {
      setErrorMessage(
        `El monto (S/ ${amount.toFixed(2)}) supera el crédito disponible del cliente (S/ ${availableCredit.toFixed(2)}).`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const txId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
      const now = new Date().toISOString();
      const storeId = activeCustomer.store_id || storeSession?.storeId || 'store-default';

      const transaction: CreditTransaction = {
        id: txId,
        store_id: storeId,
        customer_id: activeCustomer.id,
        cashier_pin_hash: operatorName || 'mostrador',
        total_amount: amount,
        status: 'completed',
        created_at: now,
        synced: false,
        type: 'credit_purchase',
        notes: notes.trim() || undefined,
      };

      const updatedBalance = activeCustomer.balance + amount;
      const updatedCustomer: Customer = {
        ...activeCustomer,
        balance: updatedBalance,
      };

      // 1. Update customer in Dexie
      await db.customers.put({
        ...updatedCustomer,
        synced: false,
      });

      await db.syncQueue.add({
        entity: 'customers',
        operation: 'UPDATE',
        payload: updatedCustomer,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      // 2. Add transaction to Dexie
      await db.creditTransactions.put(transaction);

      await db.syncQueue.add({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: transaction,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      setCompletedTx({
        transaction,
        customer: updatedCustomer,
      });

      onSuccess?.(transaction);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar el fiado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title={completedTx ? '¡Fiado Registrado!' : '+ Registrar Nuevo Fiado'}
      maxWidth="md"
    >
      <div className="py-2 space-y-4">
        {completedTx ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Fiado guardado correctamente</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Se agregaron <span className="font-bold text-amber-700">S/ {completedTx.transaction.total_amount.toFixed(2)}</span> a la cuenta de {completedTx.customer.name}.
              </p>
            </div>

            <div className="p-4 bg-white/[0.10] backdrop-blur-md rounded-2xl border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] text-xs space-y-1.5 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nuevo Saldo Deuda:</span>
                <span className="font-bold text-rose-600">S/ {completedTx.customer.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Crédito Disponible:</span>
                <span className="font-bold text-emerald-700">
                  S/ {Math.max(0, completedTx.customer.credit_limit - completedTx.customer.balance).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-1.5 text-[11px]">
                <span className="text-slate-500 font-medium">Atendido por:</span>
                <span className="font-bold text-slate-900">{completedTx.transaction.cashier_pin_hash}</span>
              </div>
              {completedTx.transaction.notes && (
                <div className="flex justify-between border-t border-white/20 pt-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">Detalle:</span>
                  <span className="font-medium text-slate-800">{completedTx.transaction.notes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <a
                href={generateWhatsAppReceipt(
                  completedTx.transaction,
                  completedTx.customer,
                  storeSession?.storeName || 'Ámbar Bodega'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full border border-t-white/80 border-b-emerald-700/50 shadow-[0_4px_12px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.7)] transition active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-white/[0.12] hover:bg-white/[0.22] backdrop-blur-md border border-t-white/80 border-x-white/25 border-b-white/15 rounded-full transition active:scale-95 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50/80 backdrop-blur-md border border-rose-200 rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente:
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 text-xs font-semibold bg-white/[0.15] backdrop-blur-md border border-t-white/80 border-x-white/25 border-b-white/15 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] focus:bg-white/[0.25] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                required
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — (Debe: S/ {c.balance.toFixed(2)} | Disp: S/{' '}
                    {Math.max(0, c.credit_limit - c.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Operator / Atendido por (1-Touch Liquid Glass) */}
            <OperatorSelector
              selectedName={operatorName}
              onSelect={(name) => setOperatorName(name)}
            />

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Monto Total (S/):
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">
                  S/
                </span>
                <input
                  type="number"
                  step="0.10"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 bg-white/[0.15] backdrop-blur-md border border-t-white/80 border-x-white/25 border-b-white/15 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] focus:bg-white/[0.25] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Products / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Productos / Detalle del Fiado:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej. 1 Arroz costeño, 1 Aceite Primor, 2 Leche Gloria..."
                className="w-full p-2.5 text-xs bg-white/[0.15] backdrop-blur-md border border-t-white/80 border-x-white/25 border-b-white/15 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] focus:bg-white/[0.25] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-full transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 rounded-full shadow-[0_8px_20px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-95 transition cursor-pointer"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar Fiado'}
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
