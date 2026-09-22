'use client';

import { useMemo } from 'react';
import {
  CABINET,
  GRID_HEIGHT,
  GRID_WIDTH,
  PLINTH_HEIGHT,
} from '@/lib/cabinetLayout';
import { metricBox } from '@/lib/metricBox';
import { LockerGrid } from './LockerGrid';
import { useCabinetMaterials } from './materials';
import { noRaycast } from './noRaycast';
import { OuterDoors } from './OuterDoors';

const OPENING_MARGIN = 0.02;

/**
 * Stand-in cabinet built from primitives, so every interaction can be finished
 * and tuned before the Blender GLB exists.
 *
 * Structure mirrors the reference photo and the planned GLB hierarchy exactly:
 *
 *   Cabinet_Body        carcass + plinth + front lip frame
 *   OuterDoor_Left/Right  full-height ribbed doors
 *   Locker_01..05       the interactive grid cells
 *
 * The carcass is a SHELL, not a solid box: five panels plus a front lip that
 * frames the grid opening. A solid body would occlude the lockers sitting
 * inside it.
 */
export function ProceduralCabinet() {
  const materials = useCabinetMaterials();

  const { width: W, height: H, depth: D, shell: S } = CABINET;

  const lip = useMemo(() => {
    const innerHalfW = GRID_WIDTH / 2 + OPENING_MARGIN;
    const innerHalfH = GRID_HEIGHT / 2 + OPENING_MARGIN;
    const outerHalfW = W / 2;
    const outerHalfH = H / 2;
    return {
      z: D / 2 - 0.02,
      horizontal: {
        thickness: outerHalfH - innerHalfH,
        centre: (innerHalfH + outerHalfH) / 2,
      },
      vertical: {
        thickness: outerHalfW - innerHalfW,
        centre: (innerHalfW + outerHalfW) / 2,
        height: innerHalfH * 2,
      },
    };
  }, [W, H, D]);

  return (
    <group name="SecurityCabinet">
      <group name="Cabinet_Body">
        {/* carcass */}
        <mesh
          geometry={metricBox(W, H, S, 1)}
          material={materials.bodyDark}
          raycast={noRaycast}
          position={[0, 0, -D / 2 + S / 2]}
          receiveShadow
        />
        <mesh
          geometry={metricBox(S, H, D, 2)}
          material={materials.body}
          raycast={noRaycast}
          position={[-W / 2 + S / 2, 0, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(S, H, D, 3)}
          material={materials.body}
          raycast={noRaycast}
          position={[W / 2 - S / 2, 0, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(W, S, D, 4)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, H / 2 - S / 2, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(W, S, D, 5)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, -H / 2 + S / 2, 0]}
          receiveShadow
        />

        {/* front lip framing the grid opening */}
        <mesh
          geometry={metricBox(W, lip.horizontal.thickness, 0.04, 6)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, lip.horizontal.centre, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(W, lip.horizontal.thickness, 0.04, 7)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, -lip.horizontal.centre, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(lip.vertical.thickness, lip.vertical.height, 0.04, 8)}
          material={materials.body}
          raycast={noRaycast}
          position={[-lip.vertical.centre, 0, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(lip.vertical.thickness, lip.vertical.height, 0.04, 9)}
          material={materials.body}
          raycast={noRaycast}
          position={[lip.vertical.centre, 0, lip.z]}
          castShadow
        />

        {/* cornice + plinth — the overhangs that give the silhouette weight */}
        <mesh
          geometry={metricBox(W + 0.07, 0.05, D + 0.06, 10)}
          material={materials.bodyDark}
          raycast={noRaycast}
          position={[0, H / 2 + 0.025, 0.01]}
          castShadow
        />
        <mesh
          geometry={metricBox(W - 0.05, PLINTH_HEIGHT, D - 0.03, 11)}
          material={materials.plinth}
          raycast={noRaycast}
          position={[0, -H / 2 - PLINTH_HEIGHT / 2, 0]}
          castShadow
          receiveShadow
        />
      </group>

      <LockerGrid />
      <OuterDoors />
    </group>
  );
}
