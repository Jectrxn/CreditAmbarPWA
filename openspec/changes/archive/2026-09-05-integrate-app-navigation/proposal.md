# Proposal: Integrate App Navigation

## Intent

Introduce a unified, mobile-first navigation structure using the Liquid Glass UI pattern to centralize access to core features (POS, Credit, History, Supervisor) and display global app state (sync status, cashier session) seamlessly in `src/App.tsx`.

## Scope

### In Scope
- Implement a Liquid Glass Top Bar displaying store status, online/offline sync status, active cashier profile, and a lock session button.
- Implement Bottom/Tab Navigation with four main routes: Caja (POS), Clientes (Credit Accounts), Historial (Transactions & 10-min Grace), and Supervisor (Analytics & Force-Close).
- Implement role-based route guards to restrict the Supervisor tab to authorized roles only.
- Assemble the main application layout in `src/App.tsx`.

### Out of Scope
- Implementation of the individual tab contents (POS, Credit, History, Supervisor views) beyond their navigation shells.
- Backend authentication logic or deep offline sync mechanics (only the UI state indicators are in scope).

## Capabilities

> This section is the CONTRACT between proposal and specs phases.
> The sdd-spec agent reads this to know exactly which spec files to create or update.
> Research `openspec/specs/` before filling this in.

### New Capabilities
- `app-navigation`: Core navigation shell including tabs, top bar, and route routing/guards for the application layout.

### Modified Capabilities
- `liquid-glass-ui`: Add the app shell layout components (Top Bar and Tab Bar) conforming to the Liquid Glass design language.
- `cashier-session`: Expose active cashier profile to the top bar, add lock session trigger, and provide role evaluation for route guards.
- `pwa-core`: Expose online/offline status to the UI top bar.

## Approach

Use React Router (or existing routing solution) within `src/App.tsx` to define the four main routes. Build a layout component (e.g., `AppLayout`) that includes the Top Bar (sticky top) and Tab Navigation (fixed bottom, mobile-first). Apply the existing Liquid Glass UI design system (glassmorphism, backdrop filters) to these navigation elements. For the Supervisor tab, wrap the route in a `ProtectedRoute` component that checks the active cashier's role from the session context, redirecting or hiding the tab if unauthorized.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/App.tsx` | Modified | Overhauled to include the new routing layout and navigation components. |
| `src/components/navigation/` | New | Creation of `TopBar`, `TabBar`, and `ProtectedRoute` components. |
| `src/routes/` | New | Route configuration for the 4 main tabs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Route guard flicker before role loads | Medium | Show a loading state or suspend rendering until cashier session state is fully resolved. |
| Liquid Glass performance on low-end devices | Medium | Ensure backdrop-filter fallbacks or simplified transparency are available if performance drops. |

## Rollback Plan

Revert the changes in `src/App.tsx` to the previous minimal entry point and remove the imported layout components. Ensure previous entry points (if any) are restored in Git history.

## Dependencies

- React Router (or equivalent routing library).
- Existing `liquid-glass-ui` component primitives.
- `cashier-session` context for role verification and active profile.

## Success Criteria

- [ ] Top bar displays correct sync status, active profile, and lock button.
- [ ] Users can navigate smoothly between Caja, Clientes, Historial, and Supervisor tabs.
- [ ] Non-supervisor roles cannot access or see the Supervisor tab content (redirected or blocked).
- [ ] Navigation components visually match the Liquid Glass design system.
