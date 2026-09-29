# Feature: nuevo-fiado-undo

## Objective
Let the operator void a fiado right after registering it, from the success screen, until the modal closes — atomically and with the same rules the History page already uses.

## Problem
A mistaken fiado (wrong customer or amount) can only be voided from History, which requires navigating away and typing a reason. The moment of the mistake is the success screen.

## Product decision (user, 2026-09-29)
"Anular" is available on the Nuevo Fiado success screen until the modal closes.

## Scope
- `src/features/credit/creditService.ts` + test — new `voidCreditSale` use case.
- `src/components/modals/QuickCreditModal.tsx` + test — "Anular fiado" action on the success screen with an inline confirm, and a voided state.

## Rules (aligned with HistoryPage cancel flow)
- Transaction becomes `status: 'cancelled'`, `edit_reason` set, `updated_at` set; customer balance `max(0, balance − amount)`.
- Only within the existing 10-minute audit window (`AUDIT_GRACE_PERIOD_MS` in `transactionRules.ts`); in practice the success screen is always within it.
- Only `credit_purchase` in `completed` status of the active store.

## Out of scope
- Making HistoryPage cancel/undo atomic (same non-atomic pattern; follow-up).
- Voiding after the modal is closed (already possible from History).

## Constraints
- Reuse existing Liquid Glass tokens (rose tones already used for destructive/alert UI); no new visual language.
- Single `db.transaction`; idempotent (voiding an already-cancelled sale returns ok with no writes).
- Strict TDD: RED before GREEN.

## TDD
- Mode: enabled — source: user global CLAUDE.md ("Strict TDD Mode: enabled")
- Runner: `npx vitest run <file>`

## Tasks
- [x] T1 `voidCreditSale({ operationId, storeId, reason?, now? })`: one `db.transaction` over creditTransactions, customers, syncQueue; re-reads tx and customer; validates store, type, status, grace window; writes cancelled tx + restored rounded balance + 2 queue UPDATEs; idempotent. Tests: happy path, already cancelled (no writes), other store, payment type refused, outside grace window refused, rollback on inner failure, stale balance used from DB. Route: delegated (writer trigger: service + modal + tests).
- [x] T2 Success screen: "Anular fiado" secondary action → inline confirm ("¿Anular este fiado?" with "Sí, anular" / "Cancelar"); on success show voided state (title "Fiado anulado", restored balance, WhatsApp receipt hidden) and call `onSuccess` so the caller refreshes; errors shown in the existing alert. Tests: void flow restores balance and marks tx cancelled; cancel keeps it; action gone after voiding. Route: delegated.
- [x] T3 Full checks + Chrome verification.

## Acceptance criteria
- From the success screen, confirming "Sí, anular" leaves the customer balance as before the fiado and the transaction `cancelled`, with sync queue UPDATEs.
- Voiding twice never changes the balance twice.
- Closing the modal removes the option (History remains the path afterwards).

## Checks
- `npx vitest run src/features/credit/creditService.test.ts src/components/modals/QuickCreditModal.test.tsx`
- `npx tsc --noEmit`
- `npm test`

## Delivery
- Strategy: stacked-to-main (cached). Branch `feat/nuevo-fiado-undo` stacked on `feat/nuevo-fiado-ux`. Forecast ~300 authored lines.

## Progress and evidence
- T1 `032c0db` voidCreditSale — RED 8 failed (not a function); GREEN 28/28.
- T2 `00b2972` success-screen void — RED 2 failed/18; GREEN 20/20. Only new classes reuse existing rose/neutral tokens; no existing className changed.
- Shapes vs HistoryPage cancel: same fields and queue entries; deliberate differences: cents rounding and `synced:false` on the customer put (mirrors registerCreditSale).
- Checks: tsc clean; `npm test` 41 files / 350 tests. Parent spot check: focused 48/48.
- T3 Chrome (test mode): Eduardo 45.00 → fiado 1× Leche S/ 3.80 → 48.80 → "Anular fiado" → "¿Anular este fiado?" → "Sí, anular" clicked twice → balance 45.00, tx `cancelled` with reason, queue `credit_transactions:UPDATE, customers:UPDATE`; screen "Fiado anulado" with restored balance, WhatsApp and Anular hidden.
- Visual nits noted (not changed): voided state reuses the amber check icon and repeats "Fiado anulado" in header and body.

## Next step
Review, then PRs for the UX + undo branches (user decision).
