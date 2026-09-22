'use client';

import { forwardRef, type ReactNode } from 'react';
import type { Group } from 'three';
import type { MeshStandardMaterial } from 'three';
import { metricBox } from '@/lib/metricBox';

export type HingeSide = 'left' | 'right';

interface HingedPanelProps {
  side: HingeSide;
  width: number;
  height: number;
  thickness: number;
  /** Local position of the HINGE LINE, not the panel centre. */
  hingePosition: [number, number, number];
  material: MeshStandardMaterial;
  /** Rendered in panel space, origin at the panel centre. */
  children?: ReactNode;
  /** Picks this panel's patch of the steel texture (see `metricBox`). */
  seed?: number;
}

/**
 * A door that rotates about its hinge, not its middle.
 *
 * The returned `<group>` sits *on the hinge line*; the panel mesh is offset by
 * half its width inside it. Animating `group.rotation.y` therefore swings the
 * door exactly the way a real one does. This is the single place that
 * knowledge lives — outer doors, locker doors and (later) GLB-backed doors all
 * go through it, so no caller ever has to think about pivot offsets.
 *
 * Sign convention, derived from rotating a point at local (d, 0, 0) about Y:
 * a left-hinged panel extends toward +x and opens with a NEGATIVE angle, a
 * right-hinged panel extends toward -x and opens with a POSITIVE angle. Use
 * `openRotationFor()` rather than rediscovering this at each call site.
 */
export const HingedPanel = forwardRef<Group, HingedPanelProps>(
  function HingedPanel(
    { side, width, height, thickness, hingePosition, material, children, seed = 0 },
    ref,
  ) {
    const direction = side === 'left' ? 1 : -1;
    const panelCentreX = (direction * width) / 2;

    return (
      <group ref={ref} position={hingePosition}>
        <mesh
          geometry={metricBox(width, height, thickness, seed)}
          material={material}
          position={[panelCentreX, 0, 0]}
          castShadow
          receiveShadow
        />
        <group position={[panelCentreX, 0, 0]}>{children}</group>
      </group>
    );
  },
);

/** Signed Y rotation that opens a panel hinged on `side` by `angle` radians. */
export function openRotationFor(side: HingeSide, angle: number): number {
  return side === 'left' ? -angle : angle;
}
