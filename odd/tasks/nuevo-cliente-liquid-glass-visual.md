# Feature: nuevo-cliente-liquid-glass-visual

## Objective
Bring Nuevo Cliente into the same Liquid Glass visual system as Nuevo Fiado and Abono, with clearer hierarchy and a stronger primary action.

## Problem
The modal is functional but visually too white and flat: the fields blend into the sheet, the credit limit lacks emphasis, and the two footer actions have insufficient hierarchy.

## Scope
- `src/components/modals/NewCustomerModal.tsx`
- Focused existing page/modal tests covering Nuevo Cliente.

## Constraints
- Keep existing customer creation, duplicate detection, persistence, and success behavior.
- Preserve Liquid Glass tokens and bottom-sheet behavior.
- Do not revert unrelated workspace changes.
- Do not add unrelated fields or database changes.

## Tasks
- [x] T1 Add warm translucent depth and stronger edge treatment to the form surface.
- [x] T2 Establish visual hierarchy for name, optional phone, and credit-limit fields.
- [x] T3 Rebalance Cancel and primary Save actions.
- [x] T4 Update focused tests if selectors or accessible copy change.
- [x] T5 Verify with tests, TypeScript, and a 390px browser pass.

## Progress and evidence
- Form surface now has warm translucent depth, stronger edges, and inset glass treatment.
- Credit limit is a dedicated amber glass panel with stronger hierarchy.
- Cancel is lightweight; Guardar Cliente is the dominant primary action.
- Existing selectors and behavior remain unchanged; no test rewrite was required.
- `CustomersPage.test.tsx`: 14/14 passing.
- `npx tsc --noEmit`: clean.
- `git diff --check`: clean.
- Browser verification at 390px completed for resting and focused states.
- Structural follow-up: `NewCustomerModal` now uses `variant="bottom-sheet"` and keeps Cancel/Save in the same action row as the other modal flows.
- No commit created.

## Acceptance criteria
- The modal feels visually consistent with the other Liquid Glass bottom sheets.
- Credit limit is clearly emphasized without making the form crowded.
- Primary and secondary actions are visually distinct.
- Existing validation and save behavior remain intact.

## Verification
- `npm test -- --run src/pages/CustomersPage.test.tsx`
- `npx tsc --noEmit`
- Playwright at 390px: open Nuevo Cliente and inspect resting and focused states.
