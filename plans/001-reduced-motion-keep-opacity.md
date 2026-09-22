# 001 — Stop the global reduced-motion rule from deleting every transition

- **Status**: DONE — applied and verified 2026-09-21
- **Commit**: n/a — this project is not a git repository (checked 2026-09-21 with `git rev-parse --short HEAD`, which reported "not a git repository"). If git is initialised later, re-stamp this plan.
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 4 files, ~40 lines

## Problem

`prefers-reduced-motion: reduce` currently collapses **every** transition in the
app to 0.01ms, including pure opacity and colour fades that carry no movement
at all:

```css
/* src/app/globals.css:82 — current */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
```

Reduced motion is supposed to mean fewer and gentler animations, **not zero**.
Transitions that aid comprehension should survive; only position changes should
be dropped. With the rule as written, a reduced-motion user gets:

- `src/components/ui/FileDetailPanel.module.css:20` — the dossier panel
  teleports into place instead of fading, so a full-height panel appears out of
  nowhere with no indication of where it came from.
- `src/components/ui/ArchiveHud.module.css:90` / `:179` / `:220` — the
  compartment index, the BACK button and the hint line pop in and out.
- `src/components/ui/Intro.module.css:10` — the title card cuts instead of
  cross-fading to the scene.

The rule is also redundant for the two animations that already handle reduced
motion properly and are therefore the exemplars for this fix
(`src/components/ui/Intro.module.css:77` and
`src/components/ui/ArchiveExperience.module.css:107`).

Note that the JS side is already correct and must not be changed:
`src/lib/choreography.ts:79` shortens the 3D timelines to 35% and
`src/components/canvas/CameraController.tsx:55` disables pointer parallax.

## Target

Delete the blanket `*` rule. Keep `scroll-behavior: auto`. Replace it with
per-component reduced-motion blocks that **drop the transform and keep the
opacity/colour**.

```css
/* target — src/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

```css
/* target — src/components/ui/FileDetailPanel.module.css, appended */
@media (prefers-reduced-motion: reduce) {
  .root {
    transition: opacity 200ms var(--ease-out);
    transform: none;
  }

  .root[data-open='true'] {
    transform: none;
  }
}
```

```css
/* target — src/components/ui/ArchiveHud.module.css, appended */
@media (prefers-reduced-motion: reduce) {
  .index,
  .back {
    transition: opacity 200ms var(--ease-out);
    transform: none;
  }

  .index[data-visible='true'],
  .back[data-visible='true'] {
    transform: none;
  }
}
```

```css
/* target — src/components/ui/Intro.module.css, added to the existing
   reduced-motion block at line 77 */
@media (prefers-reduced-motion: reduce) {
  .word {
    animation: none;
  }

  .frame {
    transition: none;
    transform: none;
  }

  .root[data-visible='false'] .frame {
    transform: none;
  }
}
```

`--ease-out` is introduced by plan 002. If 002 has not run yet, use the literal
`cubic-bezier(0.23, 1, 0.32, 1)` in its place and leave a `TODO: swap for
--ease-out` comment.

## Repo conventions to follow

- Component motion lives in that component's own CSS module; `globals.css` holds
  only `:root` tokens and the `html`/`body`/`button` reset.
- Reduced-motion blocks go at the **bottom** of the module file. Exemplar:
  `src/components/ui/Intro.module.css:161-165`, which disables the infinite
  `descend` animation and pins the dot to its rest position instead of hiding
  it.
- Class names inside modules are camelCase and referenced via `styles.x`.

## Steps

1. `src/app/globals.css:82-91` — delete the `*, *::before, *::after` block.
   Keep the `html { scroll-behavior: auto; }` rule and the surrounding media
   query.
2. `src/components/ui/FileDetailPanel.module.css` — append the reduced-motion
   block from Target. It must come after the existing
   `@media (pointer: coarse)` block at line 238 so it wins on specificity ties.
3. `src/components/ui/ArchiveHud.module.css` — append the reduced-motion block
   from Target, after the existing `@media (pointer: coarse)` block at line 294.
4. `src/components/ui/Intro.module.css:77-81` — extend the existing
   reduced-motion block with the `.frame` rules from Target. Leave the existing
   `.word { animation: none; }` rule in place.

## Boundaries

- Do NOT touch `src/lib/choreography.ts` or
  `src/components/canvas/CameraController.tsx` — the JS reduced-motion handling
  is already correct.
- Do NOT touch any file under `src/components/canvas/` at all.
- Do NOT change markup or class names — CSS only.
- Do NOT add dependencies.
- If a step does not match the code you find, STOP and report instead of
  improvising.

## Verification

- **Mechanical**: from the project root,
  `npx tsc --noEmit` (expect no output) and `npm run build`
  (expect "✓ Compiled successfully"). CSS modules are not typechecked, so the
  build passing only proves nothing else broke.
- **Feel check**: `npm run dev`, open http://localhost:3100, then in Chrome
  DevTools ▸ Rendering ▸ "Emulate CSS prefers-reduced-motion" set to
  `reduce`, and confirm:
  - Scroll to the vault, open a drawer, click a card: the dossier panel
    **fades in over ~200ms without sliding**. Before this change it appeared
    instantly; a hard cut is the bug, a slide is the over-correction.
  - The compartment index and the BACK button fade rather than pop.
  - The 3D choreography still runs (drawer still slides, cards still deploy) —
    just faster. Reduced motion must not freeze the scene.
  - Set the emulation back to "no-preference" and confirm the panel slides in
    from the right again.
- **Done when**: with reduced motion on, no DOM element changes `transform`
  during a stage change, and every element that changes `opacity` still
  animates it.
