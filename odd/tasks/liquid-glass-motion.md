# Feature: liquid-glass-motion

**Branch:** `fix/liquid-glass-motion`
**TDD mode:** strict (`vitest run`) — source: `sdd-init/creditambarpwa`
**RDD:** on (decided by global)
**Delivery strategy:** `single-pr` (forecast well under the 400 authored-line budget)

## Objective

Make the TabBar dock and its Speed Dial actually animate, and stop the menu scrim
from blinding the dock's `backdrop-filter`.

## Problem

Two independent defects make the bottom navigation read as static and muddy:

1. **All enter/exit animation utilities are dead CSS.** `animate-in`, `fade-in`,
   `zoom-in-*`, `slide-in-from-*` and `fill-mode-both` are used across the app, but
   `tailwindcss-animate` is not installed nor registered in `tailwind.config.js`
   (`plugins: []`). Tailwind core has no `animate-in` utility, so these classes compile
   to nothing. The Speed Dial orbs, modals, toasts and the pending badge all pop in
   with no motion.

2. **The Speed Dial scrim violates the project's own stacking rule.**
   `GEMINI.md` §4 forbids any fixed overlay or blur mask between the scrolling content
   and the glass dock, because it blinds the dock's `backdrop-filter` from sampling the
   real content. The scrim is `z-40 backdrop-blur-[12px]` while the dock is `z-50` when
   open, so the dock samples a darkened, pre-blurred layer instead of the page.

## Why

The Liquid Glass design system only reads as "liquid" when the glass refracts live,
sharp content behind it and when motion carries spatial continuity. Both are currently
absent, so the visual language does not land despite elaborate class names in the markup.

## Scope (authorized)

- `tailwind.config.js` — register the animation plugin.
- `package.json` / `package-lock.json` — add `tailwindcss-animate` as a devDependency.
- `src/components/navigation/TabBar.tsx` — split the crowned orb's arc offset from its
  enter animation; make the scrim rule-§4 compliant.

## Explicitly OUT of scope (do not touch)

- The Speed Dial micro-capsule blur (`backdrop-blur-[16px]`) and halo opacity — that is
  the P2 glass-composition work, and `TabBar.test.tsx:127` pins the current classes.
- Exit/close animation, stagger remapping, the sliding active-tab well, micro-feedback,
  light-vector unification, active-tab contrast, `motion-reduce`, perf hygiene, and
  `role="menu"` keyboard navigation — these are P3/P4/P5 follow-ups.
- Uncommitted work already present in the tree (`ProductPicker`, `QuickPaymentModal`,
  `HomePage.tsx`, `AppLayout.tsx`, `.atl/*`, `.agents/skills/*`).

## Constraints

- `TabBar.test.tsx:153` locates the scrim via `.bg-slate-950\/35` — that class must survive.
- `TabBar.test.tsx:126-127` pins the capsule classes — capsules must not change.
- `npm run build` runs `tsc` over `include: ["src"]`, so config-level tests live in
  `tests/` (outside `src`) to avoid `allowJs: false` import errors.

## Acceptance criteria

- A fresh Tailwind compile of `animate-in`, `fade-in`, `zoom-in-50`,
  `slide-in-from-bottom-8` and `fill-mode-both` emits real CSS.
- The crowned center orb's vertical arc offset and its enter animation live on
  different DOM nodes, so neither cancels the other.
- The scrim carries no `backdrop-blur`, and its bottom band is masked out so the dock
  keeps sampling undimmed content.
- Full suite (`vitest run`) stays green relative to the 303-test baseline.
- `tsc` still passes.

## Tasks

| ID | Task | Route | Trigger evidence | Status |
|----|------|-------|------------------|--------|
| W1 | Register `tailwindcss-animate` so enter/exit utilities compile | inline | 2 mechanical files (dep install + 3-line config); no unresolved design | pending |
| W2 | Separate crowned-orb arc offset from enter animation | inline | 1 non-trivial file, fully mapped by prior reads | pending |
| W3 | Make scrim rule-§4 compliant (drop blur + mask dock band) | inline | 1 non-trivial file, same component | pending |

Route note: the three units touch two files total and are fully understood from the
exploration already performed, so the smallest useful topology is direct inline.
No mapping or writer delegation trigger fires.

## Progress

- Baseline established: `vitest run` → 39 files / 303 tests passing, 16.5s.
- Branch `fix/liquid-glass-motion` created from `main`.

## Verification evidence

_(filled per task as checks are observed)_

## Next step

W1 — write the failing compile test (RED).
