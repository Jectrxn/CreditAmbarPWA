import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  describe('PIN Lockout Requirement (3 failed attempts -> 5 min lock)', () => {
    const cashier = { id: 'c-1', name: 'Laura Gómez', role: 'cajero' as const, pin: '1234' };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-05T12:00:00.000Z'));
      useAuthStore.getState().setCashiers([cashier]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should lock cashier profile for 5 minutes after 3 consecutive failed PIN attempts', () => {
      const store = useAuthStore.getState();

      expect(store.isProfileLocked('c-1')).toBe(false);

      // Attempt 1: wrong PIN
      const res1 = useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(res1).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(1);

      // Attempt 2: wrong PIN
      const res2 = useAuthStore.getState().unlockWithPin('c-1', '0001');
      expect(res2).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(2);

      // Attempt 3: wrong PIN -> triggers lockout
      const res3 = useAuthStore.getState().unlockWithPin('c-1', '0002');
      expect(res3).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(3);

      const expectedLockUntil = new Date('2026-09-05T12:00:00.000Z').getTime() + 5 * 60 * 1000;
      expect(useAuthStore.getState().lockedUntil['c-1']).toBe(expectedLockUntil);
      expect(useAuthStore.getState().getLockoutRemainingTime('c-1')).toBe(5 * 60 * 1000);
    });

    it('should reject unlock attempts while locked even with correct PIN', () => {
      // Trigger 3 failed attempts
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);

      // Attempt with correct PIN while locked
      const success = useAuthStore.getState().unlockWithPin('c-1', '1234');
      expect(success).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
      expect(useAuthStore.getState().activeCashier).toBeNull();
      expect(useAuthStore.getState().validatePin('c-1', '1234')).toBe(false);
    });

    it('should reset failed attempts on successful unlock', () => {
      // 2 failed attempts
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(2);

      // Successful unlock
      const success = useAuthStore.getState().unlockWithPin('c-1', '1234');
      expect(success).toBe(true);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBeUndefined();
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);

      // Next 2 failed attempts do NOT lock (attempt counter was reset)
      useAuthStore.getState().lockSession();
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(2);
    });

    it('should allow profile to be unlocked again after 5 minutes lockout expires', () => {
      // Lock the profile
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);

      // Advance time by 4 minutes 59 seconds -> still locked
      vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);
      expect(useAuthStore.getState().unlockWithPin('c-1', '1234')).toBe(false);

      // Advance past 5 minutes (2 more seconds) -> lockout expired
      vi.advanceTimersByTime(2000);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().getLockoutRemainingTime('c-1')).toBe(0);

      // Now unlock succeeds
      const success = useAuthStore.getState().unlockWithPin('c-1', '1234');
      expect(success).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().activeCashier?.id).toBe('c-1');
    });

    it('should isolate lockout state between different cashier profiles', () => {
      const cashier2 = { id: 'c-2', name: 'Marcos Rivas', role: 'supervisor' as const, pin: '4321' };
      useAuthStore.getState().setCashiers([cashier, cashier2]);

      // Lock cashier 1
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);

      // Cashier 2 must remain unlocked and accessible
      expect(useAuthStore.getState().isProfileLocked('c-2')).toBe(false);
      const c2Unlock = useAuthStore.getState().unlockWithPin('c-2', '4321');
      expect(c2Unlock).toBe(true);
      expect(useAuthStore.getState().activeCashier?.id).toBe('c-2');
    });

    it('should also enforce lockout and rejection through validatePin', () => {
      expect(useAuthStore.getState().validatePin('c-1', '0000')).toBe(false);
      expect(useAuthStore.getState().validatePin('c-1', '0000')).toBe(false);
      expect(useAuthStore.getState().validatePin('c-1', '0000')).toBe(false);

      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);
      // Valid pin is rejected because profile is locked
      expect(useAuthStore.getState().validatePin('c-1', '1234')).toBe(false);
    });

    it('should provide 3 fresh attempts after a 5-minute lockout period expires', () => {
      // Lock cashier 1
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);

      // Advance past 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);

      // First failed attempt after expiration should NOT immediately lock
      const fail1 = useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(fail1).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(1);

      // Second failed attempt
      const fail2 = useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(fail2).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(false);
      expect(useAuthStore.getState().failedPinAttempts['c-1']).toBe(2);

      // Third failed attempt locks it again
      const fail3 = useAuthStore.getState().unlockWithPin('c-1', '0000');
      expect(fail3).toBe(false);
      expect(useAuthStore.getState().isProfileLocked('c-1')).toBe(true);
    });
  });

  describe('Mostrador Operator & Admin Mode (PIN 1234)', () => {
    it('initializes with default operator Martin and updates correctly', () => {
      expect(useAuthStore.getState().currentOperatorName).toBe('Martin');
      useAuthStore.getState().setCurrentOperatorName('Emiliano');
      expect(useAuthStore.getState().currentOperatorName).toBe('Emiliano');
    });

    it('unlocks Admin Mode with PIN 1234 and sets supervisor/admin role', () => {
      expect(useAuthStore.getState().isAdminMode()).toBe(false);

      const success = useAuthStore.getState().unlockAdminMode('1234');
      expect(success).toBe(true);
      expect(useAuthStore.getState().isAdminMode()).toBe(true);
      expect(useAuthStore.getState().hasRole('supervisor')).toBe(true);

      useAuthStore.getState().lockAdminMode();
      expect(useAuthStore.getState().isAdminMode()).toBe(false);
    });

    it('rejects invalid PIN for Admin Mode', () => {
      const success = useAuthStore.getState().unlockAdminMode('9998');
      expect(success).toBe(false);
      expect(useAuthStore.getState().isAdminMode()).toBe(false);
    });
  });
});
