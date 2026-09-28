# Feature: credit-sale-atomic

## Objective
Make registering a "Nuevo Fiado" safe for money: one atomic, idempotent use case that re-reads the balance, enforces the credit limit and rounds to cents, called by `QuickCreditModal` instead of inline writes. No visual change.

## Problem
- `QuickCreditModal.handleSubmit` writes customer balance, sync queue, transaction and items as separate Dexie calls with no `db.transaction` → partial state on failure (balance up, no transaction).
- New balance = `activeCustomer.balance` read when the modal opened + amount → lost update if the balance changed meanwhile (sync, other screens, live data).
- `creditService.recordCreditPurchase` / `validateCreditLimit` exist and are tested but unused; the modal re-implements the rules (duplicated in `QuickPaymentModal`).
- Double-submit protection relies only on React `disabled` state; no idempotency key.
- `balance + amount` is not rounded to cents.
- `validateCreditLimit` error message uses `$` instead of `S/`.

## Why
A wrong balance is the most expensive bug in a credit ledger; offline-first requires local writes to be all-or-nothing.

## Scope
- `src/utils/money.ts` (new) + test — `roundToCents`.
- `src/features/credit/creditService.ts` + test — new `registerCreditSale` use case.
- `src/features/transactions/transactionRules.ts` + test — `S/` message, cents-safe comparison.
- `src/components/modals/QuickCreditModal.tsx` + test — delegate submit to the use case, ref-based double-submit guard, per-open operation id.

## Out of scope
- `QuickPaymentModal` migration (follow-up, same pattern).
- UX changes (customer preselection, focus, operator PIN, undo) — next block.

## Constraints
- No visual/class changes in `QuickCreditModal`.
- Persisted shapes (transaction, items, sync queue entries) unchanged so Supabase sync keeps working.
- Strict TDD: RED before GREEN.

## TDD
- Mode: enabled — source: user global CLAUDE.md ("Strict TDD Mode: enabled")
- Runner: `npx vitest run <file>` (fake-indexeddb)

## Tasks
- [x] T1 `roundToCents` helper + tests. Route: delegated (writer trigger: 4 non-trivial files).
- [x] T2 `validateCreditLimit`: `S/` message and cents-safe comparison (e.g. 0.1 + 0.2 vs 0.3 limit) + tests. Route: delegated.
- [x] T3 `registerCreditSale(params)` in `creditService`: single `db.transaction('rw', …)` over customers, creditTransactions, transactionItems, syncQueue; re-reads the customer inside the transaction; store guard; limit check; rounds amount and new balance; writes transaction + items + balance + queue entries; idempotent by `operationId` (returns the existing result, no second write); rolls back everything on any failure. Tests: happy path, stale-balance (balance changed after "open"), over-limit, idempotent replay, rollback when an inner write throws, cross-store refusal. Route: delegated.
- [x] T4 `QuickCreditModal` calls `registerCreditSale`; `operationId` generated per open; `useRef` in-flight guard; remove inline writes; keep UI and success screen identical. Tests: double click creates one transaction; existing 13 tests stay green. Route: delegated.
- [x] T5 Full checks + Chrome check (register a fiado in test mode, verify balance, transaction and items).

## Acceptance criteria
- A failure in any inner write leaves no partial state (balance, transaction, items, queue all unchanged).
- The saved balance is based on the balance stored at submit time, not at modal open.
- Two rapid confirms create exactly one transaction.
- Amounts and balances are stored rounded to cents.

## Checks
- `npx vitest run src/utils/money.test.ts src/features/credit/creditService.test.ts src/features/transactions/transactionRules.test.ts src/components/modals/QuickCreditModal.test.tsx`
- `npx tsc --noEmit`
- `npm test`

## Delivery
- Strategy: ask-on-risk; chain strategy cached: `stacked-to-main`. Forecast ~350 authored lines (single PR).
- Branch: `feat/credit-sale-atomic` from `fix/liquid-glass-motion` @ 0715cb7 (independent of the dashboard stack).

## Progress and evidence
- Baseline: QuickCreditModal + creditService + transactionRules tests 47/47 passing.

- T1 `66b0599` roundToCents — RED import unresolved; GREEN 7/7.
- T2 `e38e989` validateCreditLimit S/ + cents-safe — RED 2 failed/20; GREEN 22/22.
- T3 `1f55664` SyncManager.requestSync (RED 4 failed; GREEN 15/15) + `cecdedf` registerCreditSale (RED 6 failed; GREEN 19/19): single db.transaction, re-read inside, store guard, idempotent by operationId, rollback on inner throw.
- T4 `ba4759e` modal delegates to use case, per-open operationId, useRef guard; no className changes (grep empty). Writer's click-based double-submit test was not RED (disabled button already blocks synthetic clicks) — reported honestly.
- Parent follow-up `45b83a7` (route inline): Spanish over-limit message from the use case (RED → GREEN) and a double *form submit* test that bypasses `disabled`; mutation check (guard removed) → `onSuccess` called 2 times → fails; restored → passes. Transaction count stays 1 even without the guard (idempotent operationId): defense in depth.
- Checks: tsc clean; `npm test` 41 files / 323 tests.
- T5 Chrome (test mode): Beto balance changed 150 → 100 in DB while the modal still showed 150; confirmed 1× Arroz (S/ 4.50) with a double click → stored balance 104.50 (not 154.50), exactly 1 new transaction, 1 item, queue `customers:UPDATE, credit_transactions:INSERT, transaction_items:INSERT`; success screen correct.

## Next step
Review, then PR to `fix/liquid-glass-motion`. Follow-ups: migrate QuickPaymentModal to the same pattern; UX block (customer preselection, focus trap, operator chips, operator PIN decision, undo).
