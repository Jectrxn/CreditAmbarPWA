# Feature: fiado-total-productos-liquid-glass

## Objective
Make product prices the primary source of truth for a new credit purchase, with an automatic Liquid Glass total and an explicit manual-adjustment exception.

## Problem
The form currently presents a manually editable total alongside product details, which can create an inconsistent transaction and makes the operator decide between two sources of truth.

## Scope
- `src/components/modals/QuickCreditModal.tsx`
- `src/components/modals/QuickCreditModal.test.tsx`
- `src/components/modals/ProductPicker.tsx`
- `src/components/modals/ProductPicker.test.tsx`
- Related visual verification only

## Constraints
- Keep the Liquid Glass visual language and bottom-sheet interaction.
- Preserve the existing transaction and sync behavior.
- Manual amount remains available only as an explicit adjustment path.
- Product prices must remain snapshotted in transaction items.
- Do not revert unrelated workspace changes.

## Tasks
- [x] T1 Make product-detail sum the default and visible source of truth.
- [x] T2 Replace the primary amount field with an automatic total and add an explicit manual-adjustment control.
- [x] T3 Add clear empty, over-limit, and adjustment states with Liquid Glass styling.
- [x] T4 Update focused tests for automatic totals, manual overrides, and validation.
- [x] T5 Verify with tests, TypeScript, and a 390px browser pass.

## Progress and evidence
- Product lines now calculate the visible total automatically; manual amount is hidden behind an explicit Liquid Glass adjustment toggle.
- Empty product state, over-limit warning, balance preview, and difference messaging are present.
- `QuickCreditModal.test.tsx` + `ProductPicker.test.tsx`: 22/22 passing.
- `npx tsc --noEmit`: clean.
- `git diff --check`: clean.
- Browser verification at 390px completed by the implementation agent for empty, automatic, and manual-adjustment states.
- No commit created.

## Acceptance criteria
- Adding products updates the displayed total automatically.
- The normal path never requires typing a total.
- Manual adjustment is clearly labeled and visibly toggled.
- The submit payload and transaction item prices remain correct.
- Invalid/empty/over-limit states are understandable and actionable.

## Verification
- `npm test -- --run src/components/modals/QuickCreditModal.test.tsx src/components/modals/ProductPicker.test.tsx`
- `npx tsc --noEmit`
- Playwright at 390px: open Nuevo Fiado, add products, inspect automatic total and adjustment state.
