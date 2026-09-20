import { db } from '../../lib/dexie';
import type { Product } from '../../types/database';

export interface CreateProductParams {
  storeId: string;
  name: string;
  price: number;
  sku?: string;
}

const SEARCH_LIMIT = 8;

/**
 * Case-insensitive substring search over product names, scoped to a store.
 * Most recently created first, capped at 8. Empty query returns [].
 */
export async function searchProducts(storeId: string, query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scoped = await db.products.where('store_id').equals(storeId).toArray();
  return scoped
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, SEARCH_LIMIT);
}

/**
 * Creates a product under a store. Trims the name, requires a non-empty
 * name and price >= 0, guards duplicates (same store + same name,
 * case-insensitive), persists to Dexie and queues an INSERT for sync.
 */
export async function createProduct({
  storeId,
  name,
  price,
  sku,
}: CreateProductParams): Promise<Product> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Product name is required');
  }
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    throw new Error('Product price must be greater than or equal to zero');
  }

  const scoped = await db.products.where('store_id').equals(storeId).toArray();
  const duplicate = scoped.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    throw new Error('Product already exists');
  }

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const product: Product = {
    id,
    store_id: storeId,
    name: trimmedName,
    price,
    ...(sku ? { sku } : {}),
    created_at: now,
  };

  await db.products.put({
    ...product,
    synced: false,
  });

  await db.syncQueue.add({
    entity: 'products',
    operation: 'INSERT',
    payload: product,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  });

  return product;
}
