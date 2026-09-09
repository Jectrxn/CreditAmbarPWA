import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer, CreditTransaction } from '../../types/database';
import { db } from '../../lib/dexie';
import { useAuthStore } from '../../store/authStore';
import { generateWhatsAppReceipt } from '../../features/transactions/whatsappHelper';
import {
  DollarSign,
  QrCode,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

export interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onSuccess?: (tx: CreditTransaction) => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  customer: preselectedCustomer,
  onSuccess,
}) => {
  const { storeSession } = useAuthStore();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [amountInput, setAmountInput] = useState<string>('');
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
      setPaymentMethod('cash');

      db.customers.toArray().then((list) => {
        // filter debtors first
        const debtors = list.filter((c) => c.balance > 0);
        setAllCustomers(list);
        if (preselectedCustomer) {
          setSelectedCustomerId(preselectedCustomer.id);
          setAmountInput(preselectedCustomer.balance > 0 ? preselectedCustomer.balance.toString() : '');
        } else if (debtors.length > 0) {
          setSelectedCustomerId(debtors[0].id);
          setAmountInput(debtors[0].balance.toString());
        } else if (list.length > 0) {
          setSelectedCustomerId(list[0].id);
        }
      });
    }
  }, [isOpen, preselectedCustomer]);

  const activeCustomer =
    allCustomers.find((c) => c.id === selectedCustomerId) || preselectedCustomer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeCustomer) {
      setErrorMessage('Seleccione un cliente para registrar el abono.');
      return;
    }

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Ingrese un monto válido mayor a cero.');
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
        cashier_pin_hash: 'caja-directa',
        total_amount: amount,
        status: 'completed',
        created_at: now,
        synced: false,
        type: 'payment',
        payment_method: paymentMethod,
      };

      const updatedBalance = Math.max(0, activeCustomer.balance - amount);
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
      setErrorMessage(err?.message || 'Error al registrar el cobro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title={completedTx ? '¡Cobro Registrado!' : '✓ Registrar Abono / Pago'}
      maxWidth="md"
    >
      <div className="py-2 space-y-4">
        {completedTx ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Abono registrado con éxito</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Se cobraron <span className="font-bold text-emerald-700">S/ {completedTx.transaction.total_amount.toFixed(2)}</span> de la cuenta de {completedTx.customer.name}.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo pendiente restante:</span>
                <span className="font-bold text-slate-900">S/ {completedTx.customer.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Método de Cobro:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  {completedTx.transaction.payment_method === 'cash' ? 'Efectivo' : 'QR / Yape / Plin'}
                </span>
              </div>
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente que Abona:
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = allCustomers.find((c) => c.id === e.target.value);
                  if (cust && cust.balance > 0) {
                    setAmountInput(cust.balance.toString());
                  }
                }}
                className="w-full p-2.5 text-xs font-semibold bg-white/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:outline-none"
                required
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — (Debe: S/ {c.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Método de Cobro:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'qr'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Yape / Plin / QR</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Monto a Cobrar (S/):
                </label>
                {activeCustomer && activeCustomer.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountInput(activeCustomer.balance.toString())}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Pagar todo (S/ {activeCustomer.balance.toFixed(2)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                  S/
                </span>
                <input
                  type="number"
                  step="0.10"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 bg-white/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow transition"
              >
                {isSubmitting ? 'Cobrando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
