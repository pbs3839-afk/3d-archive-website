'use client';

import { useEffect, useMemo } from 'react';
import { MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { UNIT_PLANE } from './materials';
import { noRaycast } from './noRaycast';
import { metricBox } from '@/lib/metricBox';
import { stencilTexture } from '@/lib/stencilTexture';

interface HandleProps {
  /** Which way the free edge of the door lies: +1 for right, -1 for left. */
  edgeDirection: 1 | -1;
  doorWidth: number;
  doorThickness: number;
  material: MeshStandardMaterial;
  scale?: number;
}

/**
 * The little latch handle near a door's free edge — the detail that makes the
 * reference photo read as a service locker rather than a plain box.
 */
export function DoorHandle({
  edgeDirection,
  doorWidth,
  doorThickness,
  material,
  scale = 1,
}: HandleProps) {
  const x = edgeDirection * (doorWidth / 2 - 0.055 * scale);
  const z = doorThickness / 2;

  return (
    <group position={[x, 0, z]}>
      {/* recessed backing plate */}
      <mesh
        geometry={metricBox(0.036 * scale, 0.11 * scale, 0.008)}
        material={material}
        position={[0, 0, 0.004]}
      />
      {/* lever */}
      <mesh
        geometry={metricBox(0.016 * scale, 0.062 * scale, 0.017)}
        material={material}
        position={[0, -0.012 * scale, 0.016]}
      />
    </group>
  );
}

interface DrawerPullProps {
  /** Text for the index card in the pull's label window. */
  code: string;
  faceThickness: number;
  bodyMaterial: MeshStandardMaterial;
  metalMaterial: MeshStandardMaterial;
  dim?: boolean;
  /** Lights the status lamp. Only drawers that hold dossiers get one. */
  live?: boolean;
}

/**
 * The status lamp on a live drawer.
 *
 * Material tone alone was not carrying which drawers can be opened: under a
 * single raking key light, a lit sealed drawer and a shadowed live one read
 * the same. A lamp is self-lit, so it survives any lighting angle — and it is
 * the affordance a real indexed cabinet would actually have.
 */
const lampMaterial = new MeshBasicMaterial({
  color: '#ffb257',
  toneMapped: false,
});

/**
 * The pull on the front of a drawer: a recessed plate with a card window and a
 * grab bar under it — the detail that makes a box read unmistakably as a
 * filing cabinet drawer rather than a cupboard door.
 */
export function DrawerPull({
  code,
  faceThickness,
  bodyMaterial,
  metalMaterial,
  dim = false,
  live = false,
}: DrawerPullProps) {
  const z = faceThickness / 2;

  return (
    <group position={[0, -0.02, z]}>
      {live && (
        <mesh
          geometry={metricBox(0.012, 0.012, 0.008)}
          material={lampMaterial}
          raycast={noRaycast}
          position={[-0.118, 0.019, 0.016]}
        />
      )}
      {/* recessed backing plate */}
      <mesh
        geometry={metricBox(0.27, 0.105, 0.012)}
        material={metalMaterial}
        position={[0, 0, 0.006]}
      />
      {/* card window, sunk into the plate */}
      <mesh
        geometry={metricBox(0.235, 0.05, 0.006)}
        material={bodyMaterial}
        position={[0, 0.019, 0.013]}
      />
      <CodePlate
        text={code}
        doorThickness={0}
        y={0.019}
        z={0.018}
        width={0.215}
        height={0.044}
        fontSize={76}
        color={dim ? '#6b6656' : '#e4dec6'}
        opacity={dim ? 0.55 : 0.95}
      />
      {/* grab bar */}
      <mesh
        geometry={metricBox(0.2, 0.019, 0.019)}
        material={metalMaterial}
        position={[0, -0.028, 0.021]}
        castShadow
      />
    </group>
  );
}

interface CodePlateProps {
  text: string;
  doorThickness: number;
  width?: number;
  height?: number;
  y?: number;
  /** Explicit local Z; defaults to just proud of `doorThickness`. */
  z?: number;
  color?: string;
  opacity?: number;
  fontSize?: number;
}

/**
 * Stencilled identification plate. Drawn to a small canvas texture rather than
 * an `<Html>` overlay — see `lib/stencilTexture.ts` for why.
 */
export function CodePlate({
  text,
  doorThickness,
  width = 0.21,
  height = 0.088,
  y = 0.1,
  z,
  color = '#d8d2bd',
  opacity = 0.92,
  fontSize = 46,
}: CodePlateProps) {
  const material = useMemo(() => {
    const map = stencilTexture(text, { color, fontSize });
    return new MeshBasicMaterial({
      map,
      transparent: true,
      opacity,
      toneMapped: false,
      depthWrite: false,
    });
  }, [text, color, opacity, fontSize]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={UNIT_PLANE}
      material={material}
      raycast={noRaycast}
      position={[0, y, z ?? doorThickness / 2 + 0.002]}
      scale={[width, height, 1]}
    />
  );
}
