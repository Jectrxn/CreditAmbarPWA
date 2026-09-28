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
- [ ] T1 `useLiveDexieQuery(querier, deps)` hook: subscribes via `liveQuery`, returns `{ data, isLoading, error }`, resubscribes on deps change, unsubscribes on unmount. Tests: initial load, updates after a table write, deps change, error surfaced. Route: delegated (writer trigger: 2+ non-trivial files).
- [ ] T2 Wire `HomePage` to the hook for customers + transactions by active store; drop manual `loadData` refresh (keep toast); test that a direct `db.customers` write updates the hero total without remount. Route: delegated.
- [ ] T3 Skeletons: while loading, hero total, hero mini stats, daily metrics values and pending-accounts count render a placeholder pill (`animate-pulse` + existing neutral glass tones) instead of `0.00`; tests for loading vs loaded. Route: delegated.
- [ ] T4 Full checks and Chrome visual check (loading state + live update via a DB write in the page).

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
- (none yet)

## Next step
T1–T3 via delegated writer.
