# Feature: abono-liquid-glass-balance

## Objective
Improve the Nuevo Abono/Pago modal with clear debt context, safe customer switching, accessible payment-method selection, and actionable amount validation.

## Problem
The current form shows the customer name and amount but does not make the customer's debt or the remaining balance obvious. Switching to a customer without debt can also leave a stale amount in the field, and the disabled CTA does not explain what is missing.

## Scope
- `src/components/modals/QuickPaymentModal.tsx`
- `src/components/modals/QuickPaymentModal.test.tsx`

## Constraints
- Keep the existing Liquid Glass bottom-sheet language.
- Preserve payment persistence, method values, operator selection, and sync behavior.
- Do not revert unrelated workspace changes.
- Do not change database schema.

## Tasks
- [x] T1 Show current debt and post-payment balance for the selected customer.
- [x] T2 Make customer switching reset the amount safely.
- [x] T3 Improve amount input, quick actions, payment-method accessibility, and disabled CTA copy.
- [x] T4 Add focused regression tests.
- [x] T5 Verify with tests, TypeScript, and a 390px browser pass.

## Progress and evidence
- Added a Liquid Glass balance context with current debt and post-payment balance.
- Switching to a customer without debt now clears the amount and blocks the CTA.
- Payment methods expose `aria-pressed`; amount uses decimal input, clear, and pay-all actions.
- CTA copy explains the blocking condition instead of appearing as a generic disabled button.
- `QuickPaymentModal.test.tsx`: 7/7 passing.
- `npx tsc --noEmit`: clean.
- `git diff --check`: clean.
- Browser verification at 390px completed for resting and active/blocking states.
- No commit created.

## Acceptance criteria
- Selecting a debtor updates the amount and debt context.
- Selecting a customer without debt clears the amount and blocks confirmation.
- Payment methods expose their selected state accessibly.
- The CTA explains the current blocking condition.
- Existing payment success and persistence behavior remains covered.

## Verification
- `npm test -- --run src/components/modals/QuickPaymentModal.test.tsx`
- `npx tsc --noEmit`
- Playwright at 390px: open Abono, inspect balance context, method state, and amount validation.
