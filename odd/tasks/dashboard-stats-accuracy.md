# Feature: dashboard-stats-accuracy

## Objective
Make the Home dashboard figures truthful and testable by extracting its aggregate calculations into a pure, unit-tested function, without changing the Liquid Glass visual design.

## Problem
- The "Antigua" badge in "Mayores Deudas Pendientes" is shown when `balance > 100`, not based on debt age.
- The debt progress bar falls back to a fake credit limit of 100 when `credit_limit` is missing or 0.
- Amounts mix `toLocaleString('en-US')` and `toFixed(2)`, so the same screen shows `1,234.56` and `1234.56`.
- All business calculations live inside the 719-line `HomePage.tsx` `useMemo`, so they cannot be tested without rendering.

## Why
Money figures on the main screen drive the shopkeeper's collection decisions; wrong signals ("Antigua", red bar at 100%) erode trust.

## Scope
- `src/utils/currency.ts` (new) + test
- `src/features/dashboard/dashboardStats.ts` (new) + test
- `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`
- Reuse `src/features/transactions/debtAgeCalculator.ts` (`calculateOldestUnpaidDate`).

## Constraints
- Preserve every existing Tailwind class, glass token, radius, shadow and layout. Only data/logic and the rendered values change.
- "Aged" debt threshold: 30 days since the oldest unpaid credit purchase (FIFO), same day-diff math as `CustomersPage` age filter.
- Progress bar is rendered only when the customer has `credit_limit > 0`.
- Currency format: `Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`, keeping the separate `S/` prefix.
- Strict TDD: RED before GREEN.

## TDD
- Mode: enabled — source: user global CLAUDE.md ("Strict TDD Mode: enabled")
- Runner: `npx vitest run <file>` (vitest, `npm test` = `vitest run`)

## Tasks
- [x] T1 `formatAmount()` helper in `src/utils/currency.ts` with tests. Route: delegated (writer trigger: 2+ non-trivial files across T1–T3).
- [x] T2 `computeDashboardStats(customers, transactions, now)` pure function with tests: totals, today metrics, top 5 debtors with `oldestUnpaidDate`, `isAged`, `creditUsageRatio` (null without limit). Route: delegated.
- [x] T3 Wire `HomePage.tsx` to T1/T2: "Antigua" from `isAged`, hide bar when ratio is null, unified formatting; update `HomePage.test.tsx`. Route: delegated.
- [x] T4 Full checks (`npx tsc --noEmit`, `npm test`) and visual check at mobile width in Chrome.

## Acceptance criteria
- A 5-day-old S/150 debt shows no "Antigua" badge; a 45-day-old S/20 debt does.
- A debtor with `credit_limit` 0 shows no progress bar.
- All dashboard amounts render with the same `es-PE` format.
- No visual class changes in the diff other than conditional rendering.

## Checks
- `npx vitest run src/utils/currency.test.ts src/features/dashboard/dashboardStats.test.ts src/pages/HomePage.test.tsx`
- `npx tsc --noEmit`
- `npm test`

## Delivery
- Strategy: ask-on-risk. Forecast ~300 authored lines (under 400 budget).
- Branch: `feat/dashboard-stats-accuracy` (from `fix/liquid-glass-motion` @ 0715cb7).

## Progress and evidence
- Baseline: `HomePage.test.tsx` 7/7 passing before changes.
- T1 `02df885` — RED: import unresolved; GREEN: currency.test 4/4.
- T2 `c3c4d29` — RED: import unresolved; GREEN: dashboardStats.test 12/12.
- T3 `4ca9b4a` — RED: 2 failed / 8 passed; GREEN: HomePage.test 10/10. HomePage.tsx diff is logic/value-only (+28/−69), classes unchanged; added `data-testid="debt-progress-bar"`.
- Writer verification: `npx tsc --noEmit` clean; `npm test` 42 files / 322 tests passed.
- Parent spot check: focused vitest run 26/26 passed; className diff inspected (reformat only).
- Note: dashboard debt age excludes cancelled transactions; `CustomersPage` currently passes all transactions to `calculateOldestUnpaidDate` (follow-up candidate).
- RDD: assess medium (576 lines, slice_budget_reached) → consent granted → lens review-reliability → approved; acknowledged, authority burned (lineage review-c674a298bd429a1f). Reviewed boundary advances to 2f35f20.
- Advisory (non-blocking) review findings, follow-up work:
  - WARNING `dashboardStats.test.ts` today-metrics test is timezone-dependent (local `setHours` vs UTC fixtures); passes only UTC-8..UTC+0.
  - WARNING "exact threshold" test only asserts the constant; no 29/30-day boundary test (`Math.ceil` rounds 29d+1m to 30).
  - SUGGESTION clamp future-dated purchases instead of `Math.abs`.
  - SUGGESTION use a row `data-testid` instead of `closest('div.p-2\\.5')` in HomePage tests.
- T4 (partial): Chrome at ~500px mobile width — dashboard renders identical to pre-change screenshot (hero, daily metrics, empty debtors state). Debtor rows ("Antigua", progress bar) not visually verified: local DB has no debtors.

- T4 (done): with user OK, seeded 6 customers / 8 txs into test-mode store `store-test` (ids `seed-dash-*`, no syncQueue entries; `ambar-store-1` untouched) and enabled test mode. Verified in Chrome at 500px: Antigua on Carmen (60d), Eduardo (40d oldest unpaid after partial payment), Ana (45d, S/20); no Antigua on Beto (5d, S/150); no bar on Doris (limit 0); bars 93% rose / 75% amber / 90% rose / 20% amber; 6th debtor excluded; totals S/587.50, fiado histórico S/692.50, cobrado S/105.00, fiado hoy S/12.50, cobrado hoy S/50.00 — all match hand-computed values.
- Visual observation (pre-existing layout, next block): debtor names truncate hard ("Carm…", "Eduar…") when the Antigua badge is present.

## Next step
Fix advisory test findings; then legibility block (text sizes, touch targets, name truncation).
