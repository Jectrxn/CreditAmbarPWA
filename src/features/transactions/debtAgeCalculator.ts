import { CreditTransaction } from '../../types/database';

export function calculateOldestUnpaidDate(transactions: CreditTransaction[]): Date | null {
  // Sort by oldest first
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let remainingPurchases: { date: Date; amount: number }[] = [];
  
  for (const tx of sorted) {
    if (tx.type === 'credit_purchase' || (tx.type === undefined && tx.total_amount > 0)) {
      remainingPurchases.push({
        date: new Date(tx.created_at),
        amount: tx.total_amount
      });
    } else if (tx.type === 'payment' || (tx.type === undefined && tx.total_amount < 0)) {
      let paymentToApply = Math.abs(tx.total_amount);
      
      while (paymentToApply > 0 && remainingPurchases.length > 0) {
        const oldest = remainingPurchases[0];
        if (oldest.amount <= paymentToApply) {
          paymentToApply -= oldest.amount;
          remainingPurchases.shift();
        } else {
          oldest.amount -= paymentToApply;
          paymentToApply = 0;
        }
      }
    }
  }

  if (remainingPurchases.length > 0) {
    return remainingPurchases[0].date;
  }
  return null;
}
