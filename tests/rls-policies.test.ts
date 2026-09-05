import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { canUpdateTransaction } from '../src/lib/gracePeriod';

describe('RLS Policies and Migration Schema', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260903000000_init_schema.sql');

  it('verifies migration file exists and defines all required tables with RLS enabled', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const requiredTables = [
      'profiles',
      'customers',
      'products',
      'credit_transactions',
      'transaction_items',
    ];

    for (const table of requiredTables) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}`, 'i'));
      expect(sql).toMatch(new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i'));
    }
  });

  it('enforces cross-tenant isolation on all tenant-scoped tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // profiles isolation: auth.uid() = id
    expect(sql).toMatch(/CREATE POLICY .* ON profiles.*USING \(auth\.uid\(\) = id\)/is);

    // customers isolation: store_id = auth.uid()
    expect(sql).toMatch(/CREATE POLICY .* ON customers.*USING \(store_id = auth\.uid\(\)\)/is);

    // products isolation: store_id = auth.uid()
    expect(sql).toMatch(/CREATE POLICY .* ON products.*USING \(store_id = auth\.uid\(\)\)/is);

    // credit_transactions isolation: store_id = auth.uid()
    expect(sql).toMatch(/CREATE POLICY .* ON credit_transactions.*USING \(store_id = auth\.uid\(\)\)/is);
    expect(sql).toMatch(/CREATE POLICY .* ON credit_transactions.*WITH CHECK \(store_id = auth\.uid\(\)\)/is);

    // transaction_items: linked to credit_transactions where store_id = auth.uid()
    expect(sql).toMatch(/CREATE POLICY .* ON transaction_items.*store_id = auth\.uid\(\)/is);
  });

  it('enforces 10-minute grace window on credit_transactions UPDATE', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // UPDATE policy must check store_id and 10 minutes interval
    expect(sql).toMatch(/CREATE POLICY .* ON credit_transactions\s+FOR UPDATE\s+USING \([\s\S]*store_id = auth\.uid\(\)[\s\S]*INTERVAL '10 minutes'[\s\S]*\);/is);
  });

  describe('10-minute Grace Window and Tenant Isolation Logic', () => {
    const storeId = 'store-uuid-111';
    const now = new Date('2026-09-05T12:00:00.000Z');

    it('allows update when same tenant and within 10 minutes (9 minutes ago)', () => {
      const createdAt = new Date('2026-09-05T11:51:00.000Z'); // 9 mins ago
      const result = canUpdateTransaction({
        createdAt,
        storeId,
        currentUserId: storeId,
        now,
      });

      expect(result).toEqual({ allowed: true });
    });

    it('rejects update when different tenant even within grace window', () => {
      const createdAt = new Date('2026-09-05T11:58:00.000Z'); // 2 mins ago
      const attackerUserId = 'attacker-uuid-999';

      const result = canUpdateTransaction({
        createdAt,
        storeId,
        currentUserId: attackerUserId,
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Cross-tenant violation: not authorized for this store');
    });

    it('rejects update when same tenant but older than 10 minutes (10 mins 1 sec ago)', () => {
      const createdAt = new Date('2026-09-05T11:49:59.000Z'); // 10 mins 1 sec ago
      const result = canUpdateTransaction({
        createdAt,
        storeId,
        currentUserId: storeId,
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Grace period expired: transactions older than 10 minutes are locked');
    });

    it('rejects update at exact 10 minute mark (boundary)', () => {
      const createdAt = new Date('2026-09-05T11:50:00.000Z'); // exactly 10 mins ago
      const result = canUpdateTransaction({
        createdAt,
        storeId,
        currentUserId: storeId,
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Grace period expired: transactions older than 10 minutes are locked');
    });

    it('allows update at 9 minutes and 59 seconds (just inside boundary)', () => {
      const createdAt = new Date('2026-09-05T11:50:01.000Z'); // 9 mins 59 secs ago
      const result = canUpdateTransaction({
        createdAt,
        storeId,
        currentUserId: storeId,
        now,
      });

      expect(result).toEqual({ allowed: true });
    });

    it('handles createdAt passed as ISO string format', () => {
      const result = canUpdateTransaction({
        createdAt: '2026-09-05T11:55:00.000Z', // 5 mins ago
        storeId,
        currentUserId: storeId,
        now,
      });

      expect(result).toEqual({ allowed: true });
    });

    it('rejects when currentUserId is missing/empty', () => {
      const result = canUpdateTransaction({
        createdAt: new Date('2026-09-05T11:55:00.000Z'),
        storeId,
        currentUserId: '',
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Cross-tenant violation: not authorized for this store');
    });
  });
});
