# Feature: nuevo-fiado-motion-fluidity

## Objective
Enhance motion, fluidity, micro-animations, and semantic visual feedback in `QuickCreditModal` and `ProductPicker`.

## Problem
Currently, product search suggestions pop abruptly without transitions, newly added line items jump into the DOM without entry motion, toggling between automatic and manual totals causes layout jumps, and the submit CTA displays a disabled amber gradient instead of a neutral glass state.

## Scope
- `src/components/modals/ProductPicker.tsx`
- `src/components/modals/QuickCreditModal.tsx`
- Existing test suites covering credit transactions and modals.
- Browser visual verification at mobile viewport (390px).

## Constraints
- Preserve total calculation, manual override, product search, fast creation, and persistence behavior.
- Preserve Liquid Glass tokens and bottom-sheet specifications.
- Ensure all test assertions remain green.

## Tasks
- [x] T1 Add fluid entrance animation (`animate-in fade-in-50 slide-in-from-top-2`) to search matches popover and fast product creation in `ProductPicker.tsx`.
- [x] T2 Add organic entry animation (`animate-in fade-in slide-in-from-bottom-2`) to added line item rows in `ProductPicker.tsx`.
- [x] T3 Add smooth transition and fade motion when toggling between automatic and manual amount modes in `QuickCreditModal.tsx`.
- [x] T4 Add fade animation to collapsible note and refine amount input contrast with `z-10` prefix.
- [x] T5 Align CTA semantic styling: radiant amber gradient with specular highlight when valid, neutral slate-glass when blocked or disabled.
- [x] T6 Run automated tests and TypeScript verification.
- [x] T7 Conduct mobile browser visual inspection at 390px, capturing active product search and manual adjustment states.

## Progress and evidence
- Integrated Tailwind motion transitions into `ProductPicker.tsx`:
  - Search suggestions popover opens with `animate-in fade-in-50 slide-in-from-top-2 duration-150`.
  - Added line item rows slide into view with `animate-in fade-in slide-in-from-bottom-2 duration-200`.
  - Collapsible note area opens with `animate-in fade-in slide-in-from-top-1 duration-200`.
- Integrated layout transitions in `QuickCreditModal.tsx`:
  - Toggle between automatic total and manual adjustment transitions with `animate-in fade-in duration-200`.
  - Amount input upgraded to high contrast (`bg-white/[0.85]`) with elevated `z-10` `S/` prefix.
  - Submit CTA uses active radiant amber gradient when ready, and neutral slate glass when blocked or disabled.
- Verified TypeScript compilation: `npx tsc --noEmit` clean.
- Verified unit and integration tests: `QuickCreditModal.test.tsx` (13/13) and `CustomersPage.test.tsx` (14/14) passing. Total 27/27 passing.
- Committed in `fa1eae7`.
- Conducted mobile browser visual verification at 390px:
  - `quick_credit_auto_redesign.png`: verified animated products and automatic total panel.
  - `quick_credit_manual_redesign.png`: verified manual mode transition, +10 quick chip, and difference feedback.
