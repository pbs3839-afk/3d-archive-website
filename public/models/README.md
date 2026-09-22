# GLB drop-in

The site currently renders a **procedural stand-in cabinet** built from
primitives. Every interaction — camera, drawers, files, hover, keyboard — is
already finished against it. Replacing it with the Blender model is a config
change, not a code change.

## Swapping in the model

1. Export to `public/models/security-cabinet.glb`
2. Create `.env.local` in the project root:

   ```
   NEXT_PUBLIC_CABINET_MODEL=/models/security-cabinet.glb
   ```

3. Restart `npm run dev`.

`src/components/canvas/SecurityCabinet.tsx` then loads `GltfCabinet.tsx`
instead of `ProceduralCabinet.tsx`. Unset the variable to go back to the
stand-in at any time.

> `GltfCabinet.tsx` has not been run against a real file yet — there is no GLB
> to run it against. Expect to spend a little time on scale and pivot fixes the
> first time it loads.

## What the export must contain

Node names are how the app finds things. They must match exactly. Blender's
`.001` suffixes on **children** are handled (they are matched by prefix); on
the locker roots they are not.

```
SecurityCabinet
├── Cabinet_Body
├── OuterDoor_Left        full-height door, swings on a hinge
├── OuterDoor_Right       full-height door, swings on a hinge
├── Locker_01
│   └── Drawer            slides straight out toward the viewer
├── Locker_02
│   └── Drawer
├── Locker_03
│   └── Drawer
├── Locker_04
│   └── Drawer
└── Locker_05
    └── Drawer
```

Two different mechanisms, deliberately:

- the **outer doors** are hinged and are *rotated* about Y;
- the **drawers** are *translated* along their local +Z.

`Locker_01` … `Locker_05` must match the `id` values in
`src/data/archive.ts`. Lockers present in the data but missing from the GLB log
a warning. Include the ten sealed drawer fronts in the GLB as decorative geometry
to retain the full fifteen-cell cabinet. Only the procedural cabinet generates
those ten sealed cells automatically; the GLB branch renders the supplied model.

### Hard requirements

| Requirement | Why |
| --- | --- |
| **Each `OuterDoor_*` origin sits on its hinge line**, not the panel centre | The app rotates these objects directly about Y. A centred origin makes the door spin through its own frame. In Blender: 3D cursor on the hinge edge → `Object ▸ Set Origin ▸ Origin to 3D Cursor`. |
| **Left door opens toward −Y rotation, right door toward +Y** | Matches `openRotationFor()` in `HingedPanel.tsx`. Equivalently: the left door extends along +X from its hinge, the right along −X. |
| **Each `Drawer` is at `position = (0,0,0)` when shut**, and its local **+Z points out of the cabinet** | The open tween animates `drawer.position.z` from `0` to `DRAWER_TRAVEL` (0.44 m). Any other rest position makes the drawer jump on first open. |
| **A `Locker_*` root's origin sits on the closed drawer face**, local +Z facing out | The camera solves its stand-off along that axis, and `FileTray` aligns the card fan to it. |
| **Doors and drawers unrotated / unscaled when closed** | Open and close both animate to and from zero. Apply transforms on the meshes (`Ctrl+A ▸ All Transforms`) but **not** on the door pivots or drawer roots. |
| **Metres, +Y up** | Scale is assumed to be 1. |
| Cabinet roughly **3.2 m wide × 2.6 m tall × 0.6 m deep** | Camera framing, card size and fan spread are tuned to this. Other sizes work but need the constants in `src/lib/cabinetLayout.ts` retuned. |

### Optional

- `Interior_Light` inside a locker root — if present and it is a point light,
  the choreographer fades it up as the drawer opens. If it is absent that beat
  is simply skipped.
- Draco compression: see `DRACO_DECODER_PATH` in `src/lib/modelConfig.ts` and
  copy the decoder into `public/draco/`.

## Budget

Keep it under ~1.5 MB and ~80k triangles. Fifteen drawer fronts are on screen
at once; the stand-in runs at roughly 200 draw calls, which is a reasonable
ceiling to aim at. Bake the panel detail into a normal map rather than
modelling the ribs and lips as geometry.
