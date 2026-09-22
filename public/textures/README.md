# Textures

Scanned PBR sets from [Poly Haven](https://polyhaven.com), licensed **CC0**
(public domain — no attribution required). 1K JPG, downloaded 2026-09-22.

| Folder | Asset page | Used for |
| --- | --- | --- |
| `green_metal_rust` | https://polyhaven.com/a/green_metal_rust | Cabinet steel (grain, relief, roughness) |
| `concrete_floor_worn_001` | https://polyhaven.com/a/concrete_floor_worn_001 | Floor |
| `plastered_wall_04` | https://polyhaven.com/a/plastered_wall_04 | Back wall |

Maps per set: `_diff_` (colour, sRGB), `_nor_gl_` (OpenGL normal), `_rough_`
(roughness, read from the green channel). Loaded by `src/lib/textures.ts`.
The colour is desaturated and multiplied into each material's tint in
`src/lib/wornMaterial.ts`, so the originals' hues never show.
