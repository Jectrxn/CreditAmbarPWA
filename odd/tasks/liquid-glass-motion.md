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
| W1 | Register `tailwindcss-animate` so enter/exit utilities compile | inline | 2 mechanical files (dep install + 3-line config); no unresolved design | done — `421150d` |
| W2 | Separate crowned-orb arc offset from enter animation | inline | 1 non-trivial file, fully mapped by prior reads | done |
| W3 | Make scrim rule-§4 compliant (drop blur + mask dock band) | inline | 1 non-trivial file, same component | done |

Route note: the three units touch two files total and are fully understood from the
exploration already performed, so the smallest useful topology is direct inline.
No mapping or writer delegation trigger fires.

## Progress

- Baseline established: `vitest run` → 39 files / 303 tests passing, 16.5s.
- Branch `fix/liquid-glass-motion` created from `main`.
- W1 done — plugin registered, commit `421150d`.
- W2 done — crowned orb arc offset moved to a wrapper; the button now carries only the
  enter animation. Behaviour note: activating the plugin in W1 is what made the
  `-translate-y-3` / `slide-in-from-bottom-10` collision live, so W2 repairs a regression
  that W1 exposes; the branch as a whole is coherent.
- W3 done — scrim is now dim-only, with its bottom band masked out. Autoprefixer already
  emits `-webkit-mask-image`, so the hand-written prefix class was redundant and dropped.

## Verification evidence

| Check | Command | Result |
|-------|---------|--------|
| W1 RED | `npx vitest run tests/tailwind-animation-config.test.ts` | 1 failed (`expected '' to contain 'animate-in'`), 1 passed (core utilities compile → harness valid) |
| W1 GREEN | same | 2 passed |
| W1 real compile | `npx tailwindcss -i ./src/index.css` over app content | `animate-in`, `zoom-in-50/95`, `slide-in-from-bottom-8/12`, `slide-in-from-top-3`, `fill-mode-both`, `fade-in` all emit; `@keyframes enter` + `@keyframes exit` present |
| W2 RED | `npx vitest run src/components/navigation/TabBar.test.tsx` | 1 failed (`expected true to be false`) |
| W2 GREEN | same | 12 passed |
| W3 RED | `npx vitest run src/components/navigation/TabBar.test.tsx` | 1 failed (`expected '...backdrop-blur-[12px]...' not to contain 'backdrop-blur'`) |
| W3 GREEN | same | 13 passed |
| Full suite (final) | `npm test` | 40 files / 307 tests passing (baseline 303 + 4 new) |
| Types | `npx tsc --noEmit` | exit 0 |
| Browser — animation live | `getComputedStyle` on the 3 orbs | `animationName: "enter"`, `0.3s`, `fillMode: "both"`, delays `0 / 0.075s / 0.15s` |
| Browser — arc preserved | `getComputedStyle` on the centre orb wrapper | `transform: matrix(1,0,0,1,0,-12)` (-12px = `-translate-y-3`); the button itself settled to identity, so the two transforms no longer collide |
| Browser — scrim | `getComputedStyle` on the scrim | `backdropFilter: "none"`, `maskImage: linear-gradient(to top, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 140px, rgb(0,0,0) 230px)` |
| Browser — dock intact | `getComputedStyle` on `nav` | `blur(18px) saturate(1.9)` still applied |
| Browser — hit-testing | `elementFromPoint` | dimmed band → scrim (dismisses); undimmed band → page content / dock (taps pass through, dock and `×` stay interactive) |
| Browser — console | Playwright console log | 0 errors, 0 warnings |
| Visual | `.playwright-mcp/w3-closed.png`, `.playwright-mcp/w3-open.png` | crowned arc renders, dock stays warm and refractive instead of muddied |

Screenshots are written to the untracked `.playwright-mcp/` directory and are not committed.

## Known trades / follow-ups

- **Dim horizon:** removing the blur and masking the dock band leaves a soft gradient edge
  where the dim fades in (~230px from the viewport bottom). It is deliberate — it is the
  price of keeping the glass live — but it is visible and is a candidate for a softer
  multi-stop mask or a dock-anchored radial scrim later.
- `delay-*` mapping is confirmed: `tailwindcss-animate@1.0.7` does drive `animation-delay`
  from Tailwind's `delay-*`, so the existing stagger works as written.
- P2/P3/P4/P5 items from the review remain open and untouched.

## RDD assessment

Boundary: branch point `3502043` (no prior acknowledged review on this branch).

| Attempt | Result |
|---------|--------|
| `assess --base-ref 3502043 --committed-only` | `risk: high`, reason `unassessable` — failed closed because untracked files needed an explicit declaration |
| `assess ... --untracked-scope=exclude --expected-untracked-inventory=sha256:7745ec7f…` | `risk: medium`, reason `configuration_change` (`package-lock.json`); `changed_lines: 322`; **`review_due: false`, `review_due_reason: under_budget`** |

Untracked exclusion was the honest declaration: every untracked path is either
pre-existing work unrelated to this change (`ProductPicker.*`, `odd/tasks/product-picker.md`,
`skills-lock.json`, `.agents/skills/`) or a Playwright verification artifact. All 7 files of
this change are committed.

Per the ODD protocol, `under_budget` means the boundary stays pending until a later commit
reaches the ~400 authored-line delivery budget. No further commits are planned, so the slice
closes under budget and no review fires. Recorded, not skipped.

## Next step

Branch is complete, green, and self-verified with real-browser evidence. Native authority
found no review due. Remaining decisions belong to the user: request a review anyway,
push, and open a PR. No further code changes authorized.
