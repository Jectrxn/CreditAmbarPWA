export interface WhatsAppCustomerInfo {
  name: string;
  phone?: string;
  balance: number;
}

export interface WhatsAppTransactionInfo {
  id: string;
  total_amount: number;
  type?: string;
  created_at: string;
  cashier_pin_hash?: string;
}

/**
 * Sanitizes a phone number by stripping all non-digit characters.
 */
export function sanitizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

/**
 * Generates a WhatsApp wa.me link with encoded customer balance reminder.
 */
export function generateWhatsAppPaymentReminder(
  customer: WhatsAppCustomerInfo,
  storeName: string = 'CreditAmbar'
): string {
  const cleanPhone = sanitizePhoneNumber(customer.phone);
  const formattedBalance = customer.balance.toFixed(2);

  const message = `Hola ${customer.name}, te recordamos de ${storeName} que tienes un saldo pendiente de $${formattedBalance}. Agradecemos tu pronto pago. ¡Muchas gracias!`;
  const encodedText = encodeURIComponent(message);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates a WhatsApp wa.me receipt / confirmation link for a completed transaction.
 */
export function generateWhatsAppReceipt(
  transaction: WhatsAppTransactionInfo,
  customer: WhatsAppCustomerInfo,
  storeName: string = 'CreditAmbar'
): string {
  const cleanPhone = sanitizePhoneNumber(customer.phone);
  const formattedAmount = transaction.total_amount.toFixed(2);
  const formattedBalance = customer.balance.toFixed(2);
  const txTypeLabel = transaction.type === 'payment' ? 'Abono / Pago' : 'Nuevo Fiado';
  const attendedBy = transaction.cashier_pin_hash ? ` (Atendido por: ${transaction.cashier_pin_hash})` : '';

  const message = `Hola ${customer.name}, este es tu comprobante de ${txTypeLabel} por $${formattedAmount} en ${storeName}.${attendedBy} Saldo pendiente actual: $${formattedBalance}. (Comprobante ref: ${transaction.id})`;
  const encodedText = encodeURIComponent(message);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}
