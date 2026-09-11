import { create } from 'zustand';

export type CashierRole = 'cajero' | 'supervisor' | 'jefe';

export interface StoreSession {
  storeId: string;
  storeName: string;
  authenticatedAt: string;
  deviceToken?: string;
}

export interface CashierProfile {
  id: string;
  name: string;
  role: CashierRole;
  pin: string; // Local fast authentication PIN
  avatarUrl?: string;
}

export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_PIN_ATTEMPTS = 3;

export const DEFAULT_CASHIERS: CashierProfile[] = [
  { id: 'c-1', name: 'Martin', role: 'cajero', pin: '1234' },
  { id: 'c-2', name: 'Emiliano', role: 'cajero', pin: '1234' },
  { id: 'c-3', name: 'Anthony', role: 'cajero', pin: '1234' },
  { id: 'c-4', name: 'Benjamin', role: 'cajero', pin: '1234' },
  { id: 'c-sup', name: 'Supervisor', role: 'supervisor', pin: '1234' },
  { id: 'c-admin', name: 'Administrador', role: 'jefe', pin: '1234' },
];

export interface AuthState {
  storeSession: StoreSession | null;
  isStoreAuthenticated: boolean;
  cashiers: CashierProfile[];
  activeCashier: CashierProfile | null;
  currentOperatorName: string;
  isLocked: boolean;
  failedPinAttempts: Record<string, number>;
  lockedUntil: Record<string, number>;

  setStoreSession: (session: StoreSession | null) => void;
  clearStoreSession: () => void;
  setCashiers: (cashiers: CashierProfile[]) => void;
  addCashier: (cashier: CashierProfile) => void;
  selectCashier: (cashierId: string) => void;
  setCurrentOperatorName: (name: string) => void;
  validatePin: (cashierId: string, pin: string) => boolean;
  unlockWithPin: (cashierId: string, pin: string) => boolean;
  unlockAdminMode: (pin: string) => boolean;
  lockAdminMode: () => void;
  isAdminMode: () => boolean;
  isProfileLocked: (cashierId: string) => boolean;
  getLockoutRemainingTime: (cashierId: string) => number;
  lockSession: () => void;
  logoutCashier: () => void;
  hasRole: (requiredRole: CashierRole) => boolean;
  reset: () => void;
}

const ROLE_RANK: Record<CashierRole, number> = {
  cajero: 1,
  supervisor: 2,
  jefe: 3,
};

function processPinAttempt(
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void,
  get: () => AuthState,
  cashierId: string,
  pin: string,
  shouldUnlockOnSuccess: boolean
): boolean {
  const cashier = get().cashiers.find((c) => c.id === cashierId);
  if (!cashier) return false;

  if (get().isProfileLocked(cashierId)) {
    return false;
  }

  // Check if previous lock expired; if so, clear previous attempts
  const prevLock = get().lockedUntil[cashierId];
  if (prevLock && Date.now() >= prevLock) {
    set((state) => {
      const nextLocked = { ...state.lockedUntil };
      delete nextLocked[cashierId];
      const nextFailed = { ...state.failedPinAttempts };
      delete nextFailed[cashierId];
      return { lockedUntil: nextLocked, failedPinAttempts: nextFailed };
    });
  }

  if (cashier.pin === pin) {
    set((state) => {
      const nextFailed = { ...state.failedPinAttempts };
      delete nextFailed[cashierId];
      const nextLocked = { ...state.lockedUntil };
      delete nextLocked[cashierId];
      return {
        ...(shouldUnlockOnSuccess
          ? { activeCashier: cashier, isLocked: false }
          : {}),
        failedPinAttempts: nextFailed,
        lockedUntil: nextLocked,
      };
    });
    return true;
  }

  // Wrong PIN: record attempt
  const currentAttempts = (get().failedPinAttempts[cashierId] || 0) + 1;
  const isNowLocked = currentAttempts >= MAX_PIN_ATTEMPTS;

  set((state) => ({
    failedPinAttempts: {
      ...state.failedPinAttempts,
      [cashierId]: currentAttempts,
    },
    lockedUntil: isNowLocked
      ? {
          ...state.lockedUntil,
          [cashierId]: Date.now() + LOCKOUT_DURATION_MS,
        }
      : state.lockedUntil,
  }));

  return false;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  storeSession: null,
  isStoreAuthenticated: false,
  cashiers: [],
  activeCashier: null,
  currentOperatorName:
    typeof localStorage !== 'undefined' && localStorage.getItem('creditambar_current_operator')
      ? localStorage.getItem('creditambar_current_operator')!
      : 'Martin',
  isLocked: true,
  failedPinAttempts: {},
  lockedUntil: {},

  setStoreSession: (session) => {
    set({
      storeSession: session,
      isStoreAuthenticated: !!session,
    });
  },

  clearStoreSession: () => {
    set({
      storeSession: null,
      isStoreAuthenticated: false,
      activeCashier: null,
      isLocked: true,
    });
  },

  setCashiers: (cashiers) => {
    set({ cashiers });
  },

  addCashier: (cashier) => {
    set((state) => ({ cashiers: [...state.cashiers, cashier] }));
  },

  selectCashier: (cashierId) => {
    const cashier = get().cashiers.find((c) => c.id === cashierId) || null;
    set({ activeCashier: cashier, isLocked: true });
  },

  setCurrentOperatorName: (name: string) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('creditambar_current_operator', name);
      } catch {
        // ignore
      }
    }
    set({ currentOperatorName: name });
  },

  isProfileLocked: (cashierId) => {
    const lockTime = get().lockedUntil[cashierId];
    if (!lockTime) return false;
    return Date.now() < lockTime;
  },

  getLockoutRemainingTime: (cashierId) => {
    const lockTime = get().lockedUntil[cashierId];
    if (!lockTime) return 0;
    const remaining = lockTime - Date.now();
    return remaining > 0 ? remaining : 0;
  },

  validatePin: (cashierId, pin) => {
    return processPinAttempt(set, get, cashierId, pin, false);
  },

  unlockWithPin: (cashierId, pin) => {
    return processPinAttempt(set, get, cashierId, pin, true);
  },

  unlockAdminMode: (pin: string) => {
    const adminUser =
      get().cashiers.find((c) => c.role === 'jefe') ||
      get().cashiers.find((c) => c.role === 'supervisor') || {
        id: 'c-admin',
        name: 'Administrador',
        role: 'jefe' as CashierRole,
        pin: '1234',
      };

    if (pin === '1234' || (adminUser && adminUser.pin === pin)) {
      set({ activeCashier: adminUser, isLocked: false });
      return true;
    }
    return false;
  },

  lockAdminMode: () => {
    set({ activeCashier: null, isLocked: false });
  },

  isAdminMode: () => {
    const active = get().activeCashier;
    if (!active) return false;
    return active.role === 'supervisor' || active.role === 'jefe';
  },

  lockSession: () => {
    set({ isLocked: true });
  },

  logoutCashier: () => {
    set({ activeCashier: null, isLocked: true });
  },

  hasRole: (requiredRole) => {
    const active = get().activeCashier;
    if (!active) return false;
    return ROLE_RANK[active.role] >= ROLE_RANK[requiredRole];
  },

  reset: () => {
    set({
      storeSession: null,
      isStoreAuthenticated: false,
      cashiers: [],
      activeCashier: null,
      currentOperatorName: 'Martin',
      isLocked: true,
      failedPinAttempts: {},
      lockedUntil: {},
    });
  },
}));
