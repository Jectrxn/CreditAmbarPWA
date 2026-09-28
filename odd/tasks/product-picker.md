# Feature: Detalle como lista estructurada (ProductPicker)

## Objective
Reemplazar el textarea libre del detalle por buscador + lista de renglones (qty × producto × precio), con creación al vuelo. El detalle pasa de texto a datos (alimenta `transaction_items`).

## Problem
El autocomplete actual inserta texto; persisten variantes sucias, sin cantidades ni precios ligados, y `transaction_items` sigue sin usarse.

## Scope (authorized, user-approved 2026-09-20)
- `ProductPicker.tsx` controlado: search + lista + steppers + crear-al-vuelo + nota colapsable
- Wiring en QuickCreditModal (reemplaza textarea + autocomplete anterior)
- Botón `Usar S/ X` que copia la suma al monto (NO autocompleta; el operador decide)
- Persistencia: transaction_items + syncQueue + notes derivado (backward compat reportes/WhatsApp)
- Tests Strict TDD + visual verify
- Out: QuickPaymentModal, precios automáticos al monto, edición de catálogo

## Constraints
- Strict TDD ENABLED (sdd-init; runner `npx vitest run`) — RED primero
- Tokens GEMINI (popover = GlassSelect, pills ámbar); sheet keyboard-aware ya existe
- Artefactos en inglés; strings ES neutro profesional; sin nuevas dependencias

## Checklist
- [x] T1. ProductPicker + tests (route: delegated writer, TDD) — DONE 2026-09-20: 8 tests, RED→GREEN evidenciado
- [x] T2. Wiring modal + persistencia items + botón Usar total + tests (route: mismo writer) — DONE: suite 294/294 + tsc limpio; `buildDerivedNotes` exportado; items sin productId sobreviven como texto
- [x] T3. Visual verify Playwright (route: inline, parent) — DONE 2026-09-20 con env placeholder: buscar→renglón con steppers, Usar S/ 4.50→9.00, confirmar S/ 9.00, saldo 44.50, detalle "2× Arroz costeño" en recibo. Aprobado
## Design change 2026-09-20 (user proposal, accepted)
Manual total → **total vinculado**: el monto sigue la suma de líneas por defecto (cero tipeo en el caso común); el primer tipeo manual rompe el vínculo (el operador toma propiedad: descuentos/redondeos); `Usar S/ X` re-vincula. Si monto ≠ suma al confirmar, se muestra diferencia informativa (no bloqueante). Search lleva icono lupa (mismo patrón S/ del monto).
- [x] T5. Total vinculado + icono lupa (route: delegated writer + parent fix, TDD) — DONE 2026-09-20: vínculo verificado en vivo (auto 4.5); lupa existía pero invisible por trazos 1.3px → w-5 + stroke 2.5 + slate-600, verificado DOM 20px. Suite 301+9 parcial verde (full pendiente pre-commit)
- [ ] T4. Commit (solo con autorización explícita)

## Acceptance criteria
- Buscar agrega renglón; re-tap incrementa qty; steppers y quitar funcionan
- Crear inexistente con precio persiste producto y renglón
- Confirmar guarda items + notes derivado; reportes/WhatsApp intactos
- Usar total copia suma; CTA/preview/balance siguen mandando
- Suite verde + tsc + capturas

## Applicable checks
`npx vitest run` + `npx tsc --noEmit` + Playwright 390px

## Progress
- 2026-09-20: feature creado y aprobado. T1+T2 pendientes (delegar).

## Next step
Delegar T1+T2 a un writer con este documento.
