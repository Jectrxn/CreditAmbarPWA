# Feature: Modo prueba particionado por store_id

## Objective
Probar internamente contra el Supabase real sin contaminar los datos de producción: un modo prueba que opera sobre `store-test` mientras la bodega real vive en `ambar-store-1`.

## Problem
`.env.local` ya apunta a producción y el navegador local tiene datos de prueba. Al abrir la app, el sync los subiría. Además hay un mismatch: el seed remoto es `store-default` pero la app sesiona `ambar-store-1`.

## Findings (verified 2026-09-20)
- `App.tsx` auto-inicia `storeSession = { storeId: 'ambar-store-1', ... }` — ese es el store REAL.
- Escrituras ya van scoped (`activeCustomer.store_id || storeSession?.storeId || 'store-default'`) en QuickCreditModal, QuickPaymentModal, NewCustomerModal, productService.
- Servicios filtran por storeId (`listCustomers`, `searchProducts`).
- PENDIENTE AUDITAR: si las páginas (Home, Customers, History, Supervisor) leen filtrado por store o con `.toArray()` sin filtro.
- Datos de prueba locales viven bajo `ambar-store-1` (el store real) — hay que decidir su destino antes del primer sync.
- Remoto: solo existe profile `store-default`; faltan `ambar-store-1` y `store-test`.

## Scope (authorized)
- Toggle de modo prueba + `useActiveStoreId()` (sesión + override de prueba)
- Auditoría y fix de read-paths: toda lectura filtra por store activo
- Seeds remotos `ambar-store-1` + `store-test` (migración 0002)
- Destino de datos de prueba locales (wipe o migración a store-test)
- Indicador visual persistente de "MODO PRUEBA" (no operar a ciegas)
- Tests (Strict TDD) + visual verify

## Out of scope (v1)
- RLS policies por store (anon sigue permissive; partición es a nivel app)
- Multi-tienda real / selector de sucursal para producción
- Limpieza remota de prod (prod está limpio hoy)

## Constraints
- Strict TDD ENABLED (fuente: sdd-init; runner `npx vitest run`) — RED primero, sin excepción
- Liquid Glass tokens (GEMINI.md) para toggle + badge
- Sin nuevas dependencias

## Checklist
- [x] T1. Audit read-paths — DONE 2026-09-20 (delegated explorer): 9 files UNSCOPED (Home, Customers, History, Supervisor, PosPage, 2 modals pickers, TabBar badge, CustomerDetailModal MIXED). Ya scoped: productService, listCustomers, TransactionHistory (sin wiring). Tests de páginas asumen unfiltered → reescribir en T3.
- [x] T2. Toggle + useActiveStoreId + badge MODO PRUEBA (route: delegated writer, TDD) — DONE 2026-09-20
- [x] T3. Read-path fixes + tests (route: delegated writer, TDD) — DONE: RED 22 fail → GREEN 282/282 + tsc limpio
- [x] T4. Migración 0002 (seeds) — DONE archivo, SIN ejecutar remoto (lo corre el usuario)
- [x] T5. Visual verify (route: inline, parent) — DONE 2026-09-20 con env placeholder (cero sync a prod): badge ON/OFF, métricas 0 vs 35.50, clientes 0 vs 2, creado Test Partition solo visible en test, persistencia tras reload, aislamiento bidireccional. NIT visual: badge MODO PRUEBA roza el logo a 390px (follow-up, no bloquea)
- [ ] T6. Commits (solo con autorización explícita)

## Authorized scope
 Rama actual; commits y escrituras remotas solo con pedido explícito.

## Acceptance criteria
- En modo prueba: crear cliente/fiados solo toca `store-test` local y remoto; al volver a normal se ve solo `ambar-store-1`
- Badge visible siempre en modo prueba
- Cero filas de prueba bajo `ambar-store-1` en remoto tras el primer sync
- Suite verde + tsc + capturas

## Applicable checks
`npx vitest run` + `npx tsc --noEmit` + Playwright (390px) + verificación remota read-only

## Progress
- 2026-09-20: feature creado, decisión partición-por-store del usuario. Activación decidida: **toggle con PIN supervisor/jefe** (ubicación tentativa: Reportes). T1 en curso.

## Next step
T1 audit + definir ubicación del toggle (pregunta al usuario).
