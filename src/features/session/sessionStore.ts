import { create } from 'zustand';
import { validateFloatDeclaration } from '../transactions/transactionRules';

export interface CashierSession {
  id: string;
  cashierId: string;
  cashierName: string;
  storeId: string;
  status: 'open' | 'closed';
  startingFloat: number;
  currentCashTotal: number;
  cashPaymentsTotal: number;
  qrPaymentsTotal: number;
  openedAt: string;
  closedAt?: string;
}

export interface OpenSessionParams {
  cashierId: string;
  cashierName: string;
  storeId: string;
  startingFloat: number;
}

export interface RecordPaymentParams {
  amount: number;
  paymentMethod: 'cash' | 'qr';
}

export interface SessionResult {
  success: boolean;
  error?: string;
}

export interface CloseSessionResult extends SessionResult {
  closedSession?: CashierSession;
}

export interface SessionState {
  activeSession: CashierSession | null;
  lastClosedSession: CashierSession | null;

  openSession: (params: OpenSessionParams) => SessionResult;
  recordPaymentToSession: (params: RecordPaymentParams) => SessionResult;
  recordVoidOrCorrection: (params: RecordPaymentParams) => SessionResult;
  closeSession: () => CloseSessionResult;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  lastClosedSession: null,

  openSession: ({ cashierId, cashierName, storeId, startingFloat }) => {
    const current = get().activeSession;
    if (current && current.status === 'open') {
      return {
        success: false,
        error: 'A cashier session is already open. Please close the active session first.',
      };
    }

    const validation = validateFloatDeclaration(startingFloat);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Float amount must be positive or zero',
      };
    }

    const newSession: CashierSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      cashierId,
      cashierName,
      storeId,
      status: 'open',
      startingFloat,
      currentCashTotal: startingFloat,
      cashPaymentsTotal: 0,
      qrPaymentsTotal: 0,
      openedAt: new Date().toISOString(),
    };

    set({ activeSession: newSession });
    return { success: true };
  },

  recordPaymentToSession: ({ amount, paymentMethod }) => {
    const session = get().activeSession;
    if (!session || session.status !== 'open') {
      return {
        success: false,
        error: 'No active cashier session open to record payment.',
      };
    }

    if (paymentMethod === 'cash') {
      // FCC Cash Isolation: increments physical drawer cash
      set({
        activeSession: {
          ...session,
          currentCashTotal: session.currentCashTotal + amount,
          cashPaymentsTotal: session.cashPaymentsTotal + amount,
        },
      });
    } else {
      // QR Payment: goes directly to store treasury, does NOT affect drawer cash
      set({
        activeSession: {
          ...session,
          qrPaymentsTotal: session.qrPaymentsTotal + amount,
        },
      });
    }

    return { success: true };
  },

  recordVoidOrCorrection: ({ amount, paymentMethod }) => {
    const session = get().activeSession;
    if (!session || session.status !== 'open') {
      return {
        success: false,
        error: 'No active cashier session open for correction.',
      };
    }

    if (paymentMethod === 'cash') {
      set({
        activeSession: {
          ...session,
          currentCashTotal: Math.max(0, session.currentCashTotal - amount),
          cashPaymentsTotal: Math.max(0, session.cashPaymentsTotal - amount),
        },
      });
    } else {
      set({
        activeSession: {
          ...session,
          qrPaymentsTotal: Math.max(0, session.qrPaymentsTotal - amount),
        },
      });
    }

    return { success: true };
  },

  closeSession: () => {
    const session = get().activeSession;
    if (!session || session.status !== 'open') {
      return {
        success: false,
        error: 'No active cashier session to close.',
      };
    }

    const closedSession: CashierSession = {
      ...session,
      status: 'closed',
      closedAt: new Date().toISOString(),
    };

    set({
      activeSession: null,
      lastClosedSession: closedSession,
    });

    return {
      success: true,
      closedSession,
    };
  },

  reset: () => {
    set({
      activeSession: null,
      lastClosedSession: null,
    });
  },
}));
