export interface CanUpdateTransactionParams {
  createdAt: string | Date;
  storeId: string;
  currentUserId: string;
  now?: Date;
}

export interface CanUpdateTransactionResult {
  allowed: boolean;
  reason?: string;
}

export const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Validates whether a transaction can be edited or cancelled based on:
 * 1. Cross-tenant isolation (store_id must match authenticated user / store)
 * 2. 10-minute grace window policy: (now - created_at) < 10 minutes
 */
export function canUpdateTransaction({
  createdAt,
  storeId,
  currentUserId,
  now = new Date(),
}: CanUpdateTransactionParams): CanUpdateTransactionResult {
  // 1. Cross-tenant isolation check
  if (!currentUserId || storeId !== currentUserId) {
    return {
      allowed: false,
      reason: 'Cross-tenant violation: not authorized for this store',
    };
  }

  // 2. 10-minute grace window check
  const createdTime = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const currentTime = now.getTime();
  const elapsedMs = currentTime - createdTime;

  if (elapsedMs >= GRACE_PERIOD_MS) {
    return {
      allowed: false,
      reason: 'Grace period expired: transactions older than 10 minutes are locked',
    };
  }

  return { allowed: true };
}
