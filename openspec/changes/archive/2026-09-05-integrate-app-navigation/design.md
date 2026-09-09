# Design: Integrate App Navigation

## Technical Approach

Introduce `react-router-dom` to manage application state and URL routing. Refactor `src/App.tsx` from a monolithic view into a declarative router setup. We will extract the existing Liquid Glass header into a unified `TopBar` and introduce a `TabBar` for mobile-first bottom navigation. The `<AppLayout>` will wrap all main authenticated routes, ensuring the navigation shell is persistent. We will also implement a `ProtectedRoute` component to restrict access to the Supervisor tab based on `useAuthStore().hasRole()`.

## Architecture Decisions

### Decision: Routing Library

**Choice**: `react-router-dom` v6+ (BrowserRouter)
**Alternatives considered**: State-based routing with Zustand or a custom History API integration.
**Rationale**: The spec requires explicit URL updates (`THEN the URL MUST update to the Clientes route`). `react-router-dom` provides declarative routing, nested layouts (via `<Outlet />`), and robust mechanisms for protected routes, making it the industry standard for React SPAs.

### Decision: Navigation State and Layout Shell

**Choice**: Create an `<AppLayout>` component that renders `<TopBar>`, `<main><Outlet /></main>`, and `<TabBar>`.
**Alternatives considered**: Adding TopBar and TabBar to every individual page component.
**Rationale**: Using a layout route prevents the navigation shell from unmounting and remounting on tab switches, ensuring smooth transitions and eliminating route guard flicker on the shell itself.

### Decision: Protected Route Guard

**Choice**: A `<ProtectedRoute requiredRole="supervisor">` wrapper component that evaluates `useAuthStore().hasRole(requiredRole)`.
**Alternatives considered**: Component-level redirects (e.g., `useEffect` inside `SupervisorPage`).
**Rationale**: A wrapper component prevents the unauthorized view from ever rendering (avoiding flicker) and centralizes the authorization logic at the routing layer. It will redirect unauthorized users to the default route (Caja).

### Decision: Sync Status State Management

**Choice**: Create a `useSyncStatus` React hook that subscribes to `syncManager.onStatusChange`.
**Alternatives considered**: Managing event listeners directly inside `TopBar`'s `useEffect`.
**Rationale**: Extracting to a hook keeps `TopBar` focused on presentation (Liquid Glass UI) and makes the sync status reusable for future offline-aware components.

## Data Flow

```text
Browser URL ──→ React Router 
                   │
                   ├─→ ProtectedRoute ──(Checks Role)──→ AuthStore
                   │      │
                   │      └──(Pass/Fail)──→ [Render Target | Redirect to /]
                   │
                   └─→ AppLayout 
                          ├── TopBar 
                          │     ├── (Reads) ──→ AuthStore (Active Cashier, Lock action)
                          │     └── (Reads) ──→ useSyncStatus (Network/Sync state)
                          │
                          ├── <Outlet /> (Main Content)
                          │
                          └── TabBar ──(Updates)──→ Browser URL
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `react-router-dom` to dependencies. |
| `src/App.tsx` | Modify | Remove inline `<header>`, wrap app in `<BrowserRouter>`, configure routes. |
| `src/components/navigation/AppLayout.tsx` | Create | Layout wrapping `<Outlet>` with TopBar and TabBar. |
| `src/components/navigation/TopBar.tsx` | Create | Sticky Liquid Glass top bar (extracted from App.tsx). |
| `src/components/navigation/TabBar.tsx` | Create | Fixed Bottom Tab bar with Liquid Glass styling. |
| `src/components/navigation/ProtectedRoute.tsx` | Create | Route guard wrapping Supervisor access. |
| `src/hooks/useSyncStatus.ts` | Create | Custom hook for `syncManager` status subscription. |
| `src/pages/PosPage.tsx` | Create | Placeholder page for Caja tab (`/`). |
| `src/pages/CustomersPage.tsx` | Create | Placeholder page for Clientes tab (`/clientes`). |
| `src/pages/HistoryPage.tsx` | Create | Placeholder page for Historial tab (`/historial`). |
| `src/pages/SupervisorPage.tsx` | Create | Placeholder page for Supervisor tab (`/supervisor`). |

## Interfaces / Contracts

```typescript
// src/hooks/useSyncStatus.ts
export function useSyncStatus(): SyncStatus;

// src/components/navigation/ProtectedRoute.tsx
export interface ProtectedRouteProps {
  requiredRole: CashierRole;
  children: React.ReactNode;
  fallbackPath?: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `ProtectedRoute` | Render with mocked `useAuthStore` roles (authorized vs unauthorized). Verify redirect. |
| Unit | `useSyncStatus` | Mock `syncManager` events and verify hook returns correct `SyncStatus`. |
| Integration | `AppLayout` Shell | Verify `TopBar` and `TabBar` render, and that clicking tabs updates the router location. |
| E2E | Role-Based Access | Log in as cashier, attempt to navigate to `/supervisor`, verify redirect to `/`. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. (This change involves frontend browser URL routing, not system/backend routing).

## Migration / Rollout

No migration required. This is a purely frontend architectural update that safely replaces the current single-view monolithic render with a client-side router.

## Open Questions

- None
