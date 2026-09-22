'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import {
  OUTER_DOOR_HEIGHT,
  OUTER_DOOR_THICKNESS,
  OUTER_DOOR_WIDTH,
  OUTER_DOOR_Z,
  CABINET,
} from '@/lib/cabinetLayout';
import { registerVaultDoor } from '@/lib/vaultRegistry';
import { useArchiveStore } from '@/store/archiveStore';
import { DoorHandle } from './DoorFurniture';
import { HingedPanel, type HingeSide } from './HingedPanel';
import { metricBox } from '@/lib/metricBox';
import { useCabinetMaterials } from './materials';
import { noRaycast } from './noRaycast';

const RIB_COUNT_BY_TIER = { high: 9, medium: 7, low: 5 } as const;

function RibbedFace({ ribCount, seed }: { ribCount: number; seed: number }) {
  const materials = useCabinetMaterials();

  // The reference cabinet's outer doors are corrugated sheet. Raised vertical
  // ribs read the same way under a raking key light and cost one shared
  // material plus a handful of small boxes.
  const ribs = useMemo(() => {
    const usable = OUTER_DOOR_WIDTH - 0.24;
    const step = usable / (ribCount - 1);
    return Array.from({ length: ribCount }, (_, i) => -usable / 2 + i * step);
  }, [ribCount]);

  const railY = OUTER_DOOR_HEIGHT / 2 - 0.1;

  return (
    <group position={[0, 0, OUTER_DOOR_THICKNESS / 2 + 0.008]}>
      {ribs.map((x, i) => (
        <mesh
          key={x}
          geometry={metricBox(0.052, OUTER_DOOR_HEIGHT - 0.26, 0.016, seed + i)}
          material={materials.rib}
          raycast={noRaycast}
          position={[x, 0, 0]}
          castShadow
        />
      ))}
      <mesh
        geometry={metricBox(OUTER_DOOR_WIDTH - 0.12, 0.05, 0.018, seed + 50)}
        material={materials.rib}
        raycast={noRaycast}
        position={[0, railY, 0]}
      />
      <mesh
        geometry={metricBox(OUTER_DOOR_WIDTH - 0.12, 0.05, 0.018, seed + 51)}
        material={materials.rib}
        raycast={noRaycast}
        position={[0, -railY, 0]}
      />
    </group>
  );
}

function OuterDoor({ side }: { side: HingeSide }) {
  const materials = useCabinetMaterials();
  const quality = useArchiveStore((s) => s.quality);
  const ref = useRef<Group>(null);

  useEffect(() => {
    registerVaultDoor(side, ref.current);
    return () => registerVaultDoor(side, null);
  }, [side]);

  const hingeX = side === 'left' ? -CABINET.width / 2 : CABINET.width / 2;
  const edgeDirection = side === 'left' ? 1 : -1;

  return (
    <HingedPanel
      ref={ref}
      side={side}
      width={OUTER_DOOR_WIDTH}
      height={OUTER_DOOR_HEIGHT}
      thickness={OUTER_DOOR_THICKNESS}
      hingePosition={[hingeX, 0, OUTER_DOOR_Z]}
      material={materials.outerDoor}
      seed={side === 'left' ? 101 : 102}
    >
      <RibbedFace ribCount={RIB_COUNT_BY_TIER[quality]} seed={side === 'left' ? 201 : 301} />
      <DoorHandle
        edgeDirection={edgeDirection}
        doorWidth={OUTER_DOOR_WIDTH}
        doorThickness={OUTER_DOOR_THICKNESS}
        material={materials.handle}
        scale={2.6}
      />
    </HingedPanel>
  );
}

/** The pair of full-height doors that seal the whole cabinet. */
export function OuterDoors() {
  return (
    <group>
      <OuterDoor side="left" />
      <OuterDoor side="right" />
    </group>
  );
}
