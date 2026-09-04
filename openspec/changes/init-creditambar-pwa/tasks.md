# Tasks: CreditAmbar PWA Initiative

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,200 - 1,600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation & Liquid Glass UI | PR 1 (base: tracker) | `npm run test src/components/ui` | `npm run dev` | UI tokens, layouts, modal components |
| 2 | Dexie IndexedDB & Offline Sync Engine | PR 2 (base: PR 1) | `npm run test src/lib/syncManager.test.ts` | `npm run test:offline` | Dexie schema, sync manager, Supabase migrations |
| 3 | Credit Transactions & Cash FCC vs QR | PR 3 (base: PR 2) | `npm run test src/features/transactions` | `npm run dev` | Transaction forms, FCC session & audit window |
| 4 | Supervisor Dashboard & Analytics | PR 4 (base: PR 3) | `npm run test src/features/supervisor` | `npm run dev` | Supervisor dashboard, metrics & force-close flow |

## Phase 1: Foundation & Liquid Glass UI (PR 1)

- [x] 1.1 Scaffold Vite React TypeScript PWA setup in `package.json`, `vite.config.ts`, and `index.html`.
- [x] 1.2 Configure Tailwind CSS with Liquid Glass design tokens (blur, translucency) in `tailwind.config.js` and `src/index.css`.
- [x] 1.3 Implement shared-phone store auth and PIN state in `src/store/authStore.ts`.
- [x] 1.4 Write failing test (RED) for Liquid Glass modal and fallback styling in `src/components/ui/LiquidModal.test.tsx`.
- [x] 1.5 Implement `src/components/ui/LiquidModal.tsx` and `src/components/ui/GlassCard.tsx` with responsive orientation support.

## Phase 2: Dexie IndexedDB & Offline Sync Engine (PR 2)

- [ ] 2.1 Write failing test (RED) for cross-tenant isolation and 10-minute grace policy in `tests/rls-policies.test.ts`.
- [ ] 2.2 Create Supabase SQL migrations and RLS policies for profiles, customers, products, and transactions in `supabase/migrations/20260903000000_init_schema.sql`.
- [ ] 2.3 Setup Supabase client and TypeScript types in `src/lib/supabase.ts` and `src/types/database.ts`.
- [ ] 2.4 Write failing test (RED) for offline Dexie queue persistence and sync retries in `src/lib/syncManager.test.ts`.
- [ ] 2.5 Implement Dexie IndexedDB schema and transaction queues in `src/lib/dexie.ts`.
- [ ] 2.6 Implement offline-first auto-sync orchestrator with network listeners in `src/lib/syncManager.ts`.

## Phase 3: Credit Transactions & Cash FCC vs QR (PR 3)

- [ ] 3.1 Write failing test (RED) for FCC cash isolation, float declarations, and 10-minute audit immutability in `src/features/transactions/transactionRules.test.ts`.
- [ ] 3.2 Implement cashier session store enforcing float declarations and FCC cash isolation in `src/features/session/sessionStore.ts` and `src/features/session/CashierSessionModal.tsx`.
- [ ] 3.3 Implement customer credit account creation and credit limit checks in `src/features/credit/creditService.ts` and `src/features/credit/CustomerCreditCard.tsx`.
- [ ] 3.4 Implement transaction recording distinguishing Cash FCC from QR payments in `src/features/transactions/TransactionForm.tsx`.
- [ ] 3.5 Implement 10-minute grace window edit/undo flow and WhatsApp balance link generator in `src/features/transactions/TransactionHistory.tsx` and `src/features/transactions/whatsappHelper.ts`.

## Phase 4: Supervisor Dashboard & Analytics (PR 4)

- [ ] 4.1 Write failing test (RED) for real-time metrics aggregation and offline warning indicators in `src/features/supervisor/supervisorMetrics.test.ts`.
- [ ] 4.2 Implement real-time metrics aggregation hook for active sessions in `src/features/supervisor/useSupervisorMetrics.ts`.
- [ ] 4.3 Implement supervisor dashboard with offline status banner in `src/features/supervisor/SupervisorDashboard.tsx`.
- [ ] 4.4 Write failing test (RED) for force-closing session during active queue sync in `src/features/supervisor/forceClose.test.ts`.
- [ ] 4.5 Implement supervisor force-close session action ensuring pending transaction flush in `src/features/supervisor/forceCloseAction.ts`.
- [ ] 4.6 Configure Service Worker asset caching and offline navigation fallback in `src/sw.ts`.
