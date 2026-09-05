import React, { useState } from 'react';
import type { Customer, CreditTransaction } from '../../types/database';
import { db } from '../../lib/dexie';
import { useSessionStore } from '../session/sessionStore';
import { useAuthStore } from '../../store/authStore';
import { validateCreditLimit, validateTransactionForFCC } from './transactionRules';
import { DollarSign, QrCode, AlertCircle, ShoppingBag, ArrowDownLeft } from 'lucide-react';

export interface TransactionFormProps {
  customer: Customer;
  defaultType?: 'payment' | 'credit_purchase';
  onSuccess?: (transaction: CreditTransaction) => void;
  onCancel?: () => void;
  className?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  customer,
  defaultType = 'payment',
  onSuccess,
  onCancel,
  className = '',
}) => {
  const [transactionType, setTransactionType] = useState<'payment' | 'credit_purchase'>(defaultType);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { activeSession, recordPaymentToSession } = useSessionStore();
  const { activeCashier, storeSession } = useAuthStore();

  const availableCredit = Math.max(0, customer.credit_limit - customer.balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a cero.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Credit Purchase limit validation
      if (transactionType === 'credit_purchase') {
        const limitCheck = validateCreditLimit(customer, amount);
        if (!limitCheck.allowed) {
          setErrorMessage(
            limitCheck.error || `Insufficient credit limit: purchase exceeds available limit of $${availableCredit.toFixed(2)}`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // 2. FCC Cash Isolation validation
      if (transactionType === 'payment') {
        const fccCheck = validateTransactionForFCC(activeSession, {
          paymentMethod,
          amount,
          type: 'payment',
        });

        if (!fccCheck.allowed) {
          setErrorMessage(
            fccCheck.error || 'Sesión de caja activa requerida para transacciones en efectivo. Por favor, abrir caja primero.'
          );
          setIsSubmitting(false);
          return;
        }
      }

      const txId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
      const now = new Date().toISOString();
      const storeId = customer.store_id || storeSession?.storeId || 'store-default';
      const cashierPinHash = activeCashier?.pin || 'cashier-default';

      const transaction: CreditTransaction = {
        id: txId,
        store_id: storeId,
        customer_id: customer.id,
        cashier_pin_hash: cashierPinHash,
        total_amount: amount,
        status: 'completed',
        created_at: now,
        synced: false,
        type: transactionType,
        payment_method: transactionType === 'payment' ? paymentMethod : undefined,
        cashier_session_id: transactionType === 'payment' && paymentMethod === 'cash' ? activeSession?.id : undefined,
        notes: notes.trim() || undefined,
      };

      // 3. Update customer balance in IndexedDB
      let newCustomerBalance = customer.balance;
      if (transactionType === 'credit_purchase') {
        newCustomerBalance = customer.balance + amount;
      } else {
        newCustomerBalance = Math.max(0, customer.balance - amount);
      }

      const updatedCustomer: Customer = {
        ...customer,
        balance: newCustomerBalance,
      };

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

      // 4. Save transaction in IndexedDB
      await db.creditTransactions.put(transaction);

      await db.syncQueue.add({
        entity: 'credit_transactions',
        operation: 'INSERT',
        payload: transaction,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
      });

      // 5. Update cashier session totals if payment
      if (transactionType === 'payment') {
        recordPaymentToSession({
          amount,
          paymentMethod,
        });
      }

      setAmountInput('');
      setNotes('');
      onSuccess?.(transaction);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al registrar la transacción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 text-slate-800 ${className}`}>
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-100/90 border border-red-300 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Customer Info Card */}
      <div className="p-3 bg-white/70 border border-white/80 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 font-medium">Cliente</span>
          <p className="text-sm font-bold text-slate-900">{customer.name}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-medium">Disponible</span>
          <p className="text-sm font-bold text-emerald-700">${availableCredit.toFixed(2)}</p>
        </div>
      </div>

      {/* Transaction Type Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-2xl border border-white/40">
        <button
          type="button"
          onClick={() => {
            setTransactionType('payment');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
            transactionType === 'payment'
              ? 'bg-white shadow text-emerald-800'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          <span>Registrar Abono / Pago</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTransactionType('credit_purchase');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
            transactionType === 'credit_purchase'
              ? 'bg-white shadow text-amber-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-amber-600" />
          <span>Nuevo Fiado</span>
        </button>
      </div>

      {/* Payment Method Selector (Only for payments) */}
      {transactionType === 'payment' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Método de Cobro:</label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-white/60 border-white/80 hover:bg-white/80'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
                className="sr-only"
                aria-label="Efectivo (FCC)"
              />
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-900">Efectivo (FCC)</span>
                <span className="block text-[10px] text-slate-500">Afecta gaveta</span>
              </div>
            </label>

            <label
              className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                paymentMethod === 'qr'
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                  : 'bg-white/60 border-white/80 hover:bg-white/80'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="qr"
                checked={paymentMethod === 'qr'}
                onChange={() => setPaymentMethod('qr')}
                className="sr-only"
                aria-label="Pago QR / Transferencia"
              />
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-900">Pago QR / Digital</span>
                <span className="block text-[10px] text-slate-500">A tesorería</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-1">
        <label htmlFor="tx-amount-input" className="block text-xs font-semibold text-slate-700">
          Monto ($):
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-semibold">$</span>
          <input
            id="tx-amount-input"
            type="number"
            step="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.00"
            aria-label="Monto"
            className="w-full pl-8 pr-4 py-2.5 bg-white/80 border border-white/80 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            required
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/30">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-white/40 transition"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow transition ${
            transactionType === 'payment'
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
          }`}
        >
          {transactionType === 'payment' ? 'Registrar Pago / Confirmar' : 'Registrar Fiado / Confirmar Fiado'}
        </button>
      </div>
    </form>
  );
};
