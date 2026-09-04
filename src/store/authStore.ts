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

export interface AuthState {
  storeSession: StoreSession | null;
  isStoreAuthenticated: boolean;
  cashiers: CashierProfile[];
  activeCashier: CashierProfile | null;
  isLocked: boolean;

  setStoreSession: (session: StoreSession | null) => void;
  clearStoreSession: () => void;
  setCashiers: (cashiers: CashierProfile[]) => void;
  addCashier: (cashier: CashierProfile) => void;
  selectCashier: (cashierId: string) => void;
  validatePin: (cashierId: string, pin: string) => boolean;
  unlockWithPin: (cashierId: string, pin: string) => boolean;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  storeSession: null,
  isStoreAuthenticated: false,
  cashiers: [],
  activeCashier: null,
  isLocked: true,

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

  validatePin: (cashierId, pin) => {
    const cashier = get().cashiers.find((c) => c.id === cashierId);
    if (!cashier) return false;
    return cashier.pin === pin;
  },

  unlockWithPin: (cashierId, pin) => {
    const cashier = get().cashiers.find((c) => c.id === cashierId);
    if (!cashier) return false;
    if (cashier.pin === pin) {
      set({ activeCashier: cashier, isLocked: false });
      return true;
    }
    return false;
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
      isLocked: true,
    });
  },
}));
