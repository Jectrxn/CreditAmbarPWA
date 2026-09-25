# Feature: abono-pago-ux-flow

## Objective
Elevate UX/UI, contrast, and checkout flow in `QuickPaymentModal`: high-contrast amount input, quick amount chips (S/ 10, S/ 20, S/ 50, Pagar Todo), clean "al día" state when debt is 0, and semantic CTA styling.

## Problem
The amount input is washed out (`bg-white/[0.15]`), lacks quick preset chips for fast retail payment, shows a confusing green CTA when disabled due to zero debt, and treats zero-debt accounts with a rigid technical balance table.

## Scope
- `src/components/modals/QuickPaymentModal.tsx`
- Existing test suites covering payments and customers.
- Visual inspection via browser at mobile viewport (390px).

## Constraints
- Preserve Dexie transactions, customer balance updates, sync queue events, and WhatsApp receipt integration.
- Preserve Liquid Glass tokens and bottom-sheet behavior.
- Ensure all existing test assertions remain green.

## Tasks
- [x] T1 Calibrate "Monto a Cobrar" input contrast, text weight, and sharp `S/` prefix.
- [x] T2 Add quick payment preset chips (S/ 10, S/ 20, S/ 50, Pagar Todo) when customer has outstanding debt.
- [x] T3 Improve debt status card: distinct state for "Cliente al día (Sin deuda pendiente)" vs active debt with live preview.
- [x] T4 Align CTA semantic styling: emerald gradient when ready to pay, neutral glass when disabled.
- [x] T5 Run automated tests and TypeScript verification.
- [x] T6 Conduct browser visual verification at 390px, capturing both zero-debt and active-debt states.

## Progress and evidence
- Upgraded `QuickPaymentModal.tsx` amount input to high-contrast liquid glass (`bg-white/[0.85]`) with elevated `S/` prefix.
- Integrated 1-touch preset chips (`S/ 10`, `S/ 20`, `S/ 50`, `Pagar todo`) dynamically displayed when the selected customer has debt.
- Added friendly celebratory badge (`✓ ¡Cliente al día! Sin deudas pendientes`) and emerald card border when balance is 0.
- Calibrated primary button semantic styling: vivid emerald gradient with specular highlight when valid, and neutral muted slate-glass when blocked or disabled.
- Ran tests: `QuickPaymentModal.test.tsx` (7/7) and `CustomersPage.test.tsx` (14/14) passing. Total 21/21 passing.
- Verified TypeScript compilation: `npx tsc --noEmit` clean.
- Performed Playwright browser inspection at 390px:
  - `quick_payment_debtor_redesign.png`: verified debtor state with active chip S/ 50 and emerald CTA.
  - `quick_payment_zero_debt_redesign.png`: verified zero-debt state with celebratory badge and neutral disabled button.
