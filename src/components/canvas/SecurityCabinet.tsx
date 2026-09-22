'use client';

import { Suspense, lazy } from 'react';
import { CABINET_CENTER_Y } from '@/lib/cabinetLayout';
import { CABINET_MODEL_URL } from '@/lib/modelConfig';
import { ProceduralCabinet } from './ProceduralCabinet';

/**
 * Chooses the cabinet implementation and owns its placement in the world.
 *
 * Today `CABINET_MODEL_URL` is null and the procedural cabinet renders. Drop a
 * GLB into /public/models and set NEXT_PUBLIC_CABINET_MODEL and the GLB path
 * takes over — no other file changes, because both implementations publish
 * their door pivots through the same registries.
 *
 * The GLB branch is `lazy()` so three's GLTF/Draco loaders stay out of the
 * bundle entirely while no model is configured.
 */
const GltfCabinet = lazy(() =>
  import('./GltfCabinet').then((m) => ({ default: m.GltfCabinet })),
);

export function SecurityCabinet() {
  return (
    <group position={[0, CABINET_CENTER_Y, 0]}>
      {CABINET_MODEL_URL ? (
        <Suspense fallback={<ProceduralCabinet />}>
          <GltfCabinet url={CABINET_MODEL_URL} />
        </Suspense>
      ) : (
        <ProceduralCabinet />
      )}
    </group>
  );
}
