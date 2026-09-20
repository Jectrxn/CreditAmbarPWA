import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../lib/dexie';
import { searchProducts, createProduct } from './productService';

describe('productService - Catalog Search & Creation', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.syncQueue.clear();
  });

  describe('searchProducts', () => {
    it('returns [] for an empty or blank query', async () => {
      await db.products.put({
        id: 'prod-1',
        store_id: 'store-1',
        name: 'Arroz costeño',
        price: 5.5,
        created_at: new Date().toISOString(),
        synced: false,
      });

      expect(await searchProducts('store-1', '')).toEqual([]);
      expect(await searchProducts('store-1', '   ')).toEqual([]);
    });

    it('matches case-insensitive substrings scoped by store, most recent first', async () => {
      await db.products.bulkPut([
        {
          id: 'prod-old',
          store_id: 'store-1',
          name: 'Arroz costeño',
          price: 5.5,
          created_at: '2026-01-01T00:00:00.000Z',
          synced: false,
        },
        {
          id: 'prod-new',
          store_id: 'store-1',
          name: 'ARROZ integral',
          price: 7.0,
          created_at: '2026-06-01T00:00:00.000Z',
          synced: false,
        },
        {
          id: 'prod-mid',
          store_id: 'store-1',
          name: 'Arroz con leche packs',
          price: 3.0,
          created_at: '2026-03-01T00:00:00.000Z',
          synced: false,
        },
        {
          id: 'prod-other-store',
          store_id: 'store-2',
          name: 'Arroz costeño',
          price: 5.5,
          created_at: '2026-09-01T00:00:00.000Z',
          synced: false,
        },
        {
          id: 'prod-no-match',
          store_id: 'store-1',
          name: 'Aceite Primor',
          price: 12.0,
          created_at: '2026-09-01T00:00:00.000Z',
          synced: false,
        },
      ]);

      const results = await searchProducts('store-1', 'ARR');
      expect(results.map((p) => p.id)).toEqual(['prod-new', 'prod-mid', 'prod-old']);
    });

    it('caps results at 8', async () => {
      await db.products.bulkPut(
        Array.from({ length: 10 }, (_, i) => ({
          id: `prod-${i}`,
          store_id: 'store-1',
          name: `Producto ${i}`,
          price: i,
          created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
          synced: false as const,
        }))
      );

      const results = await searchProducts('store-1', 'producto');
      expect(results).toHaveLength(8);
      // Most recent first: prod-9 .. prod-2
      expect(results[0].id).toBe('prod-9');
      expect(results[7].id).toBe('prod-2');
    });
  });

  describe('createProduct', () => {
    it('trims the name, persists to Dexie and queues an INSERT', async () => {
      const product = await createProduct({
        storeId: 'store-1',
        name: '  Aceite Primor  ',
        price: 12.5,
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Aceite Primor');
      expect(product.price).toBe(12.5);
      expect(product.store_id).toBe('store-1');

      const stored = await db.products.get(product.id);
      expect(stored).toBeDefined();
      expect(stored?.synced).toBe(false);

      const queued = await db.syncQueue.where('entity').equals('products').first();
      expect(queued).toBeDefined();
      expect(queued?.operation).toBe('INSERT');
      expect((queued?.payload as { id: string }).id).toBe(product.id);
    });

    it('rejects an empty name and a negative price', async () => {
      await expect(createProduct({ storeId: 'store-1', name: '   ', price: 5 })).rejects.toThrow(
        /name is required/i
      );
      await expect(createProduct({ storeId: 'store-1', name: 'Azúcar', price: -1 })).rejects.toThrow(
        /price/i
      );
      // Zero price is valid (e.g. promo/gift items)
      const freebie = await createProduct({ storeId: 'store-1', name: 'Muestra', price: 0 });
      expect(freebie.price).toBe(0);
    });

    it('rejects duplicates in the same store (case-insensitive) but allows other stores', async () => {
      await createProduct({ storeId: 'store-1', name: 'Arroz costeño', price: 5.5 });

      await expect(
        createProduct({ storeId: 'store-1', name: 'ARROZ COSTEÑO', price: 6 })
      ).rejects.toThrow(/Product already exists/);

      const otherStore = await createProduct({
        storeId: 'store-2',
        name: 'Arroz costeño',
        price: 5.5,
      });
      expect(otherStore.store_id).toBe('store-2');
    });
  });
});
