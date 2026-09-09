# Tasks: integrate-app-navigation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (UI Shell) → PR 3 (Wiring) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: Resolved
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Hooks & Guard | PR 1 (base: main) | `npx vitest run useSyncStatus ProtectedRoute` | N/A (headless logic) | `rm src/hooks/useSyncStatus.ts src/components/navigation/ProtectedRoute.tsx` |
| 2 | UI Components | PR 2 (base: PR 1) | `npx vitest run TopBar TabBar AppLayout` | component preview | `rm -rf src/components/navigation` |
| 3 | Wiring Router | PR 3 (base: PR 2) | `npx vitest run App` | `npm run dev` routing | `git checkout main -- src/App.tsx` |

## Phase 1: Foundation & State Logic

- [x] 1.1 Run `npm install react-router-dom`
- [x] 1.2 Write RED test `src/hooks/useSyncStatus.test.ts` (mock syncManager events, assert status)
- [x] 1.3 Implement `src/hooks/useSyncStatus.ts` to pass tests
- [x] 1.4 Write RED test `src/components/navigation/ProtectedRoute.test.tsx` (mock useAuthStore role, assert redirects)
- [x] 1.5 Implement `src/components/navigation/ProtectedRoute.tsx`

## Phase 2: Navigation UI Components (Liquid Glass)

- [x] 2.1 Create placeholder pages: `PosPage.tsx`, `CustomersPage.tsx`, `HistoryPage.tsx`, `SupervisorPage.tsx`
- [x] 2.2 Write RED test `src/components/navigation/TopBar.test.tsx` (assert sync status, active profile, and lock session trigger)
- [x] 2.3 Implement `src/components/navigation/TopBar.tsx` using Liquid Glass styles and fallback
- [x] 2.4 Write RED test `src/components/navigation/TabBar.test.tsx` (assert route links and active route state)
- [x] 2.5 Implement `src/components/navigation/TabBar.tsx` using Liquid Glass styles

## Phase 3: Application Shell Integration

- [x] 3.1 Write RED test `src/components/navigation/AppLayout.test.tsx` (verify TopBar, TabBar, and Outlet render correctly)
- [x] 3.2 Implement `src/components/navigation/AppLayout.tsx`
- [x] 3.3 Update `src/App.tsx` to wrap app in `<BrowserRouter>` and map `<AppLayout>` to routes
- [x] 3.4 Wire routes to placeholder pages in `src/App.tsx`, applying `<ProtectedRoute requiredRole="supervisor">` to `/supervisor`
- [x] 3.5 Manually verify URL routing and role-based redirects in `npm run dev`
