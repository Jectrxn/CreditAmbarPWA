import { db } from '../../lib/dexie';
import type { Customer, CreditTransaction } from '../../types/database';
import type { DraftItem } from '../../components/modals/ProductPicker';
import { validateCreditLimit, AUDIT_GRACE_PERIOD_MS } from '../transactions/transactionRules';
import { roundToCents } from '../../utils/money';
import { syncManager } from '../../lib/syncManager';

export const DEFAULT_CREDIT_LIMIT = 100;

export interface CreateCreditAccountParams {
  storeId: string;
  name: string;
  phone?: string;
  creditLimit?: number;
}

export interface CreditOperationResult {
  success: boolean;
  customer?: Customer;
  error?: string;
}

/**
 * Creates a new credit account for a customer under the current store.
 * Enforces zero initial balance, default credit limit, and duplicate prevention.
 */
export async function createCreditAccount({
  storeId,
  name,
  phone,
  creditLimit = DEFAULT_CREDIT_LIMIT,
}: CreateCreditAccountParams): Promise<Customer> {
  const trimmedName = name.trim();
  const trimmedPhone = phone?.trim();

  // Duplicate check: customer with exact same name or phone in this store
  const existingCustomers = await db.customers.where('store_id').equals(storeId).toArray();
  const duplicate = existingCustomers.find((c) => {
    const sameName = c.name.toLowerCase() === trimmedName.toLowerCase();
    const samePhone = trimmedPhone && c.phone && c.phone === trimmedPhone;
    return sameName || samePhone;
  });

  if (duplicate) {
    throw new Error('Customer already has an active account');
  }

  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}`;
  const now = new Date().toISOString();

  const newCustomer: Customer = {
    id,
    store_id: storeId,
    name: trimmedName,
    phone: trimmedPhone,
    credit_limit: creditLimit,
    balance: 0,
    created_at: now,
  };

  await db.customers.put({
    ...newCustomer,
    synced: false,
  });

  await db.syncQueue.add({
    entity: 'customers',
    operation: 'INSERT',
    payload: newCustomer,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  });

  return newCustomer;
}

/**
 * Minimal cross-store guard: when the caller scopes to an active store,
 * refuse to operate on a customer record owned by another store.
 */
function assertSameStore(customer: Customer, expectedStoreId?: string): void {
  if (expectedStoreId !== undefined && customer.store_id !== expectedStoreId) {
    throw new Error('Customer belongs to a different store');
  }
}

/**
 * Retrieves a customer credit account by ID from local IndexedDB.
 */
export async function getCustomerCreditAccount(
  customerId: string,
  expectedStoreId?: string
): Promise<Customer | undefined> {
  const customer = await db.customers.get(customerId);
  if (customer) {
    assertSameStore(customer, expectedStoreId);
  }
  return customer;
}

/**
 * Lists all customers for a given store.
 */
export async function listCustomers(storeId: string): Promise<Customer[]> {
  return await db.customers.where('store_id').equals(storeId).toArray();
}

export interface UpdateCustomerParams {
  name?: string;
  phone?: string;
  creditLimit?: number;
}

/**
 * Updates an existing customer profile/limits and queues sync.
 */
export async function updateCustomer(
  customerId: string,
  updates: UpdateCustomerParams,
  expectedStoreId?: string
): Promise<Customer> {
  const customer = await db.customers.get(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }
  assertSameStore(customer, expectedStoreId);

  const updatedCustomer: Customer = {
    ...customer,
    ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim() || undefined } : {}),
    ...(updates.creditLimit !== undefined ? { credit_limit: updates.creditLimit } : {}),
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

  return updatedCustomer;
}

/**
 * Records a new credit purchase (fiado) for a customer.
 * Enforces credit limit check.
 */
export async function recordCreditPurchase(
  customerId: string,
  amount: number,
  expectedStoreId?: string
): Promise<CreditOperationResult> {
  const customer = await db.customers.get(customerId);
  if (!customer) {
    return {
      success: false,
      error: 'Customer not found',
    };
  }

  try {
    assertSameStore(customer, expectedStoreId);
  } catch {
    return {
      success: false,
      error: 'Customer belongs to a different store',
    };
  }

  const limitCheck = validateCreditLimit(customer, amount);
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: limitCheck.error,
    };
  }

  const updatedCustomer: Customer = {
    ...customer,
    balance: limitCheck.newBalance,
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

  return {
    success: true,
    customer: updatedCustomer,
  };
}

/**
 * Records a customer payment / abono against their outstanding balance.
 * Reduces the balance and frees up available credit limit.
 */
export async function recordCreditPayment(
  customerId: string,
  amount: number,
  expectedStoreId?: string
): Promise<CreditOperationResult> {
  const customer = await db.customers.get(customerId);
  if (!customer) {
    return {
      success: false,
      error: 'Customer not found',
    };
  }

  try {
    assertSameStore(customer, expectedStoreId);
  } catch {
    return {
      success: false,
      error: 'Customer belongs to a different store',
    };
  }

  if (amount <= 0 || isNaN(amount)) {
    return {
      success: false,
      error: 'Payment amount must be greater than zero',
    };
  }

  const newBalance = Math.max(0, customer.balance - amount);
  const updatedCustomer: Customer = {
    ...customer,
    balance: newBalance,
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

  return {
    success: true,
    customer: updatedCustomer,
  };
}

export interface RegisterCreditSaleParams {
  operationId: string; // idempotency key; also used as the transaction id
  storeId: string; // active store; the customer must belong to it
  customerId: string;
  amount: number;
  operatorName: string;
  items: DraftItem[];
  notes?: string; // already-derived notes string
  now?: Date; // injectable for tests
}

export type RegisterCreditSaleResult =
  | { ok: true; transaction: CreditTransaction; customer: Customer; replayed: boolean }
  | { ok: false; error: string };

/**
 * Registers a credit sale (fiado) as a single atomic, idempotent operation.
 *
 * Everything — the idempotency check, the customer re-read, the credit
 * limit check, and every write (customer balance, transaction, items, sync
 * queue entries) — happens inside one Dexie `rw` transaction, so a failure
 * anywhere inside rolls back all of it: no partial state. The customer
 * balance used is whatever is stored at submit time, not whatever the
 * caller last observed when it opened the form, which closes the
 * lost-update window a plain read-then-write would have.
 *
 * Replaying the same `operationId` (e.g. a double-submit that still reaches
 * this function) performs no writes and returns the already-recorded
 * transaction with `replayed: true`.
 */
export async function registerCreditSale(
  params: RegisterCreditSaleParams
): Promise<RegisterCreditSaleResult> {
  try {
    const result = await db.transaction(
      'rw',
      db.customers,
      db.creditTransactions,
      db.transactionItems,
      db.syncQueue,
      async (): Promise<RegisterCreditSaleResult> => {
        const { operationId, storeId, customerId, operatorName, items, notes } = params;
        const now = params.now ?? new Date();

        // Idempotency: a replay of an operation that already landed returns
        // the existing result untouched — no second write.
        const existingTx = await db.creditTransactions.get(operationId);
        if (existingTx) {
          // A replay must describe the same sale; otherwise the new sale would be
          // silently dropped while the caller reports success.
          const isSameSale =
            existingTx.customer_id === customerId &&
            existingTx.store_id === storeId &&
            existingTx.total_amount === roundToCents(params.amount);
          if (!isSameSale) {
            return {
              ok: false,
              error: 'Esta operación ya fue registrada con otros datos. Cierre y vuelva a abrir el formulario.',
            };
          }
          const currentCustomer = await db.customers.get(existingTx.customer_id);
          if (!currentCustomer) {
            return { ok: false, error: 'Cliente no encontrado.' };
          }
          return {
            ok: true,
            replayed: true,
            transaction: existingTx,
            customer: currentCustomer,
          };
        }

        // Re-read the customer inside the transaction: the balance used is
        // whatever is stored right now, not whatever the caller opened with.
        const customer = await db.customers.get(customerId);
        if (!customer) {
          return { ok: false, error: 'Cliente no encontrado.' };
        }
        if (customer.store_id !== storeId) {
          return { ok: false, error: 'El cliente pertenece a otra tienda.' };
        }

        const amount = roundToCents(params.amount);
        if (amount <= 0) {
          return { ok: false, error: 'Ingrese un monto válido mayor a cero.' };
        }

        const limitCheck = validateCreditLimit(customer, amount);
        if (!limitCheck.allowed) {
          // Same wording as the modal's own guard: this message reaches the Spanish UI.
          const available = Math.max(0, roundToCents(customer.credit_limit - customer.balance));
          return {
            ok: false,
            error: `El monto (S/ ${amount.toFixed(2)}) supera el crédito disponible del cliente (S/ ${available.toFixed(2)}).`,
          };
        }

        const nowIso = now.toISOString();
        const transaction: CreditTransaction = {
          id: operationId,
          store_id: storeId,
          customer_id: customer.id,
          cashier_pin_hash: operatorName || 'mostrador',
          total_amount: amount,
          status: 'completed',
          created_at: nowIso,
          synced: false,
          type: 'credit_purchase',
          notes: notes || undefined,
        };

        const updatedCustomer: Customer = {
          ...customer,
          balance: limitCheck.newBalance,
        };

        // 1. Update customer balance
        await db.customers.put({ ...updatedCustomer, synced: false });
        await db.syncQueue.add({
          entity: 'customers',
          operation: 'UPDATE',
          payload: updatedCustomer,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });

        // 2. Add the transaction
        await db.creditTransactions.put(transaction);
        await db.syncQueue.add({
          entity: 'credit_transactions',
          operation: 'INSERT',
          payload: transaction,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });

        // 3. Persist structured detail rows + queue each one for sync.
        // Rows without a productId (should not happen: the picker always
        // resolves one) still survive as derived notes text above.
        for (const [idx, item] of items.entries()) {
          if (!item.productId) continue;
          const itemId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `item-${Date.now()}-${idx}`;
          const txItem = {
            id: itemId,
            transaction_id: operationId,
            product_id: item.productId,
            quantity: item.qty,
            unit_price: item.unitPrice,
          };
          await db.transactionItems.put({ ...txItem, synced: false });
          await db.syncQueue.add({
            entity: 'transaction_items',
            operation: 'INSERT',
            payload: txItem,
            createdAt: Date.now(),
            retryCount: 0,
            status: 'pending',
          });
        }

        return { ok: true, replayed: false, transaction, customer: updatedCustomer };
      }
    );

    if (result.ok) {
      // Best-effort: never block the caller on the network round trip.
      syncManager.requestSync();
    }

    return result;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar el fiado.' };
  }
}

export interface VoidCreditSaleParams {
  operationId: string; // the credit_transaction id to void
  storeId: string; // active store; the transaction must belong to it
  reason?: string; // defaults to a generic "voided from the sale" reason
  now?: Date; // injectable for tests
}

export type VoidCreditSaleResult =
  | { ok: true; transaction: CreditTransaction; customer: Customer; replayed: boolean }
  | { ok: false; error: string };

/**
 * Voids a credit sale (fiado) as a single atomic, idempotent operation.
 *
 * Mirrors the manual cancel flow on the History page (same shape for the
 * cancelled transaction and the restored balance, same sync queue UPDATEs)
 * but does it inside one Dexie `rw` transaction: the transaction re-read,
 * the store/type/status/grace-window checks, and every write (transaction,
 * customer balance, sync queue entries) happen atomically, so a failure
 * anywhere inside rolls back all of it.
 *
 * Voiding an already-cancelled transaction performs no writes and returns
 * the already-cancelled transaction with `replayed: true`.
 */
export async function voidCreditSale(
  params: VoidCreditSaleParams
): Promise<VoidCreditSaleResult> {
  try {
    const result = await db.transaction(
      'rw',
      db.creditTransactions,
      db.customers,
      db.syncQueue,
      async (): Promise<VoidCreditSaleResult> => {
        const { operationId, storeId } = params;
        const now = params.now ?? new Date();

        const tx = await db.creditTransactions.get(operationId);
        if (!tx) {
          return { ok: false, error: 'Fiado no encontrado.' };
        }
        if (tx.store_id !== storeId) {
          return { ok: false, error: 'El fiado pertenece a otra tienda.' };
        }
        if (tx.type !== 'credit_purchase') {
          return { ok: false, error: 'Solo se pueden anular fiados.' };
        }

        if (tx.status === 'cancelled') {
          // Idempotent replay: already voided, describe it, touch nothing.
          const currentCustomer = await db.customers.get(tx.customer_id);
          if (!currentCustomer) {
            return { ok: false, error: 'Cliente no encontrado.' };
          }
          return { ok: true, replayed: true, transaction: tx, customer: currentCustomer };
        }

        if (tx.status !== 'completed') {
          return { ok: false, error: 'Solo se pueden anular fiados completados.' };
        }

        const createdMs = new Date(tx.created_at).getTime();
        const elapsedMs = now.getTime() - createdMs;
        if (elapsedMs >= AUDIT_GRACE_PERIOD_MS) {
          return { ok: false, error: 'La ventana de 10 minutos para anular ha expirado.' };
        }

        const customer = await db.customers.get(tx.customer_id);
        if (!customer) {
          return { ok: false, error: 'Cliente no encontrado.' };
        }

        const updatedTx: CreditTransaction = {
          ...tx,
          status: 'cancelled',
          edit_reason: params.reason ?? 'Anulado desde el registro del fiado',
          updated_at: now.toISOString(),
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

        const newBalance = Math.max(0, roundToCents(customer.balance - tx.total_amount));
        const updatedCustomer: Customer = {
          ...customer,
          balance: newBalance,
        };

        await db.customers.put({ ...updatedCustomer, synced: false });
        await db.syncQueue.add({
          entity: 'customers',
          operation: 'UPDATE',
          payload: updatedCustomer,
          createdAt: Date.now(),
          retryCount: 0,
          status: 'pending',
        });

        return { ok: true, replayed: false, transaction: updatedTx, customer: updatedCustomer };
      }
    );

    if (result.ok) {
      // Best-effort: never block the caller on the network round trip.
      syncManager.requestSync();
    }

    return result;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al anular el fiado.' };
  }
}
