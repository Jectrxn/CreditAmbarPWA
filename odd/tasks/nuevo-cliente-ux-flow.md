# Feature: nuevo-cliente-ux-flow

## Objective
Elevate UX/UI, ergonomics, and flow in `NewCustomerModal`: remove the nested card wrapper, add quick credit limit preset chips, format phone/WhatsApp, and make "Guardar Cliente" a full-width ergonomic CTA.

## Problem
The current modal suffers from "card-in-a-card" syndrome with triple framing, cramped actions with tiny pill buttons in the bottom right corner, no quick selection chips for common bodega credit limits, and a plain unformatted phone field.

## Scope
- `src/components/modals/NewCustomerModal.tsx`
- Existing test suites in `src/pages/CustomersPage.test.tsx`
- Visual inspection via browser at mobile viewport (390px).

## Constraints
- Preserve customer creation, duplicate validation, and database persistence.
- Preserve Liquid Glass tokens and bottom-sheet behavior.
- Ensure accessibility labels and test queries remain intact or gracefully updated.

## Tasks
- [x] T1 Remove nested "card-in-a-card" wrapper and let fields sit directly on the `LiquidModal` surface.
- [x] T2 Add quick-preset chips (S/ 50, S/ 100, S/ 200, S/ 300) for credit limit with active indicator and editable input.
- [x] T3 Enhance Phone / WhatsApp field with 9-digit format helper and clean badge.
- [x] T4 Replace split footer pills with a full-width ergonomic CTA with specular highlights and thumb-zone reach.
- [x] T5 Run automated tests and TypeScript verification.
- [x] T6 Launch browser verification at 390px, capture screenshot, and perform mandatory UX/UI visual review.

## Progress and evidence
- Removed unnecessary wrapping card in `NewCustomerModal.tsx` so fields breathe directly on `LiquidModal`.
- Added quick limit preset chips (`S/ 50`, `S/ 100`, `S/ 200`, `S/ 300`) with active gold highlight and custom numeric input with crisp `S/` prefix.
- Transformed "Guardar Cliente" into a full-width ergonomic bottom CTA with specular highlight and reactive disabled state, placing "Cancelar" centered below it.
- Verified TypeScript compilation: `npx tsc --noEmit` clean.
- Verified unit and integration tests: `CustomersPage.test.tsx` 14/14 passing.
- Conducted visual inspection at 390px mobile viewport capturing resting, focused, filled, and success states:
  - `new_customer_redesign_screenshot.png`
  - `new_customer_filled_screenshot.png`
  - `new_customer_success_screenshot.png`
