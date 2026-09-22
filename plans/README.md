# Animation plans

Produced by the `improve-animations` audit on 2026-09-21 against the
classified-archive site (Next.js 15 / React 19 / @react-three/fiber / GSAP /
Zustand).

All three plans have been **applied and verified** (2026-09-21). They are kept
as the record of what changed and why. Each is self-contained: an executor with
no other context could re-run it against a fresh checkout.

## Plans

| # | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-reduced-motion-keep-opacity.md) | Stop the global reduced-motion rule from deleting every transition | HIGH | Accessibility | DONE |
| [002](002-motion-tokens-and-hover-gating.md) | Introduce motion tokens and gate hover behind a fine pointer | HIGH | Cohesion & tokens | DONE |
| [003](003-dossier-index-enter-exit.md) | Give the dossier index the same fade the compartment index has | MEDIUM | Missed opportunity | DONE |

Applied in the order 002 → 001 → 003, because 002 defines the `--ease-*` and
`--dur-*` tokens that 001 references.

## Verification record

Checked against the CSS the browser actually loaded at `localhost:3100`, not
just the source, because CSS modules are not typechecked and a passing build
only proves nothing crashed.

| Claim | Evidence |
| --- | --- |
| Tokens reach the browser | `getComputedStyle(document.documentElement)` returns `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and `--dur-panel: 420ms` |
| Panel uses them | Served CSS contains `transform var(--dur-panel) var(--ease-drawer), opacity var(--dur-fast) var(--ease-out)` |
| No hand-written curves left | `grep -rn "cubic-bezier" src/components/ui --include=*.css` returns only the two documented exemptions (`Intro.module.css:59` `wordIn`, `:128` `descend`) |
| Every `:hover` is gated | Parsed the served stylesheet into top-level blocks; zero `:hover` selectors sit outside `@media (hover: hover) and (pointer: fine)`. Three such blocks exist. |
| Global kill switch gone | Served CSS no longer matches `*, *::before, *::after { transition-duration: 0.01ms }` |
| Reduced motion keeps fades | Six `@media (prefers-reduced-motion: reduce)` blocks; the HUD and panel blocks set `transition: opacity …` **and** `transform: none` rather than zeroing duration |
| Dossier index fades | At stage `vault` it is in the DOM with `data-visible="false"` + `inert`; after opening a drawer it reads `data-visible="true"`, `opacity: 1`, `transform: matrix(1,0,0,1,0,0)` |
| Nothing else broke | `npx tsc --noEmit` clean, `npx next lint` clean, `npm run build` "✓ Compiled successfully" |

**Not verified:** the subjective feel — whether 420ms *reads* better than 620ms,
whether the two index panels cross-fade cleanly at 10% playback, and the
reduced-motion behaviour under DevTools emulation. The browser pane in the
session that applied these kept returning stale frames, so screenshots could not
be trusted. Someone should watch the drawer open and the panel slide once with
their own eyes.

## Findings audited but not planned

Recorded so a later pass does not re-litigate them. Ordered by leverage.

| Severity | Location | Finding |
| --- | --- | --- |
| MEDIUM | `src/components/ui/ArchiveExperience.module.css:80` | Full-viewport `mix-blend-mode: overlay` grain layer animates forever over a live WebGL canvas, ungated by the quality tier. Gate to `quality !== 'low'`. |
| MEDIUM | `src/lib/choreography.ts:152` | Interior lamp fades out with `ease: 'power1.in'`; ease-in delays the moment the user is watching. Target `power2.out`. |
| LOW | `src/components/canvas/FileTray.tsx:80` | Card stagger is 110ms against a 30–80ms budget; four cards take 1.18s to fan. Target 70ms. |
| LOW | `src/components/canvas/FileTray.tsx:112`, `:113`, `:141`, `:142` | `ease: 'none'` on card opacity. Linear is for constant motion only. Target `power1.out`. |

### Missed opportunities not planned

- Compartment-index rows have no press feedback. They are the only non-3D route
  into a locker. `transform: scale(0.98)` on `:active`, 140ms — the
  `--dur-press` token added by plan 002 exists for exactly this and is currently
  unused.
- The status readout hard-swaps text between stages (`STANDBY` → `DESCENDING` →
  `VAULT OPEN`). A ~150ms opacity crossfade would stop it reading as a glitch.
- SEALED drawers never respond to the pointer, so a click that lands on one is
  indistinguishable from a click the page missed. A ~80ms dim would confirm the
  hit.

## Verified as already correct

Do not "fix" these:

- **Interruptibility.** `begin()` in `src/lib/choreography.ts:59` kills the
  active timeline and the replacement tweens from current values, so clicking a
  second drawer mid-open retargets rather than restarting.
- **Frame-rate-independent hover.** `src/components/canvas/Locker.tsx:97` and
  `src/components/canvas/ArchiveFile.tsx` lerp with
  `1 - Math.exp(-delta * k)` rather than a fixed step.
- **`gsap.ticker.lagSmoothing(0)`** in `src/lib/gsapConfig.ts` is deliberate and
  documented; re-enabling smoothing stretches gated sequences on slow devices.
- **Pointer parallax** is disabled for touch and reduced motion
  (`src/components/canvas/CameraController.tsx:55`).
