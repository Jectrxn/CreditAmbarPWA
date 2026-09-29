# Feature: nuevo-fiado-ux

## Objective
Remove the riskiest UX gaps of the "Nuevo Fiado" modal without redesigning it: never pick a customer on the user's behalf, move focus into modals correctly, and show operator names in full.

## Problem
- Opened from the "+" FAB, `QuickCreditModal` silently preselects `list[0]` (verified in Chrome: "Ana Torres" chosen with no user action) — fiado to the wrong person is the most expensive mistake.
- `LiquidModal` does not move focus into the dialog on open, does not trap Tab, and does not restore focus on close (focus stays on `BODY`, verified in Chrome). Affects every modal.
- `OperatorSelector` chips truncate names ("Emilia…", "Antho…", "Benja…", measured via DOM scrollWidth).

## Scope
- `src/components/ui/GlassSelect.tsx` + test — optional `placeholder`.
- `src/components/modals/QuickCreditModal.tsx` + test — no silent preselection; initial focus target.
- `src/components/ui/LiquidModal.tsx` + test — initial focus, focus trap, focus restore.
- `src/components/ui/OperatorSelector.tsx` + test — full names.

## Out of scope (pending product decisions)
- Operator PIN per fiado.
- "Undo"/void after confirming.
- QuickPaymentModal atomic migration.

## Constraints
- Keep the Liquid Glass look: reuse existing tokens; the only layout change allowed is the operator chips arrangement.
- Existing modal behavior (Escape, backdrop close) unchanged.
- Strict TDD: RED before GREEN.

## TDD
- Mode: enabled — source: user global CLAUDE.md ("Strict TDD Mode: enabled")
- Runner: `npx vitest run <file>`

## Tasks
- [ ] T1 `GlassSelect` `placeholder` prop: when `value` matches no option, show the placeholder in muted text; accessible name unchanged. Route: delegated (writer trigger: 4 non-trivial files).
- [ ] T2 `QuickCreditModal`: when opened without a customer, no customer is selected (placeholder "Selecciona un cliente"), debt/available chips hidden, CTA disabled until chosen; preselected customer flow unchanged. Route: delegated.
- [ ] T3 `LiquidModal`: on open focus `initialFocusRef` if given, else the first focusable element in the panel; Tab/Shift+Tab cycle inside the panel; on close restore focus to the previously focused element. `QuickCreditModal` passes the customer select (no customer) or the product search (customer given) as initial focus. Route: delegated.
- [ ] T4 `OperatorSelector`: names never truncated — 2-column grid when there are more than 3 operators, existing chip styling kept. Route: delegated.
- [ ] T5 Full checks and Chrome verification (FAB open → no customer selected, focus inside dialog, Tab trapped, focus restored, chips not truncated).

## Acceptance criteria
- Opening "Nuevo Fiado" from the FAB selects no customer and the CTA stays disabled until one is chosen.
- After opening any LiquidModal, `document.activeElement` is inside the dialog; Tab never leaves it; closing returns focus to the trigger.
- No operator name is truncated at mobile width.

## Checks
- `npx vitest run src/components/ui/GlassSelect.test.tsx src/components/ui/LiquidModal.test.tsx src/components/ui/OperatorSelector.test.tsx src/components/modals/QuickCreditModal.test.tsx`
- `npx tsc --noEmit`
- `npm test`

## Delivery
- Strategy: stacked-to-main (cached). Branch `feat/nuevo-fiado-ux` stacked on `feat/credit-sale-atomic` (PR #9) because it touches the same modal. Forecast ~300 authored lines (single PR).

## Progress and evidence
- Baseline: GlassSelect + LiquidModal + OperatorSelector + QuickCreditModal tests 39/39 passing.

## Next step
T1–T4 via delegated writer.
