export interface CashierSessionSnapshot {
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

export interface FloatValidationResult {
  valid: boolean;
  error?: string;
}

export interface FCCValidationParams {
  paymentMethod: 'cash' | 'qr';
  amount: number;
  type: 'payment' | 'credit_purchase';
}

export interface FCCValidationResult {
  allowed: boolean;
  affectsCashierDrawer: boolean;
  sessionId?: string;
  error?: string;
}

export interface CreditLimitParams {
  credit_limit: number;
  balance: number;
}

export interface CreditLimitResult {
  allowed: boolean;
  availableCredit: number;
  newBalance: number;
  error?: string;
}

export interface AuditGraceResult {
  canEdit: boolean;
  canUndo: boolean;
  remainingMinutes: number;
  error?: string;
}

export const AUDIT_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Validates cashier starting float declaration.
 * Float must be a positive number or zero.
 */
export function validateFloatDeclaration(amount: number): FloatValidationResult {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return {
      valid: false,
      error: 'Invalid float amount: must be a valid number',
    };
  }

  if (amount < 0) {
    return {
      valid: false,
      error: 'Float amount must be positive or zero',
    };
  }

  return { valid: true };
}

/**
 * Validates a transaction under Front-of-House Cash Isolation (FCC) rules.
 * Cash payments must be tied to an active session and increment drawer cash.
 * QR payments go directly to store treasury and do not alter the physical cash drawer.
 * Credit purchases (fiados) add customer debt without moving physical cash at the POS.
 */
export function validateTransactionForFCC(
  session: CashierSessionSnapshot | null,
  transaction: FCCValidationParams
): FCCValidationResult {
  // If payment method is cash, an open cashier session is strictly mandatory
  if (transaction.paymentMethod === 'cash') {
    if (!session || session.status !== 'open') {
      return {
        allowed: false,
        affectsCashierDrawer: false,
        error: 'Active cashier session required for cash transactions. Please open a session first.',
      };
    }

    // Only payment/abono in cash increments the physical cashier drawer
    const affectsCashierDrawer = transaction.type === 'payment';

    return {
      allowed: true,
      affectsCashierDrawer,
      sessionId: session.id,
    };
  }

  // QR payments go directly to store digital treasury
  return {
    allowed: true,
    affectsCashierDrawer: false,
    sessionId: session?.id,
  };
}

/**
 * Calculates the expected cash in the drawer based on FCC isolation.
 */
export function calculateExpectedSessionCash(
  startingFloat: number,
  cashPayments: number,
  cashRefunds: number = 0
): number {
  return startingFloat + cashPayments - cashRefunds;
}

/**
 * Enforces customer credit limits.
 * Available credit = credit_limit - balance.
 * A credit purchase increases balance and decreases available credit.
 */
export function validateCreditLimit(
  customer: CreditLimitParams,
  purchaseAmount: number
): CreditLimitResult {
  if (purchaseAmount <= 0 || isNaN(purchaseAmount)) {
    return {
      allowed: false,
      availableCredit: Math.max(0, customer.credit_limit - customer.balance),
      newBalance: customer.balance,
      error: 'Purchase amount must be greater than zero',
    };
  }

  const availableCredit = Math.max(0, customer.credit_limit - customer.balance);

  if (purchaseAmount > availableCredit) {
    return {
      allowed: false,
      availableCredit,
      newBalance: customer.balance,
      error: `Insufficient credit limit: purchase of $${purchaseAmount.toFixed(
        2
      )} exceeds available credit limit of $${availableCredit.toFixed(2)}`,
    };
  }

  return {
    allowed: true,
    availableCredit: availableCredit - purchaseAmount,
    newBalance: customer.balance + purchaseAmount,
  };
}

/**
 * Checks whether a transaction is within the 10-minute audit grace window.
 * Uses original creation time even if synced later.
 */
export function checkAuditGraceWindow(
  createdAt: string | Date,
  now: Date = new Date()
): AuditGraceResult {
  const createdMs = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const nowMs = now.getTime();
  const elapsedMs = nowMs - createdMs;
  const remainingMs = AUDIT_GRACE_PERIOD_MS - elapsedMs;

  if (elapsedMs >= AUDIT_GRACE_PERIOD_MS || remainingMs <= 0) {
    return {
      canEdit: false,
      canUndo: false,
      remainingMinutes: 0,
      error: 'The 10-minute audit window has closed. This transaction is immutable.',
    };
  }

  const remainingMinutes = remainingMs / (60 * 1000);

  return {
    canEdit: true,
    canUndo: true,
    remainingMinutes,
  };
}
