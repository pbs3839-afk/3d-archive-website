/**
 * The one switch that swaps the stand-in cabinet for the Blender model.
 *
 * Leave it unset and the procedural cabinet renders. Set it and `SecurityCabinet`
 * loads the GLB instead:
 *
 *   1. export the model to public/models/security-cabinet.glb
 *   2. add to .env.local:
 *        NEXT_PUBLIC_CABINET_MODEL=/models/security-cabinet.glb
 *
 * Env var rather than a hard-coded path so the stand-in stays available as a
 * fallback while the model is being iterated on.
 */
export const CABINET_MODEL_URL: string | null =
  process.env.NEXT_PUBLIC_CABINET_MODEL || null;

/**
 * Where the Draco decoder lives, for GLBs exported with Draco compression.
 * drei's `useGLTF` reads this when a second argument is passed; see
 * GltfCabinet if compression is enabled later.
 */
export const DRACO_DECODER_PATH = '/draco/';
