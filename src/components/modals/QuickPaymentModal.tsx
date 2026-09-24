import React, { useState, useEffect } from 'react';
import { LiquidModal } from '../ui/LiquidModal';
import type { Customer, CreditTransaction } from '../../types/database';
import { db } from '../../lib/dexie';
import { useAuthStore, useActiveStoreId } from '../../store/authStore';
import { generateWhatsAppReceipt } from '../../features/transactions/whatsappHelper';
import { OperatorSelector } from '../ui/OperatorSelector';
import { GlassSelect } from '../ui/GlassSelect';
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

const sanitizeAmountInput = (value: string) => {
  const [whole = '', ...decimalParts] = value.replace(/[^\d.]/g, '').split('.');

  if (decimalParts.length === 0) {
    return whole;
  }

  return `${whole}.${decimalParts.join('').slice(0, 2)}`;
};

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  customer: preselectedCustomer,
  onSuccess,
}) => {
  const { currentOperatorName, storeSession } = useAuthStore();
  const activeStoreId = useActiveStoreId();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>(currentOperatorName || 'Martin');
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
      setOperatorName(currentOperatorName || 'Martin');

      db.customers.where('store_id').equals(activeStoreId).toArray().then((list) => {
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
  }, [isOpen, preselectedCustomer, currentOperatorName, activeStoreId]);

  const activeCustomer =
    allCustomers.find((c) => c.id === selectedCustomerId) || preselectedCustomer;

  // CTA guard: never offer "Confirmar Cobro" in an invalid state.
  // Mirrors handleSubmit validation so the button, not an error alert, is the first line of defense.
  const parsedAmount = parseFloat(amountInput);
  const currentDebt = activeCustomer?.balance ?? 0;
  const remainingBalance = Math.max(
    0,
    currentDebt - (Number.isNaN(parsedAmount) ? 0 : parsedAmount)
  );
  const isAmountValid =
    !Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= currentDebt;
  const isFormValid =
    Boolean(activeCustomer) && operatorName.trim().length > 0 && isAmountValid;

  let blockingReason = 'Confirmar Cobro';
  if (!activeCustomer) {
    blockingReason = 'Seleccione un cliente';
  } else if (currentDebt <= 0) {
    blockingReason = 'Este cliente no tiene deuda';
  } else if (!amountInput.trim()) {
    blockingReason = 'Ingrese un monto';
  } else if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    blockingReason = 'Monto mayor a cero';
  } else if (parsedAmount > currentDebt) {
    blockingReason = 'El monto supera la deuda';
  } else if (!operatorName.trim()) {
    blockingReason = 'Seleccione un operador';
  }

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

    if (amount > activeCustomer.balance) {
      setErrorMessage('El monto supera la deuda del cliente.');
      return;
    }

    setIsSubmitting(true);

    try {
      const txId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
      const now = new Date().toISOString();
      const storeId = activeCustomer.store_id || activeStoreId;

      const transaction: CreditTransaction = {
        id: txId,
        store_id: storeId,
        customer_id: activeCustomer.id,
        cashier_pin_hash: operatorName || 'Mostrador',
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
      title={completedTx ? '¡Cobro Registrado!' : 'Registrar Abono / Pago'}
      variant="bottom-sheet"
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

            <div className="p-4 bg-white/[0.10] backdrop-blur-md rounded-2xl border border-t-white/80 border-x-white/25 border-b-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] text-xs space-y-1.5 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Saldo pendiente restante:</span>
                <span className="font-bold text-slate-900">S/ {completedTx.customer.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Método de Cobro:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  {completedTx.transaction.payment_method === 'cash' ? 'Efectivo' : 'QR / Yape / Plin'}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-1.5 text-[11px]">
                <span className="text-slate-500 font-medium">Cobrado por:</span>
                <span className="font-bold text-slate-900">{completedTx.transaction.cashier_pin_hash}</span>
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

            {/* Customer Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                <span>Cliente que Abona</span>
              </label>
              <GlassSelect
                options={allCustomers.map((c) => ({ value: c.id, label: c.name }))}
                value={selectedCustomerId}
                onChange={(id) => {
                  setSelectedCustomerId(id);
                  const cust = allCustomers.find((c) => c.id === id);
                  setAmountInput(cust && cust.balance > 0 ? cust.balance.toString() : '');
                  setErrorMessage(null);
                }}
                ariaLabel="Cliente que Abona"
              />

              {activeCustomer && (
                <div
                  id="quick-payment-balance-context"
                  aria-live="polite"
                  className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-t-white/80 border-x-white/25 border-b-white/15 bg-white/[0.10] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-md"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Deuda actual
                    </p>
                    <p className="mt-0.5 text-sm font-black text-slate-900">
                      S/ {activeCustomer.balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l border-white/20 pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Saldo después del abono
                    </p>
                    <p className="mt-0.5 text-sm font-black text-emerald-700">
                      S/ {remainingBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Operator Selection (1-Touch Liquid Glass) */}
            <OperatorSelector
              selectedName={operatorName}
              onSelect={(name) => setOperatorName(name)}
              label="Cobrado por:"
            />

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Método de Cobro:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={paymentMethod === 'cash'}
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition backdrop-blur-md ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500/20 border-t-white/90 border-x-white/30 border-b-emerald-600/40 text-emerald-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]'
                      : 'bg-white/[0.10] border-t-white/70 border-x-white/25 border-b-white/15 text-slate-700 hover:bg-white/[0.18]'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  aria-pressed={paymentMethod === 'qr'}
                  onClick={() => setPaymentMethod('qr')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition backdrop-blur-md ${
                    paymentMethod === 'qr'
                      ? 'bg-blue-500/20 border-t-white/90 border-x-white/30 border-b-blue-600/40 text-blue-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]'
                      : 'bg-white/[0.10] border-t-white/70 border-x-white/25 border-b-white/15 text-slate-700 hover:bg-white/[0.18]'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Yape / Plin / QR</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="quick-payment-amount" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Monto a Cobrar (S/):
                </label>
                <div className="flex items-center gap-3">
                  {amountInput && (
                    <button
                      type="button"
                      onClick={() => setAmountInput('')}
                      className="text-[11px] font-bold text-slate-600 hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                  {activeCustomer && activeCustomer.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(activeCustomer.balance.toFixed(2))}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Pagar todo
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">
                  S/
                </span>
                <input
                  id="quick-payment-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountInput}
                  onChange={(e) => setAmountInput(sanitizeAmountInput(e.target.value))}
                  placeholder="0.00"
                  aria-describedby="quick-payment-balance-context"
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 bg-white/[0.15] backdrop-blur-md border border-t-white/80 border-x-white/25 border-b-white/15 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] focus:bg-white/[0.25] focus:ring-2 focus:ring-emerald-500/40 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="space-y-2 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="relative overflow-hidden w-full py-3.5 text-sm font-black text-white bg-gradient-to-b from-emerald-500/95 via-emerald-600/90 to-emerald-700/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-emerald-800/50 rounded-2xl shadow-[0_8px_20px_-2px_rgba(16,185,129,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(6,95,70,0.25)] hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.97] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/50 via-white/10 to-transparent" />
                <span className="relative z-10">
                  {isSubmitting ? 'Cobrando...' : blockingReason}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
