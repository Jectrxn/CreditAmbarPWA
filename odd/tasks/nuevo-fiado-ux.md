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
- [x] T1 `GlassSelect` `placeholder` prop: when `value` matches no option, show the placeholder in muted text; accessible name unchanged. Route: delegated (writer trigger: 4 non-trivial files).
- [x] T2 `QuickCreditModal`: when opened without a customer, no customer is selected (placeholder "Selecciona un cliente"), debt/available chips hidden, CTA disabled until chosen; preselected customer flow unchanged. Route: delegated.
- [x] T3 `LiquidModal`: on open focus `initialFocusRef` if given, else the first focusable element in the panel; Tab/Shift+Tab cycle inside the panel; on close restore focus to the previously focused element. `QuickCreditModal` passes the customer select (no customer) or the product search (customer given) as initial focus. Route: delegated.
- [x] T4 `OperatorSelector`: names never truncated — 2-column grid when there are more than 3 operators, existing chip styling kept. Route: delegated.
- [x] T5 Full checks and Chrome verification (FAB open → no customer selected, focus inside dialog, Tab trapped, focus restored, chips not truncated).

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

- T1 `0c88378` GlassSelect placeholder — RED 1 failed/5; GREEN 6/6.
- T2 `4280e1b` no silent preselection — RED: "Deuda: S/ 50.00" chip present without customer prop; GREEN 16/16.
- T3 `588aefa` LiquidModal focus move/trap/restore — RED 4 failed/17; GREEN 21/21; QuickCreditModal focus targets RED 2 failed → GREEN 18/18. GlassSelect/ProductPicker forwardRef.
- T4 `9e341a3` OperatorSelector: >3 operators → `grid grid-cols-2`, no `truncate` — RED 1 failed/5; GREEN 6/6.
- Parent fix `8d95dd5` (route inline): writer flagged that always-override focus would steal `NewCustomerModal`'s `autoFocus`; now content already focused inside the panel wins over the first-focusable fallback (RED → GREEN). Checks: tsc clean; `npm test` 41 files / 337 tests.
- Class changes (all): GlassSelect placeholder `text-slate-400`; OperatorSelector grid/truncate conditional for >3 operators. Nothing else.
- T5 Chrome (test mode): FAB → Nuevo Fiado shows "Selecciona un cliente", no Deuda chip, CTA disabled, focus on the customer select; 25× Tab keeps focus inside; operator names not truncated (scrollWidth check); New Customer modal keeps focus on its name input.
- Known limitation: opening from the FAB menu, focus returns to BODY on close because the menu item that triggered it is unmounted; follow-up: TabBar should hand focus back to the FAB.

- RDD: assess vs `feat/credit-sale-atomic` medium, 449 lines → consent granted → review-reliability approved; acknowledged, burned (lineage review-f9314b001b5e4960).
- Post-review fix `fc4852f` (route inline): Tab from a non-listed spot/outside is pulled back into the panel; hidden (`display:none`, `visibility:hidden`, `[hidden]`, `[inert]`, `aria-hidden`) elements skipped; backdrop close covered by test; parent found that stacked modals (each portaled to body, e.g. HistoryPage siblings) would steal focus from each other → only the topmost open modal runs the Tab trap (RED confirmed, then GREEN). Checks: tsc clean; `npm test` 41 files / 340 tests.

- Product decision (user, 2026-09-29): no PIN per fiado for now — selecting the operator name is enough (trust the open cash session). The name keeps being stored in `cashier_pin_hash` (existing field naming, unchanged).

## Next step
Stacked PR on #9 (user decision; branch ~547 lines → split in 2). Pending product decision: undo/void after confirming.
