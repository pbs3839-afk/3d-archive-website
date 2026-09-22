'use client';

import { CABINET, FLOOR_Y } from '@/lib/cabinetLayout';
import { metricBox, metricPlane } from '@/lib/metricBox';
import { useCabinetMaterials } from './materials';
import { noRaycast } from './noRaycast';

/**
 * The space around the cabinet.
 *
 * Deliberately minimal — a concrete floor to catch the shadow and a plastered
 * back wall to stop the fog reading as empty sky. Every mesh opts out of
 * raycasting so a click on the background can never be mistaken for a click
 * on the cabinet, which is what makes "clickable" legible in a scene this dark.
 */
export function Room() {
  const materials = useCabinetMaterials();

  return (
    <group>
      <mesh
        geometry={metricPlane(46, 46)}
        material={materials.floor}
        raycast={noRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
      />

      <mesh
        geometry={metricBox(30, 12, 0.3)}
        material={materials.wall}
        raycast={noRaycast}
        position={[0, 4, -CABINET.depth / 2 - 1.4]}
        receiveShadow
      />
    </group>
  );
}
