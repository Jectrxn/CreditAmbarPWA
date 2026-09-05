import { describe, it, expect } from 'vitest';
import {
  generateWhatsAppPaymentReminder,
  generateWhatsAppReceipt,
  sanitizePhoneNumber,
} from './whatsappHelper';

describe('whatsappHelper - WhatsApp Balance Link & Receipt Generation', () => {
  describe('sanitizePhoneNumber', () => {
    it('strips non-digit characters and plus signs', () => {
      expect(sanitizePhoneNumber('+51 987-654-321')).toBe('51987654321');
      expect(sanitizePhoneNumber('(01) 445-6789')).toBe('014456789');
    });

    it('returns empty string if phone is undefined or blank', () => {
      expect(sanitizePhoneNumber(undefined)).toBe('');
      expect(sanitizePhoneNumber('')).toBe('');
      expect(sanitizePhoneNumber('   ')).toBe('');
    });
  });

  describe('generateWhatsAppPaymentReminder', () => {
    it('generates a valid wa.me URL with phone, customer name, balance, and store name', () => {
      const customer = {
        name: 'Carlos Mendoza',
        phone: '+51 987-654-321',
        balance: 45.5,
      };

      const url = generateWhatsAppPaymentReminder(customer, 'Bodega Ambar');

      expect(url).toContain('https://wa.me/51987654321?text=');
      const decodedText = decodeURIComponent(url.split('?text=')[1]);
      expect(decodedText).toMatch(/Carlos Mendoza/);
      expect(decodedText).toMatch(/45\.50/);
      expect(decodedText).toMatch(/Bodega Ambar/);
      expect(decodedText).toMatch(/saldo pendiente|recordamos/i);
    });

    it('handles customer without phone by producing a generic shareable wa.me link', () => {
      const customer = {
        name: 'Rosa Gomez',
        balance: 120,
      };

      const url = generateWhatsAppPaymentReminder(customer, 'Bodega Ambar');

      expect(url.startsWith('https://wa.me/?text=')).toBe(true);
      const decodedText = decodeURIComponent(url.split('?text=')[1]);
      expect(decodedText).toMatch(/Rosa Gomez/);
      expect(decodedText).toMatch(/120\.00/);
    });

    it('uses fallback store name if store name is omitted', () => {
      const customer = {
        name: 'Luis Alva',
        balance: 25,
      };

      const url = generateWhatsAppPaymentReminder(customer);
      const decodedText = decodeURIComponent(url.split('?text=')[1]);
      expect(decodedText).toMatch(/CreditAmbar/);
    });
  });

  describe('generateWhatsAppReceipt', () => {
    it('generates a receipt link with transaction ID, amount, and customer name', () => {
      const customer = {
        name: 'Carlos Mendoza',
        phone: '+51 987 654 321',
        balance: 10,
      };

      const transaction = {
        id: 'tx-uuid-12345',
        total_amount: 35,
        type: 'payment',
        created_at: '2026-09-05T12:00:00.000Z',
      };

      const url = generateWhatsAppReceipt(transaction, customer, 'Bodega Ambar');

      expect(url).toContain('https://wa.me/51987654321?text=');
      const decodedText = decodeURIComponent(url.split('?text=')[1]);
      expect(decodedText).toMatch(/comprobante|recibo|constancia/i);
      expect(decodedText).toMatch(/35\.00/);
      expect(decodedText).toMatch(/tx-uuid-12345/);
    });
  });
});
