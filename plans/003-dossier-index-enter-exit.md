# 003 — Give the dossier index the same fade the compartment index has

- **Status**: DONE — applied and verified 2026-09-21
- **Commit**: n/a — this project is not a git repository (checked 2026-09-21 with `git rev-parse --short HEAD`, which reported "not a git repository"). If git is initialised later, re-stamp this plan.
- **Severity**: MEDIUM
- **Category**: Missed opportunity / Cohesion
- **Estimated scope**: 1 file, ~15 lines

## Problem

The HUD has two sibling index panels that share the `.index` class and the same
grid cell. They behave differently for no reason the user can perceive.

The **compartment index** is always mounted and only toggles an attribute, so
CSS transitions it:

```tsx
/* src/components/ui/ArchiveHud.tsx:54 — current, correct */
<nav
  className={styles.index}
  data-visible={stage === 'vault'}
  aria-label="Compartment index"
  inert={stage !== 'vault' ? true : undefined}
>
```

The **dossier index** is conditionally mounted with `data-visible` hard-coded to
`"true"`:

```tsx
/* src/components/ui/ArchiveHud.tsx:86 — current, the bug */
{stage === 'locker' && locker && (
  <nav className={styles.index} data-visible="true" aria-label="Dossier index">
```

The `.index` rule defines the transition and the hidden state:

```css
/* src/components/ui/ArchiveHud.module.css:87 — current */
  opacity: 0;
  transform: translateX(-12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.index[data-visible='true'] {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}
```

Because the element enters the DOM already matching `[data-visible='true']`,
there is no previous style to transition from — it paints at `opacity: 1`
immediately. So the dossier index **pops in** the instant the drawer opens, and
**vanishes** the instant you press Escape, while the panel six pixels above it
fades. That inconsistency is exactly the kind of jarring state change a
transition exists to prevent.

It also drops `inert`, so while the exit is instant today, any fix that keeps
the node mounted must add `inert` or the hidden panel stays keyboard-reachable.

## Target

Mount the dossier index unconditionally and drive it with the attribute, mirroring
its sibling exactly:

```tsx
/* target — src/components/ui/ArchiveHud.tsx, replacing lines 86-110 */
<nav
  className={styles.index}
  data-visible={stage === 'locker' && Boolean(locker)}
  aria-label="Dossier index"
  inert={stage !== 'locker' || !locker ? true : undefined}
>
  <p className={styles.indexTitle}>DOSSIER INDEX</p>
  <ul className={styles.indexList}>
    {locker?.files.map((file, index) => (
      <li key={file.id}>
        <button
          type="button"
          className={styles.indexItem}
          data-hovered={hoveredFile === file.id}
          disabled={!isLockerOpen || isCameraMoving}
          onClick={() => selectFile(file.id)}
          onFocus={() => setHoveredFile(file.id)}
          onBlur={() => setHoveredFile(null)}
          onMouseEnter={() => setHoveredFile(file.id)}
          onMouseLeave={() => setHoveredFile(null)}
        >
          <span className={styles.indexCode}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.indexLabel}>{file.codename}</span>
        </button>
      </li>
    ))}
  </ul>
</nav>
```

Note `locker?.files.map(...)` — `locker` is `undefined` whenever no locker is
selected, and the node now renders in that state. The optional chain renders an
empty list, which is invisible anyway at `opacity: 0`.

Both panels occupy `grid-column: 1; grid-row: 2` (`ArchiveHud.module.css:83-85`)
and are mutually exclusive by stage, so keeping both mounted does not change the
layout.

## Repo conventions to follow

- Visibility is expressed as a `data-visible` boolean attribute consumed by CSS,
  never by conditional mounting. Exemplars in this same file:
  `src/components/ui/ArchiveHud.tsx:56` (compartment index),
  `src/components/ui/ArchiveHud.tsx:113` (`.back` button), and
  `src/components/ui/FileDetailPanel.tsx` which does the same for the panel.
- Anything hidden this way also gets `inert` so it leaves the tab order.
  Exemplar: `src/components/ui/ArchiveHud.tsx:58`.
- `inert` is written as `inert={condition ? true : undefined}` throughout, not
  `inert={condition}`.

## Steps

1. `src/components/ui/ArchiveHud.tsx:86-110` — replace the
   `{stage === 'locker' && locker && ( … )}` expression with the unconditional
   `<nav>` from Target. Delete the surrounding braces and the closing `)}`.
2. Confirm nothing else in the file referenced the conditional — `locker` is
   still used at line 51 for the status readout and must stay.

## Boundaries

- Do NOT modify `src/components/ui/ArchiveHud.module.css`. The existing
  `.index` transition is the mechanism this plan relies on; plan 002 retunes it
  and plan 001 adds its reduced-motion variant.
- Do NOT touch the compartment index `<nav>` at lines 54-84.
- Do NOT change any handler, class name, or the order of the two `<nav>`
  elements.
- Do NOT add dependencies.
- If lines 86-110 do not match the "current" excerpt, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` (no output — watch for a new error on
  `locker?.files`, which means the optional chain was dropped) and
  `npm run build` ("✓ Compiled successfully"). Then
  `npx next lint` (expect "No ESLint warnings or errors").
- **Feel check**: `npm run dev`, http://localhost:3100. Scroll to the vault.
  - Click a drawer. As the compartment index fades **out**, the dossier index
    should fade **in** over the same duration and slide the same 12px. Today the
    second one appears instantly — watch for the pop.
  - Press Escape. The dossier index should fade out rather than disappear.
  - In DevTools ▸ Animations at 10% speed, confirm the two panels cross-fade
    rather than one cutting.
  - Tab through the page while at stage `vault`: focus must **never** land on a
    DOSSIER INDEX button. If it does, the `inert` expression is wrong.
  - Open a drawer and Tab again: the dossier buttons must now be reachable and
    Enter must open that file.
- **Done when**: both `<nav>` elements are unconditionally mounted, both carry
  `data-visible` and `inert`, and neither pops.
