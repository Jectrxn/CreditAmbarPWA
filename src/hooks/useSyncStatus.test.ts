import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncStatus } from './useSyncStatus';
import { syncManager, type SyncStatus } from '../lib/syncManager';

vi.mock('../lib/syncManager', () => {
  let currentStatus: SyncStatus = 'idle';
  const listeners = new Set<(status: SyncStatus) => void>();
  const unsubscribeMock = vi.fn();

  return {
    syncManager: {
      getStatus: vi.fn(() => currentStatus),
      onStatusChange: vi.fn((listener: (status: SyncStatus) => void) => {
        listeners.add(listener);
        listener(currentStatus);
        return () => {
          listeners.delete(listener);
          unsubscribeMock();
        };
      }),
      __simulateStatusChange: (newStatus: SyncStatus) => {
        currentStatus = newStatus;
        listeners.forEach((listener) => listener(newStatus));
      },
      __getStatus: () => currentStatus,
      __setStatus: (status: SyncStatus) => {
        currentStatus = status;
      },
      __getListenerCount: () => listeners.size,
      __unsubscribeMock: unsubscribeMock,
      __reset: () => {
        currentStatus = 'idle';
        listeners.clear();
        unsubscribeMock.mockClear();
      },
    },
  };
});

describe('useSyncStatus hook (Strict TDD)', () => {
  const mockedSyncManager = syncManager as unknown as {
    getStatus: ReturnType<typeof vi.fn>;
    onStatusChange: ReturnType<typeof vi.fn>;
    __simulateStatusChange: (status: SyncStatus) => void;
    __setStatus: (status: SyncStatus) => void;
    __getListenerCount: () => number;
    __unsubscribeMock: ReturnType<typeof vi.fn>;
    __reset: () => void;
  };

  beforeEach(() => {
    mockedSyncManager.__reset();
  });

  it('returns initial sync status from syncManager', () => {
    mockedSyncManager.__setStatus('online');

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current).toBe('online');
    expect(mockedSyncManager.onStatusChange).toHaveBeenCalledTimes(1);
  });

  it('updates reactively when syncManager emits status changes', () => {
    mockedSyncManager.__setStatus('idle');
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current).toBe('idle');

    // Simulate transition to syncing
    act(() => {
      mockedSyncManager.__simulateStatusChange('syncing');
    });
    expect(result.current).toBe('syncing');

    // Simulate transition to offline
    act(() => {
      mockedSyncManager.__simulateStatusChange('offline');
    });
    expect(result.current).toBe('offline');

    // Simulate transition to error
    act(() => {
      mockedSyncManager.__simulateStatusChange('error');
    });
    expect(result.current).toBe('error');
  });

  it('unsubscribes from syncManager status changes on unmount', () => {
    const { unmount } = renderHook(() => useSyncStatus());

    expect(mockedSyncManager.__getListenerCount()).toBe(1);

    unmount();

    expect(mockedSyncManager.__getListenerCount()).toBe(0);
    expect(mockedSyncManager.__unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
