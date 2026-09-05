import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../lib/dexie';
import {
  createCreditAccount,
  recordCreditPurchase,
  recordCreditPayment,
  getCustomerCreditAccount,
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
});
