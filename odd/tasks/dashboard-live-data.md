# Feature: dashboard-live-data

## Objective
Keep the Home dashboard in sync with local data automatically and show an honest loading state, without changing the Liquid Glass design.

## Problem
- `HomePage` loads customers and transactions once on mount (and after its own modals succeed). Data written elsewhere (SyncManager pulls, other pages, other tabs) does not refresh the dashboard.
- While loading, the hero and daily metrics render `S/ 0.00`, which is indistinguishable from a real zero.

## Why
The dashboard is the shopkeeper's source of truth; stale or fake-zero numbers lead to wrong collection decisions.

## Scope
- `src/hooks/useLiveDexieQuery.ts` (new) + test — thin hook over Dexie 4 core `liveQuery` (no new dependency; `dexie-react-hooks` is not installed).
- `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`.

## Constraints
- No new npm dependency.
- Preserve every existing Tailwind class, glass token and layout; skeletons reuse existing containers and only swap the value text for a placeholder pill while loading.
- Keep the success toast after modal operations.
- Strict TDD: RED before GREEN.

## TDD
- Mode: enabled — source: user global CLAUDE.md ("Strict TDD Mode: enabled")
- Runner: `npx vitest run <file>` (fake-indexeddb in `src/test/setup.ts`)

## Tasks
- [x] T1 `useLiveDexieQuery(querier, deps)` hook: subscribes via `liveQuery`, returns `{ data, isLoading, error }`, resubscribes on deps change, unsubscribes on unmount. Tests: initial load, updates after a table write, deps change, error surfaced. Route: delegated (writer trigger: 2+ non-trivial files).
- [x] T2 Wire `HomePage` to the hook for customers + transactions by active store; drop manual `loadData` refresh (keep toast); test that a direct `db.customers` write updates the hero total without remount. Route: delegated.
- [x] T3 Skeletons: while loading, hero total, hero mini stats, daily metrics values and pending-accounts count render a placeholder pill (`animate-pulse` + existing neutral glass tones) instead of `0.00`; tests for loading vs loaded. Route: delegated.
- [x] T4 Full checks and Chrome visual check (loading state + live update via a DB write in the page).
- [x] T5 Fix stale-store paint: derive loading from a deps token during render so the first render after a deps change never returns previous data with `isLoading=false`. Route: inline (hook + its test, small and understood).
- [x] T6 Make the unmount test observable: after unmount, a table write must not re-run the querier. Route: inline.

## Acceptance criteria
- Writing a customer with balance to `db.customers` for the active store updates "Total por Cobrar" without reload.
- No `S/ 0.00` is shown before the first query resolves.
- No visual class changes other than the loading placeholders.

## Checks
- `npx vitest run src/hooks/useLiveDexieQuery.test.ts src/pages/HomePage.test.tsx`
- `npx tsc --noEmit`
- `npm test`

## Delivery
- Strategy: `stacked-to-main` (PR3 of the dashboard stack). Forecast ~300 authored lines.
- Branch: `feat/dashboard-live-data`, stacked on `feat/dashboard-stats-accuracy`.

## Progress and evidence
- T1 `78d923d` — RED: import unresolved; extra RED: sync throw uncaught → wrapped querier in async arrow; GREEN 5/5.
- T2 `31e0aaa` — RED: live-update test timed out (14/1); GREEN 15/15. `loadData` removed; toast kept; error logging preserved.
- T3 `0874d48` — RED 15/2; GREEN 17/17. Skeletons on hero total (S/ prefix kept), pending badge, mini stats, daily metrics values+counts, and "Total fiado histórico" (added by writer to satisfy the "no S/ 0.00 while loading" criterion; accepted). `aria-busy` on page container. No existing class changed.
- Writer verification: tsc clean; `npm test` 43 files / 338 tests. Pre-existing act() warnings unchanged.
- Parent spot check: focused run 22/22.
- T4 Chrome (test-mode data): wrote a customer (S/100) directly to `db.customers` → hero 587.50 → 687.50 without reload; deleted → 587.50. After load: 0 skeletons, `aria-busy="false"`. Loading state itself not captured visually (local load is near-instant); covered by tests.

- RDD: assess since 2f35f20 medium, 656 lines, slice_budget_reached → consent granted → review-reliability approved; acknowledged, authority burned (lineage review-8b3a8ece48c63ecb). Reviewed boundary advances to HEAD (covers PR2 + PR3 slices).
- Advisory (non-blocking) findings, follow-up work:
  - WARNING unmount test is vacuous (only asserts no console.error; would pass without unsubscribe).
  - WARNING stale-store paint: reset runs in useEffect after paint, so on `activeStoreId` change one frame shows the previous store's data with `isLoading=false`.
  - SUGGESTION query error still renders `S/ 0.00` everywhere (pre-existing behavior; no error-state test).

- T5+T6 `d602b2b` (route inline, one commit: both tasks share the hook test file). T5 RED: stale-frame test failed (first render after deps change returned previous store data); fix: deps token via `useMemo(() => ({}), deps)`, results tagged with their token, loading derived during render; GREEN. T6: new unmount test counts querier runs after unmount; mutation check (removed `unsubscribe()`) → failed `expected 3 to be 2`, restored → passes. Replaced the vacuous console.error-based test.
- Checks: focused 23/23; tsc clean; `npm test` 43 files / 339 tests.
- Chrome (MutationObserver over store switch via test-mode toggle): `587.50 → SKELETON → 0.00`, back `SKELETON → 587.50`; no stale frame.

## Next step
Later: dashboard error state (still renders S/ 0.00 on query error). Push/PRs are the user's decision.
