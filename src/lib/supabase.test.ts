import { describe, it, expect } from 'vitest';
import { supabase, createSupabaseClient } from './supabase';
import type { Profile, Customer, Product, CreditTransaction, TransactionItem } from '../types/database';

describe('Supabase Client and Database Types', () => {
  it('exports an initialized supabase client instance', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
  });

  it('allows creating custom supabase client with custom url and key', () => {
    const customClient = createSupabaseClient('https://custom-project.supabase.co', 'custom-key-123');
    expect(customClient).toBeDefined();
    expect(typeof customClient.from).toBe('function');
    const query = customClient.from('customers').select('*');
    expect(query).toBeDefined();
    expect(typeof query.then).toBe('function');
  });

  it('verifies Database schema types conform to expected structures', () => {
    const mockProfile: Profile = {
      id: 'usr-123',
      store_name: 'Ambar Minimarket',
      created_at: '2026-09-05T12:00:00Z',
    };

    const mockCustomer: Customer = {
      id: 'cust-123',
      store_id: 'usr-123',
      name: 'Maria Rossi',
      phone: '+5491100001111',
      credit_limit: 50000,
      balance: 1500,
      created_at: '2026-09-05T12:00:00Z',
    };

    const mockProduct: Product = {
      id: 'prod-123',
      store_id: 'usr-123',
      name: 'Jamon Cocido kg',
      price: 9500,
      sku: 'JAM-01',
      created_at: '2026-09-05T12:00:00Z',
    };

    const mockTransaction: CreditTransaction = {
      id: 'tx-123',
      store_id: 'usr-123',
      customer_id: 'cust-123',
      cashier_pin_hash: 'hash-abc',
      total_amount: 4750,
      status: 'completed',
      created_at: '2026-09-05T12:00:00Z',
      synced: true,
    };

    const mockItem: TransactionItem = {
      id: 'item-123',
      transaction_id: 'tx-123',
      product_id: 'prod-123',
      quantity: 0.5,
      unit_price: 9500,
    };

    expect(mockProfile.store_name).toBe('Ambar Minimarket');
    expect(mockCustomer.credit_limit).toBe(50000);
    expect(mockProduct.price).toBe(9500);
    expect(mockTransaction.total_amount).toBe(4750);
    expect(mockItem.quantity).toBe(0.5);
  });
});
