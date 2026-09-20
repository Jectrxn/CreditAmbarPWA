# Feature: Catálogo de productos con autocompletado híbrido

## Objective
Detalle del fiado inteligente: sugerir productos del catálogo mientras se escribe y crear productos al vuelo cuando no hay coincidencia.

## Problem
El detalle del fiado es texto libre (`notes`). Escribir "1 Arroz costeño, 1 Aceite Primor..." a mano en cada venta es lento y genera variantes sucias ("Arroz costeno", "arroz costeño"...). La tabla `products` existe en Dexie/Supabase pero nada la usa.

## Why
Velocidad de kiosco: seleccionar en 1 toque en vez de tipear. Base para futuros `transaction_items` reales.

## Scope (authorized)
- `src/features/products/productService.ts` (list/search/create por store + syncQueue, espejo de `creditService.ts`)
- Autocompletado en el campo Detalle de `QuickCreditModal`: sugiere coincidencias, tap agrega al texto; sin coincidencia ofrece crear con precio inline
- Tests vitest (servicio + UI)
- Visual verify con Playwright

## Out of scope (v1)
- Pantalla admin de catálogo (ver/editar/eliminar productos)
- Vincular `transaction_items` al fiado (el detalle sigue siendo texto)
- Precios automáticos en el monto (el operador sigue digitando el total)

## Constraints
- TDD: **Strict TDD ENABLED** (fuente: observación sdd-init/creditambarpwa, runner `vitest run`). NOTA 2026-09-19: T1+T2 se delegaron con modo "unresolved" por búsqueda de memoria incompleta; los tests existen y pasan (9 nuevos), así que no hay retrabajo — en próximas delegaciones pasar modo + runner explícitos.
- Liquid Glass tokens (GEMINI.md): popover sugerencias igual que GlassSelect
- Sin nuevas dependencias

## Checklist
- [x] T1. `productService`: searchProducts(storeId, query), createProduct({storeId, name, price}) + syncQueue — con tests (route: delegated) — DONE 2026-09-19, 6 tests
- [x] T2. Autocompletado + creación al vuelo en Detalle — con tests UI (route: delegated, mismo writer) — DONE 2026-09-19, 3 tests UI; full suite 253/253 + tsc limpio
- [x] T3. Visual verify Playwright: sugerencia, selección, creación al vuelo (route: inline, parent) — DONE 2026-09-19: Crear "Arroz costeño" + precio 4.50, luego "arr" sugiere con precio, tap inserta; capturas aprobadas, estilo glass correcto
- [ ] T4. Commit (solo con autorización explícita)

## Authorized scope
 Rama de trabajo actual del usuario; commits y push solo con pedido explícito.

## Acceptance criteria
- Escribir "arr" sugiere "Arroz costeño" del catálogo; un tap lo agrega al detalle
- Texto sin coincidencia muestra "Crear 'X'" → pide precio → crea producto y lo agrega
- Productos scoped por store_id; syncQueue recibe INSERT/UPDATE como customers
- Suite verde + tsc limpio + capturas Playwright aprobadas

## Applicable checks
`npx vitest run <archivos>` + `npx tsc --noEmit` + Playwright visual (390px)

## Progress
- 2026-09-19: feature creado, decisión híbrida confirmada por usuario. T1+T2 delegados y completados (productService.ts + autocomplete en QuickCreditModal, suite 253/253, tsc limpio). Notas del writer: sin debounce (Dexie local, guard de secuencia anti-stale); warnings benignos de act() en test Crear-flow.

## Next step
Delegar T1+T2 a un writer con este documento como contexto.
