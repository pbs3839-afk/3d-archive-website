# 002 — Introduce motion tokens and gate hover behind a fine pointer

- **Status**: DONE — applied and verified 2026-09-21
- **Commit**: n/a — this project is not a git repository (checked 2026-09-21 with `git rev-parse --short HEAD`, which reported "not a git repository"). If git is initialised later, re-stamp this plan.
- **Severity**: HIGH
- **Category**: Cohesion & tokens (+ Accessibility)
- **Estimated scope**: 5 files, ~60 lines

## Problem

**A. No motion tokens.** The repo tokenises colour and spacing in
`src/app/globals.css:9-24` but nothing about motion. Every curve and duration is
hand-typed at the call site. There are 14 of them across 5 files, using **three
different hand-written cubic-beziers** and **ten bare `ease` keywords**:

```css
/* src/app/globals.css:75 */            transition: transform 0.2s ease;
/* src/components/ui/ArchiveHud.module.css:64 */   transition: background-color 0.4s ease, box-shadow 0.4s ease;
/* src/components/ui/ArchiveHud.module.css:90 */   transition: opacity 0.5s ease, transform 0.5s ease;
/* src/components/ui/ArchiveHud.module.css:122 */  transition: background-color 0.2s ease, color 0.2s ease;
/* src/components/ui/ArchiveHud.module.css:179 */  transition: opacity 0.35s ease, transform 0.35s ease, color 0.2s ease,
                                                     border-color 0.2s ease;
/* src/components/ui/ArchiveHud.module.css:220 */  transition: opacity 0.4s ease;
/* src/components/ui/FileDetailPanel.module.css:20 */  transition: transform 0.62s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
/* src/components/ui/FileDetailPanel.module.css:169 */ transition: color 0.2s ease;
/* src/components/ui/FileDetailPanel.module.css:198 */ transition: background-color 0.2s ease;
/* src/components/ui/Intro.module.css:10 */    transition: opacity 0.7s ease;
/* src/components/ui/Intro.module.css:21 */    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
/* src/components/ui/Intro.module.css:59 */    animation: wordIn 1.15s cubic-bezier(0.16, 1, 0.3, 1) backwards;
/* src/components/ui/Intro.module.css:128 */   animation: descend 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
/* src/components/ui/Intro.module.css:152 */   transition: color 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
```

The bare `ease` keyword is too weak for deliberate motion, and nine distinct
durations (0.2 / 0.25 / 0.35 / 0.4 / 0.5 / 0.62 / 0.7 / 0.9 / 1.15s) with no
scale means every new component invents its own timing.

**B. The dossier panel is over budget.** 620ms
(`src/components/ui/FileDetailPanel.module.css:20`) against a 200–500ms budget
for drawers and modals.

**C. Hover is not gated.** Touch devices fire a synthetic hover on tap and it
sticks until the next tap elsewhere. The repo already gates *touch targets*
behind `@media (pointer: coarse)` (`src/components/ui/ArchiveHud.module.css:294`)
but the hover rules themselves are ungated:

```css
/* src/components/ui/ArchiveHud.module.css:126 — current */
.indexItem:hover:not(:disabled),
.indexItem[data-hovered='true']:not(:disabled) {
  background: rgba(255, 178, 87, 0.09);
  color: var(--ink);
}
```

```css
/* src/components/ui/FileDetailPanel.module.css:180 — current */
.nav:hover:not(:disabled) {
  color: var(--amber);
}
```

```css
/* src/components/ui/FileDetailPanel.module.css:201 — current */
.close:hover {
  background: rgba(190, 196, 182, 0.08);
}
```

```css
/* src/components/ui/Intro.module.css:156 — current */
.skip:hover {
  color: var(--ink);
  border-color: var(--line-strong);
  background: rgba(190, 196, 182, 0.06);
}
```

Note the `[data-hovered='true']` selector in the first one: that is driven from
3D hover state in `src/components/ui/ArchiveHud.tsx` and **must keep working on
touch**. Only the `:hover` half gets gated.

## Target

Add to the existing `:root` block in `src/app/globals.css` (after `--gutter`):

```css
  /* Motion. Curves are deliberately stronger than the CSS built-ins. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  --dur-press: 140ms;
  --dur-fast: 200ms;
  --dur-base: 320ms;
  --dur-panel: 420ms;
  --dur-title: 900ms;
```

Then replace every call site. Exact mapping, one line per site:

| File:line | Current | Target |
| --- | --- | --- |
| `globals.css:75` | `transform 0.2s ease` | `transform var(--dur-fast) var(--ease-out)` |
| `ArchiveHud.module.css:64` | `background-color 0.4s ease, box-shadow 0.4s ease` | `background-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)` |
| `ArchiveHud.module.css:90` | `opacity 0.5s ease, transform 0.5s ease` | `opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)` |
| `ArchiveHud.module.css:122` | `background-color 0.2s ease, color 0.2s ease` | `background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)` |
| `ArchiveHud.module.css:179-180` | `opacity 0.35s ease, transform 0.35s ease, color 0.2s ease, border-color 0.2s ease` | `opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)` |
| `ArchiveHud.module.css:220` | `opacity 0.4s ease` | `opacity var(--dur-base) var(--ease-out)` |
| `FileDetailPanel.module.css:20` | `transform 0.62s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease` | `transform var(--dur-panel) var(--ease-drawer), opacity var(--dur-fast) var(--ease-out)` |
| `FileDetailPanel.module.css:169` | `color 0.2s ease` | `color var(--dur-fast) var(--ease-out)` |
| `FileDetailPanel.module.css:198` | `background-color 0.2s ease` | `background-color var(--dur-fast) var(--ease-out)` |
| `Intro.module.css:10` | `opacity 0.7s ease` | `opacity var(--dur-title) var(--ease-out)` |
| `Intro.module.css:21` | `transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)` | `transform var(--dur-title) var(--ease-out)` |
| `Intro.module.css:152` | `color 0.25s ease, border-color 0.25s ease, background-color 0.25s ease` | `color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out)` |

**Leave these two alone** — they are looping/keyframe animations with curves
chosen for their specific shape, not UI transitions:

- `Intro.module.css:59` — `wordIn` uses `cubic-bezier(0.16, 1, 0.3, 1)`, a
  longer-tailed curve for the title reveal.
- `Intro.module.css:128` — `descend` uses `cubic-bezier(0.65, 0, 0.35, 1)`, an
  in-out curve for a looping indicator, which is correct for constant motion.

Hover gating — wrap each of the four hover rules:

```css
/* target — src/components/ui/ArchiveHud.module.css */
.indexItem[data-hovered='true']:not(:disabled) {
  background: rgba(255, 178, 87, 0.09);
  color: var(--ink);
}

@media (hover: hover) and (pointer: fine) {
  .indexItem:hover:not(:disabled) {
    background: rgba(255, 178, 87, 0.09);
    color: var(--ink);
  }
}
```

```css
/* target — src/components/ui/FileDetailPanel.module.css */
@media (hover: hover) and (pointer: fine) {
  .nav:hover:not(:disabled) {
    color: var(--amber);
  }

  .close:hover {
    background: rgba(190, 196, 182, 0.08);
  }
}
```

```css
/* target — src/components/ui/Intro.module.css */
@media (hover: hover) and (pointer: fine) {
  .skip:hover {
    color: var(--ink);
    border-color: var(--line-strong);
    background: rgba(190, 196, 182, 0.06);
  }
}
```

## Repo conventions to follow

- All design tokens live in the single `:root` block in
  `src/app/globals.css:9-24`. Exemplar: `--hud-pad: clamp(14px, 2.6vw, 32px);`
  — tokens are kebab-case, grouped by purpose with a blank line between groups.
- Component CSS modules reference tokens with `var(--name)` and never redeclare
  them. Exemplar: `src/components/ui/ArchiveHud.module.css:110` uses
  `color: var(--ink-faint)`.
- Media-query blocks go at the bottom of a module, after the base rules.
  Exemplar: `src/components/ui/ArchiveHud.module.css:262` (`max-width: 767px`)
  followed by `:294` (`pointer: coarse`).

## Steps

1. `src/app/globals.css` — add the motion token group to `:root`, after the
   `--gutter` line at :23.
2. `src/app/globals.css:75` — swap per the mapping table.
3. `src/components/ui/ArchiveHud.module.css` — swap lines 64, 90, 122, 179-180
   and 220 per the mapping table.
4. `src/components/ui/ArchiveHud.module.css:126-129` — split the combined
   selector as shown in Target: keep `[data-hovered='true']` ungated, move the
   `:hover` variant into a new `@media (hover: hover) and (pointer: fine)` block
   appended at the end of the file.
5. `src/components/ui/FileDetailPanel.module.css` — swap lines 20, 169, 198 per
   the mapping table, then move the `.nav:hover` (:180) and `.close:hover`
   (:201) rules into a `@media (hover: hover) and (pointer: fine)` block
   appended at the end of the file.
6. `src/components/ui/Intro.module.css` — swap lines 10, 21, 152 per the mapping
   table, then move `.skip:hover` (:156) into a
   `@media (hover: hover) and (pointer: fine)` block appended at the end of the
   file.

## Boundaries

- Do NOT touch anything under `src/components/canvas/` or `src/lib/` — the GSAP
  easings there (`power3.out`, `back.out(1.25)`, etc.) are a separate system and
  are covered by other findings.
- Do NOT change `Intro.module.css:59` or `:128` (see Target).
- Do NOT change any colour, size, layout or markup — motion properties and the
  hover media wrapper only.
- Do NOT rename existing tokens or add dependencies.
- If a line does not match the "Current" column, STOP and report instead of
  improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (no output) and `npm run build`
  ("✓ Compiled successfully"). Then
  `grep -rn "cubic-bezier\|[0-9]s ease" src/components/ui --include=*.css` should
  return **only** `Intro.module.css:59` and `Intro.module.css:128`.
- **Feel check**: `npm run dev`, http://localhost:3100.
  - Open a drawer, click a card. The dossier panel should arrive noticeably
    quicker than before (420ms vs 620ms) and still decelerate smoothly rather
    than stopping dead. In DevTools ▸ Animations, set speed to 10% and confirm
    it never overshoots past its final position.
  - Hover a compartment-index row: the amber wash still appears.
  - In DevTools ▸ Device Toolbar pick iPhone (touch emulation), tap an index
    row, then tap the background. The amber wash must **not** remain stuck on
    the tapped row.
  - Still in touch emulation, hover a 3D drawer via the keyboard (Tab to an
    index row): `[data-hovered]` styling must still apply — gating hover must
    not have broken the 3D→HUD hover link.
- **Done when**: no hand-written duration or curve remains in
  `src/components/ui/*.module.css` except the two listed exemptions, and every
  `:hover` rule in those files sits inside a `(hover: hover)` query.
