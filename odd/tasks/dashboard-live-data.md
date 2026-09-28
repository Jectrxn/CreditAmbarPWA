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

## Next step
Native review of the pending slice (PR2 + PR3 commits since boundary 2f35f20).
