import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../lib/dexie';
import {
  createCreditAccount,
  recordCreditPurchase,
  recordCreditPayment,
  getCustomerCreditAccount,
  registerCreditSale,
  DEFAULT_CREDIT_LIMIT,
} from './creditService';

describe('creditService - Account Creation & Limit Enforcement', () => {
  beforeEach(async () => {
    await db.customers.clear();
    await db.syncQueue.clear();
  });

  describe('Account Creation (Requirement 1: credit-management)', () => {
    it('initializes new customer account with zero balance and default credit limit', async () => {
      const customer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Juan Perez',
        phone: '+51987654321',
      });

      expect(customer).toBeDefined();
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('Juan Perez');
      expect(customer.phone).toBe('+51987654321');
      expect(customer.balance).toBe(0); // Zero balance
      expect(customer.credit_limit).toBe(DEFAULT_CREDIT_LIMIT); // Default limit

      // Saved in Dexie DB
      const stored = await db.customers.get(customer.id);
      expect(stored).toBeDefined();
      expect(stored?.balance).toBe(0);

      // Queued for offline sync
      const queued = await db.syncQueue.where('entity').equals('customers').first();
      expect(queued).toBeDefined();
      expect(queued?.operation).toBe('INSERT');
    });

    it('allows custom credit limit when specified during account creation', async () => {
      const customer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Rosa Gomez',
        creditLimit: 300,
      });

      expect(customer.credit_limit).toBe(300);
      expect(customer.balance).toBe(0);
    });

    it('rejects duplicate credit account creation for the same customer', async () => {
      await createCreditAccount({
        storeId: 'store-1',
        name: 'Carlos Ruiz',
        phone: '+51999111222',
      });

      await expect(
        createCreditAccount({
          storeId: 'store-1',
          name: 'Carlos Ruiz',
          phone: '+51999111222',
        })
      ).rejects.toThrow(/Customer already has an active account/i);
    });

    it('allows same customer name under a different store (cross-store isolation)', async () => {
      const customer1 = await createCreditAccount({
        storeId: 'store-1',
        name: 'Carlos Ruiz',
      });

      const customer2 = await createCreditAccount({
        storeId: 'store-2',
        name: 'Carlos Ruiz',
      });

      expect(customer1.id).not.toBe(customer2.id);
    });
  });

  describe('Credit Limit Enforcement (Requirement 2: credit-management)', () => {
    let testCustomer: any;

    beforeEach(async () => {
      testCustomer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Elena Ramos',
        creditLimit: 100,
      });
    });

    it('approves credit purchase within available limit and increments balance', async () => {
      const result = await recordCreditPurchase(testCustomer.id, 50);

      expect(result.success).toBe(true);
      expect(result.customer?.balance).toBe(50);
      expect(result.customer?.credit_limit).toBe(100);

      const updated = await getCustomerCreditAccount(testCustomer.id);
      expect(updated?.balance).toBe(50);
    });

    it('rejects purchase that exceeds customer credit limit and leaves balance unchanged', async () => {
      const result = await recordCreditPurchase(testCustomer.id, 150);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/insufficient credit limit|exceeds/i);

      const unchanged = await getCustomerCreditAccount(testCustomer.id);
      expect(unchanged?.balance).toBe(0);
    });

    it('approves multiple sequential purchases until limit is fully exhausted', async () => {
      const p1 = await recordCreditPurchase(testCustomer.id, 40);
      expect(p1.success).toBe(true);
      expect(p1.customer?.balance).toBe(40);

      const p2 = await recordCreditPurchase(testCustomer.id, 60);
      expect(p2.success).toBe(true);
      expect(p2.customer?.balance).toBe(100);

      // Next purchase of even $1 must fail
      const p3 = await recordCreditPurchase(testCustomer.id, 1);
      expect(p3.success).toBe(false);
      expect(p3.error).toMatch(/insufficient credit limit|exceeds/i);
    });

    it('restores available limit when a credit payment (abono) is recorded', async () => {
      await recordCreditPurchase(testCustomer.id, 80);
      let current = await getCustomerCreditAccount(testCustomer.id);
      expect(current?.balance).toBe(80);

      const payResult = await recordCreditPayment(testCustomer.id, 50);
      expect(payResult.success).toBe(true);
      expect(payResult.customer?.balance).toBe(30);

      // Now customer can purchase up to $70 again (100 - 30)
      const purchaseAfterPayment = await recordCreditPurchase(testCustomer.id, 70);
      expect(purchaseAfterPayment.success).toBe(true);
      expect(purchaseAfterPayment.customer?.balance).toBe(100);
    });

    it('rejects credit purchase for non-existent customer', async () => {
      const result = await recordCreditPurchase('non-existent-uuid', 50);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/customer not found/i);
    });
  });

  describe('Active-store guard (T3)', () => {
    it('getCustomerCreditAccount throws when the customer belongs to another store', async () => {
      const customer = await createCreditAccount({ storeId: 'store-1', name: 'Guarded One' });
      await expect(getCustomerCreditAccount(customer.id, 'store-test')).rejects.toThrow(
        /different store/i
      );
    });

    it('updateCustomer throws when the customer belongs to another store', async () => {
      const { updateCustomer } = await import('./creditService');
      const customer = await createCreditAccount({ storeId: 'store-1', name: 'Guarded Two' });
      await expect(
        updateCustomer(customer.id, { name: 'Hacked' }, 'store-test')
      ).rejects.toThrow(/different store/i);
    });

    it('recordCreditPurchase fails when the customer belongs to another store', async () => {
      const customer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Guarded Three',
        creditLimit: 500,
      });
      const result = await recordCreditPurchase(customer.id, 50, 'store-test');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/different store/i);
    });

    it('recordCreditPayment fails when the customer belongs to another store', async () => {
      const customer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Guarded Four',
        creditLimit: 500,
      });
      const result = await recordCreditPayment(customer.id, 10, 'store-test');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/different store/i);
    });
  });

  describe('registerCreditSale (atomic, idempotent use case)', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    let customer: Awaited<ReturnType<typeof createCreditAccount>>;

    beforeEach(async () => {
      await db.creditTransactions.clear();
      await db.transactionItems.clear();
      customer = await createCreditAccount({
        storeId: 'store-1',
        name: 'Fiado Customer',
        creditLimit: 100,
      });
      // createCreditAccount above queues its own INSERT; clear it so each
      // test's syncQueue assertions only see entries from registerCreditSale.
      await db.syncQueue.clear();
    });

    it('writes transaction, items, rounded balance and queue entries on the happy path', async () => {
      const result = await registerCreditSale({
        operationId: 'op-1',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 0.1 + 0.2, // classic float drift -> must round to 0.3
        operatorName: 'Martin',
        items: [{ productId: 'prod-1', name: 'Arroz', qty: 1, unitPrice: 0.3 }],
        notes: '1× Arroz',
        now,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok result');
      expect(result.replayed).toBe(false);
      expect(result.transaction.id).toBe('op-1');
      expect(result.transaction.total_amount).toBe(0.3);
      expect(result.transaction.type).toBe('credit_purchase');
      expect(result.transaction.cashier_pin_hash).toBe('Martin');
      expect(result.customer.balance).toBe(0.3);

      const storedTx = await db.creditTransactions.get('op-1');
      expect(storedTx?.total_amount).toBe(0.3);
      expect(storedTx?.type).toBe('credit_purchase');
      expect(storedTx?.status).toBe('completed');
      expect(storedTx?.notes).toBe('1× Arroz');
      expect(storedTx?.synced).toBe(false);

      const storedCustomer = await db.customers.get(customer.id);
      expect(storedCustomer?.balance).toBe(0.3);
      expect(storedCustomer?.synced).toBe(false);

      const items = await db.transactionItems.where('transaction_id').equals('op-1').toArray();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ product_id: 'prod-1', quantity: 1, unit_price: 0.3 });

      expect(await db.syncQueue.where('entity').equals('customers').count()).toBe(1);
      expect(await db.syncQueue.where('entity').equals('credit_transactions').count()).toBe(1);
      expect(await db.syncQueue.where('entity').equals('transaction_items').count()).toBe(1);
    });

    it('uses the balance stored at submit time, not an older value the caller opened with', async () => {
      // Caller "opened" the modal when balance was 0; it changed meanwhile
      // (another screen, or a completed sync) to 40 before this call commits.
      await db.customers.update(customer.id, { balance: 40 });

      const result = await registerCreditSale({
        operationId: 'op-stale',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 30,
        operatorName: 'Martin',
        items: [],
        now,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok result');
      expect(result.customer.balance).toBe(70); // 40 + 30, not 0 + 30
    });

    it('refuses an over-limit purchase and writes nothing', async () => {
      const result = await registerCreditSale({
        operationId: 'op-over',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 150,
        operatorName: 'Martin',
        items: [],
        now,
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error).toMatch(/El monto \(S\/ 150\.00\) supera el crédito disponible del cliente/);
      const storedCustomer = await db.customers.get(customer.id);
      expect(storedCustomer?.balance).toBe(0);
      expect(await db.creditTransactions.count()).toBe(0);
      expect(await db.syncQueue.count()).toBe(0);
    });

    it('is idempotent: replaying the same operationId returns the existing transaction with no new writes', async () => {
      const first = await registerCreditSale({
        operationId: 'op-dup',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 20,
        operatorName: 'Martin',
        items: [],
        now,
      });
      expect(first.ok).toBe(true);

      const second = await registerCreditSale({
        operationId: 'op-dup',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 20,
        operatorName: 'Martin',
        items: [],
        now,
      });

      expect(second.ok).toBe(true);
      if (!second.ok) throw new Error('expected ok result');
      expect(second.replayed).toBe(true);

      expect(await db.creditTransactions.count()).toBe(1);
      const storedCustomer = await db.customers.get(customer.id);
      expect(storedCustomer?.balance).toBe(20); // incremented once, not twice
    });

    it('rolls back all writes when an inner write throws', async () => {
      const putSpy = vi
        .spyOn(db.transactionItems, 'put')
        .mockRejectedValueOnce(new Error('boom'));

      const result = await registerCreditSale({
        operationId: 'op-rollback',
        storeId: 'store-1',
        customerId: customer.id,
        amount: 10,
        operatorName: 'Martin',
        items: [{ productId: 'prod-x', name: 'X', qty: 1, unitPrice: 10 }],
        now,
      });

      expect(result.ok).toBe(false);

      const storedCustomer = await db.customers.get(customer.id);
      expect(storedCustomer?.balance).toBe(0);
      expect(await db.creditTransactions.count()).toBe(0);
      expect(await db.transactionItems.count()).toBe(0);
      expect(await db.syncQueue.count()).toBe(0);

      putSpy.mockRestore();
    });

    it('refuses a customer that belongs to a different store', async () => {
      const result = await registerCreditSale({
        operationId: 'op-cross-store',
        storeId: 'store-other',
        customerId: customer.id,
        amount: 10,
        operatorName: 'Martin',
        items: [],
        now,
      });

      expect(result.ok).toBe(false);
      const storedCustomer = await db.customers.get(customer.id);
      expect(storedCustomer?.balance).toBe(0);
      expect(await db.creditTransactions.count()).toBe(0);
    });
  });
});
