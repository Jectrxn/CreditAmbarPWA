import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore - Shared Phone Store Auth & PIN State', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should initialize with default unauthenticated and locked state', () => {
    const state = useAuthStore.getState();
    expect(state.storeSession).toBeNull();
    expect(state.isStoreAuthenticated).toBe(false);
    expect(state.activeCashier).toBeNull();
    expect(state.isLocked).toBe(true);
    expect(state.cashiers).toHaveLength(0);
  });

  it('should set and clear store session', () => {
    const session = {
      storeId: 'store-123',
      storeName: 'Fiambrería El Ámbar',
      authenticatedAt: '2026-09-03T12:00:00Z',
    };

    useAuthStore.getState().setStoreSession(session);
    expect(useAuthStore.getState().storeSession).toEqual(session);
    expect(useAuthStore.getState().isStoreAuthenticated).toBe(true);

    useAuthStore.getState().clearStoreSession();
    expect(useAuthStore.getState().storeSession).toBeNull();
    expect(useAuthStore.getState().isStoreAuthenticated).toBe(false);
    expect(useAuthStore.getState().activeCashier).toBeNull();
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  it('should register and switch cashiers', () => {
    const cashier1 = {
      id: 'c-1',
      name: 'María Gómez',
      role: 'cajero' as const,
      pin: '1234',
    };
    const supervisor = {
      id: 'c-2',
      name: 'Carlos Jefe',
      role: 'supervisor' as const,
      pin: '9999',
    };

    useAuthStore.getState().setCashiers([cashier1, supervisor]);
    expect(useAuthStore.getState().cashiers).toHaveLength(2);

    // Validate PIN
    expect(useAuthStore.getState().validatePin('c-1', '1234')).toBe(true);
    expect(useAuthStore.getState().validatePin('c-1', '0000')).toBe(false);
    expect(useAuthStore.getState().validatePin('non-existent', '1234')).toBe(false);

    // Unlock with PIN
    const unlockSuccess = useAuthStore.getState().unlockWithPin('c-1', '1234');
    expect(unlockSuccess).toBe(true);
    expect(useAuthStore.getState().activeCashier?.id).toBe('c-1');
    expect(useAuthStore.getState().isLocked).toBe(false);

    // Lock session
    useAuthStore.getState().lockSession();
    expect(useAuthStore.getState().isLocked).toBe(true);
    expect(useAuthStore.getState().activeCashier?.id).toBe('c-1');

    // Switch to supervisor with wrong PIN
    const failedUnlock = useAuthStore.getState().unlockWithPin('c-2', 'wrong');
    expect(failedUnlock).toBe(false);
    expect(useAuthStore.getState().isLocked).toBe(true);

    // Switch to supervisor with right PIN
    const supUnlock = useAuthStore.getState().unlockWithPin('c-2', '9999');
    expect(supUnlock).toBe(true);
    expect(useAuthStore.getState().activeCashier?.role).toBe('supervisor');
    expect(useAuthStore.getState().isLocked).toBe(false);

    // Logout
    useAuthStore.getState().logoutCashier();
    expect(useAuthStore.getState().activeCashier).toBeNull();
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  it('should correctly evaluate hierarchical roles (cajero vs supervisor vs jefe)', () => {
    const cashier = { id: 'c-1', name: 'Ana', role: 'cajero' as const, pin: '1111' };
    const supervisor = { id: 'c-2', name: 'Beto', role: 'supervisor' as const, pin: '2222' };
    const jefe = { id: 'c-3', name: 'Don Ámbar', role: 'jefe' as const, pin: '3333' };

    useAuthStore.getState().setCashiers([cashier, supervisor, jefe]);

    // When no cashier is active
    expect(useAuthStore.getState().hasRole('cajero')).toBe(false);

    // Active: cajero
    useAuthStore.getState().unlockWithPin('c-1', '1111');
    expect(useAuthStore.getState().hasRole('cajero')).toBe(true);
    expect(useAuthStore.getState().hasRole('supervisor')).toBe(false);
    expect(useAuthStore.getState().hasRole('jefe')).toBe(false);

    // Active: supervisor
    useAuthStore.getState().unlockWithPin('c-2', '2222');
    expect(useAuthStore.getState().hasRole('cajero')).toBe(true);
    expect(useAuthStore.getState().hasRole('supervisor')).toBe(true);
    expect(useAuthStore.getState().hasRole('jefe')).toBe(false);

    // Active: jefe
    useAuthStore.getState().unlockWithPin('c-3', '3333');
    expect(useAuthStore.getState().hasRole('cajero')).toBe(true);
    expect(useAuthStore.getState().hasRole('supervisor')).toBe(true);
    expect(useAuthStore.getState().hasRole('jefe')).toBe(true);
  });
});
