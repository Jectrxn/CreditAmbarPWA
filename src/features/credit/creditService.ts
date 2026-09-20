import { db } from '../../lib/dexie';
import type { Customer } from '../../types/database';
import { validateCreditLimit } from '../transactions/transactionRules';

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
