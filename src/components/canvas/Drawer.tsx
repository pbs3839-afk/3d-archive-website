'use client';

import { forwardRef, type ReactNode } from 'react';
import type { Group, MeshStandardMaterial } from 'three';
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DRAWER_FACE_THICKNESS,
  DRAWER_INSET,
  DRAWER_TUB_DEPTH,
  DRAWER_WALL,
} from '@/lib/cabinetLayout';
import { metricBox } from '@/lib/metricBox';
import { noRaycast } from './noRaycast';

export const DRAWER_BOX = {
  width: CELL_WIDTH - DRAWER_INSET * 2,
  height: CELL_HEIGHT - DRAWER_INSET * 2,
  depth: DRAWER_TUB_DEPTH,
} as const;

/** Section of the hanging-folder rails that run along the tub's top edges. */
const RAIL = 0.012;

interface DrawerProps {
  faceMaterial: MeshStandardMaterial;
  bodyMaterial: MeshStandardMaterial;
  /** Bright metal for the hanging rails. Defaults to the body material. */
  railMaterial?: MeshStandardMaterial;
  /** Rendered in face space, origin at the centre of the drawer front. */
  children?: ReactNode;
  /** Sealed drawers skip the tub entirely — nothing will ever open them. */
  hollow?: boolean;
  /** Picks this drawer's patch of the steel texture; same-sized drawers need different ones. */
  seed?: number;
}

/**
 * A filing-cabinet drawer: a front face plus an open-topped tub behind it,
 * with the two rails a hanging file drawer carries along its top edges.
 *
 * The returned `<group>` is the thing that moves. Pulling a drawer is a
 * translation along local +Z and nothing else, which is why this needs no
 * pivot gymnastics the way the outer doors do — but it is kept as its own
 * component for the same reason `HingedPanel` is: exactly one place knows how
 * a compartment is built, so the GLB swap has one contract to satisfy.
 *
 * The tub's origin sits on the CLOSED face plane, so `position.z === 0` is
 * shut and `position.z === DRAWER_TRAVEL` is fully out.
 */
export const Drawer = forwardRef<Group, DrawerProps>(function Drawer(
  { faceMaterial, bodyMaterial, railMaterial, children, hollow = false, seed = 0 },
  ref,
) {
  const { width, height, depth } = DRAWER_BOX;
  const inner = width - DRAWER_WALL * 2;
  const rail = railMaterial ?? bodyMaterial;
  const railX = inner / 2 - RAIL / 2;
  const railY = height / 2 - RAIL / 2;

  return (
    <group ref={ref}>
      {/* front face — the only part visible when shut */}
      <mesh
        geometry={metricBox(width, height, DRAWER_FACE_THICKNESS, seed)}
        material={faceMaterial}
        position={[0, 0, -DRAWER_FACE_THICKNESS / 2]}
        castShadow
        receiveShadow
      />

      {!hollow && (
        <group position={[0, 0, -DRAWER_FACE_THICKNESS - depth / 2]}>
          {/* floor */}
          <mesh
            geometry={metricBox(inner, DRAWER_WALL, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[0, -height / 2 + DRAWER_WALL / 2, 0]}
            receiveShadow
          />
          {/* sides */}
          <mesh
            geometry={metricBox(DRAWER_WALL, height, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[-width / 2 + DRAWER_WALL / 2, 0, 0]}
          />
          <mesh
            geometry={metricBox(DRAWER_WALL, height, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[width / 2 - DRAWER_WALL / 2, 0, 0]}
          />
          {/* back */}
          <mesh
            geometry={metricBox(inner, height, DRAWER_WALL, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[0, 0, -depth / 2 + DRAWER_WALL / 2]}
          />
          {/* Hanging rails. The folders' hooks ride on these, which is what
              lets each card's tab stand above the drawer front while its body
              hangs inside the tub. */}
          <mesh
            geometry={metricBox(RAIL, RAIL, depth, seed)}
            material={rail}
            raycast={noRaycast}
            position={[-railX, railY, 0]}
          />
          <mesh
            geometry={metricBox(RAIL, RAIL, depth, seed)}
            material={rail}
            raycast={noRaycast}
            position={[railX, railY, 0]}
          />
        </group>
      )}

      <group position={[0, 0, 0.001]}>{children}</group>
    </group>
  );
});
