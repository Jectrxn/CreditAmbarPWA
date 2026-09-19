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
  Users,
  Wallet,
  FileText,
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

  // CTA guard: never offer "Confirmar Fiado" in an invalid state.
  // Mirrors handleSubmit validation so the button, not an error alert, is the first line of defense.
  const parsedAmount = parseFloat(amountInput);
  const isAmountValid =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= availableCredit;
  const isFormValid =
    Boolean(activeCustomer) && operatorName.trim().length > 0 && isAmountValid;

  // Live balance preview: show the operator the resulting debt BEFORE confirming.
  const showBalancePreview =
    Boolean(activeCustomer) && !isNaN(parsedAmount) && parsedAmount > 0;
  const previewOverBy = showBalancePreview ? parsedAmount - availableCredit : 0;
  const isOverLimit = previewOverBy > 0;
  const previewNewBalance = activeCustomer
    ? activeCustomer.balance + (showBalancePreview ? parsedAmount : 0)
    : 0;
  const previewRemaining = activeCustomer
    ? Math.max(0, availableCredit - (showBalancePreview ? parsedAmount : 0))
    : 0;

  // Kiosk speed: quick-add chips sum onto the current amount.
  const QUICK_AMOUNTS = [10, 20, 50];
  const addQuickAmount = (delta: number) => {
    const current = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
    setAmountInput(String(Math.round((current + delta) * 100) / 100));
  };

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
      title={completedTx ? '¡Fiado Registrado!' : 'Registrar Nuevo Fiado'}
      variant="bottom-sheet"
      maxWidth="md"
    >
      <div className="py-1 space-y-4">
        {completedTx ? (
          /* ─── SUCCESS STATE ─── */
          <div className="text-center space-y-4 py-2">
            {/* Success Orb */}
            <div className="relative w-14 h-14 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fde68a_0%,#f59e0b_55%,#d97706_100%)] shadow-[0_8px_22px_rgba(245,158,11,0.40),inset_0_1.5px_2px_rgba(255,255,255,0.95)] border border-white/80" />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.2)_35%,transparent_60%)] pointer-events-none"
              />
              <CheckCircle2 className="absolute inset-0 m-auto w-7 h-7 text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Fiado guardado correctamente</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Se agregaron <span className="font-bold text-amber-700">S/ {completedTx.transaction.total_amount.toFixed(2)}</span> a la cuenta de {completedTx.customer.name}.
              </p>
            </div>

            {/* Summary Glass Card */}
            <div className="p-4 bg-white/[0.40] backdrop-blur-[14px] rounded-2xl border border-white/70 border-t-white/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.04)] text-xs space-y-1.5 text-left max-w-sm mx-auto">
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
              <div className="flex justify-between border-t border-white/40 pt-1.5 text-[11px]">
                <span className="text-slate-500 font-medium">Atendido por:</span>
                <span className="font-bold text-slate-900">{completedTx.transaction.cashier_pin_hash}</span>
              </div>
              {completedTx.transaction.notes && (
                <div className="flex justify-between border-t border-white/40 pt-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">Detalle:</span>
                  <span className="font-medium text-slate-800">{completedTx.transaction.notes}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
              <a
                href={generateWhatsAppReceipt(
                  completedTx.transaction,
                  completedTx.customer,
                  storeSession?.storeName || 'Ámbar Bodega'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-xs font-black text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-2xl border border-t-white/80 border-b-emerald-700/50 shadow-[0_4px_12px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.7)] transition active:scale-[0.97] cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Recibo por WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-2xl transition cursor-pointer active:scale-[0.97]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* ─── FORM STATE ─── */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50/80 backdrop-blur-md border border-rose-200 rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ── Customer Select ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Cliente</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-3 text-sm font-semibold text-slate-900 bg-white/[0.50] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all appearance-none cursor-pointer"
                required
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Dynamic Credit Info Chip */}
              {activeCustomer && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold text-amber-800/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Deuda: S/ {activeCustomer.balance.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Disponible: S/ {availableCredit.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* ── Operator / Atendido por (compact row: no vertical push) ── */}
            <OperatorSelector
              selectedName={operatorName}
              onSelect={(name) => setOperatorName(name)}
              layout="row"
            />

            {/* ── Amount ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Monto Total (S/)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400 pointer-events-none">
                  S/
                </span>
                <input
                  type="number"
                  step="0.10"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 text-lg font-bold text-slate-900 bg-white/[0.50] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* ── Quick-add chips (kiosk speed) ── */}
              <div className="flex items-center gap-1.5 mt-1.5" role="group" aria-label="Montos rápidos">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => addQuickAmount(q)}
                    className="px-2.5 py-1 text-[11px] font-black text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 rounded-full border border-amber-400/30 transition cursor-pointer"
                  >
                    +{q}
                  </button>
                ))}
              </div>

              {/* ── Live balance preview ── */}
              {showBalancePreview &&
                (isOverLimit ? (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-rose-700"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Excede el disponible por S/ {previewOverBy.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-600"
                  >
                    <span>
                      Nuevo saldo:{' '}
                      <span className="font-bold text-slate-900">
                        S/ {previewNewBalance.toFixed(2)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>
                      Restante:{' '}
                      <span className="font-bold text-emerald-700">
                        S/ {previewRemaining.toFixed(2)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>

            {/* ── Products / Notes ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Detalle del Fiado</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej. 1 Arroz costeño, 1 Aceite Primor, 2 Leche Gloria..."
                className="w-full p-3 text-sm bg-white/[0.50] backdrop-blur-md border border-white/80 border-b-white/40 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:bg-white/[0.70] focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* ── Submit Buttons ── */}
            <div className="space-y-2 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="relative overflow-hidden w-full py-3.5 text-sm font-black text-slate-950 bg-gradient-to-b from-amber-400/95 via-amber-500/90 to-amber-600/85 backdrop-blur-[14px] border-t-2 border-t-white/95 border-x border-x-white/40 border-b border-b-amber-700/50 rounded-2xl shadow-[0_8px_20px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(180,83,9,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {/* Specular highlight */}
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/50 via-white/10 to-transparent" />
                <span className="relative z-10">{isSubmitting ? 'Guardando...' : 'Confirmar Fiado'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </LiquidModal>
  );
};
