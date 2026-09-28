import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveDexieQuery } from './useLiveDexieQuery';
import { db } from '../lib/dexie';
import type { Customer } from '../types/database';

describe('useLiveDexieQuery (Strict TDD)', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    store_id: 'store-1',
    name: 'Ana',
    credit_limit: 100,
    balance: 10,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.customers.clear();
  });

  it('resolves the initial query result and stops loading', async () => {
    await db.customers.put(mockCustomer);

    const { result } = renderHook(() =>
      useLiveDexieQuery(() => db.customers.where('store_id').equals('store-1').toArray(), ['store-1'])
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Ana');
    expect(result.current.error).toBeUndefined();
  });

  it('reflects a later table write without an explicit re-render trigger from the test', async () => {
    await db.customers.put(mockCustomer);

    const { result } = renderHook(() =>
      useLiveDexieQuery(() => db.customers.where('store_id').equals('store-1').toArray(), ['store-1'])
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await db.customers.put({ ...mockCustomer, id: 'cust-2', name: 'Beto' });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });

  it('resets loading and stale data when deps change', async () => {
    await db.customers.bulkPut([
      mockCustomer,
      { ...mockCustomer, id: 'cust-2', store_id: 'store-2', name: 'Otra tienda' },
    ]);

    const { result, rerender } = renderHook(
      ({ storeId }: { storeId: string }) =>
        useLiveDexieQuery(() => db.customers.where('store_id').equals(storeId).toArray(), [storeId]),
      { initialProps: { storeId: 'store-1' } }
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].store_id).toBe('store-1');

    rerender({ storeId: 'store-2' });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].store_id).toBe('store-2');
  });

  it('surfaces querier errors and stops loading', async () => {
    const { result } = renderHook(() =>
      useLiveDexieQuery<never[]>(() => {
        throw new Error('boom');
      }, [])
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('boom');
    expect(result.current.data).toBeUndefined();
  });

  it('unsubscribes on unmount and does not update state afterwards', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, unmount } = renderHook(() =>
      useLiveDexieQuery(() => db.customers.where('store_id').equals('store-1').toArray(), ['store-1'])
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();

    await db.customers.put(mockCustomer);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
